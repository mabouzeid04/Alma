/**
 * Live API Session - Google Gemini bidirectional voice
 *
 * Wraps one WebSocket (BidiGenerateContent) for the lifetime of a single
 * conversation. Replaces the 3-call REST voice pipeline (STT -> LLM -> TTS)
 * with one streaming session: audio in, audio out, system prompt sent once.
 *
 * Async memory/analysis work (synthesis, embeddings, patterns) stays on REST.
 * See docs/live-api-refactor.md.
 */

import { LiveSessionCallbacks } from '../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const LIVE_VOICE_MODEL =
  process.env.EXPO_PUBLIC_LIVE_VOICE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
const LIVE_VOICE_NAME = process.env.EXPO_PUBLIC_GEMINI_TTS_VOICE || 'Kore';

const WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const INPUT_MIME = 'audio/pcm;rate=16000';
const SETUP_TIMEOUT_MS = 15000;
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Reads a text or Blob WebSocket frame into a JS string. The Live API sends
 * JSON; some platforms deliver it as a Blob rather than a string.
 */
function frameToText(data: unknown): Promise<string> {
  if (typeof data === 'string') {
    return Promise.resolve(data);
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error || new Error('Failed to read WebSocket frame'));
      reader.readAsText(data);
    });
  }
  return Promise.resolve('');
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private callbacks: LiveSessionCallbacks = {};
  private systemPrompt = '';
  private resumptionHandle: string | null = null;
  private reconnectAttempts = 0;
  private ready = false;
  private closedByUser = false;
  private setupResolve: (() => void) | null = null;
  private setupReject: ((error: Error) => void) | null = null;
  private setupTimer: ReturnType<typeof setTimeout> | null = null;

  get isConnected(): boolean {
    return this.ready && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Opens the session and resolves once the server confirms setup. The system
   * prompt (personal knowledge + memories + context) is sent once here and
   * reused for every turn in the conversation.
   */
  async connect(systemPrompt: string, callbacks: LiveSessionCallbacks): Promise<void> {
    if (!GEMINI_API_KEY) {
      throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY — Live API unavailable');
    }
    this.systemPrompt = systemPrompt;
    this.callbacks = callbacks;
    this.closedByUser = false;
    this.reconnectAttempts = 0;
    this.resumptionHandle = null;
    await this.openSocket();
  }

  /** Sends a full PCM clip as one turn (Phase 1: batched, not streamed). */
  sendAudioTurn(pcmBase64: string): void {
    if (!this.isConnected) {
      this.callbacks.onError?.(new Error('Live session not connected'));
      return;
    }
    this.rawSend({
      realtimeInput: { audio: { data: pcmBase64, mimeType: INPUT_MIME } },
    });
    this.rawSend({ realtimeInput: { audioStreamEnd: true } });
  }

  /** Sends a text turn — used to trigger the model's opening greeting. */
  sendTextTurn(text: string): void {
    if (!this.isConnected) {
      this.callbacks.onError?.(new Error('Live session not connected'));
      return;
    }
    this.rawSend({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    });
  }

  close(): void {
    this.closedByUser = true;
    this.clearSetupTimer();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.ready = false;
  }

  // --- internals ---------------------------------------------------------

  private openSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.setupResolve = resolve;
      this.setupReject = reject;
      this.ready = false;

      let ws: WebSocket;
      try {
        ws = new WebSocket(`${WS_BASE}?key=${GEMINI_API_KEY}`);
      } catch (error) {
        this.failSetup(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      this.ws = ws;

      this.setupTimer = setTimeout(() => {
        if (!this.ready) {
          this.failSetup(new Error('Live API setup timed out'));
        }
      }, SETUP_TIMEOUT_MS);

      // Event params are typed `any`: the global WebSocket resolves to the DOM
      // lib type, but at runtime React Native delivers its own event shapes.
      ws.onopen = () => this.sendSetup();
      ws.onmessage = (event: any) => {
        void this.handleFrame(event?.data);
      };
      ws.onerror = (event: any) => {
        const error = new Error(event?.message || 'Live API WebSocket error');
        if (!this.ready) {
          this.failSetup(error);
        } else {
          this.callbacks.onError?.(error);
        }
      };
      ws.onclose = (event: any) => {
        this.handleClose(event?.reason || '');
      };
    });
  }

  private sendSetup(): void {
    this.rawSend({
      setup: {
        model: `models/${LIVE_VOICE_MODEL}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE_NAME } },
          },
        },
        systemInstruction: { parts: [{ text: this.systemPrompt }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
      },
    });
  }

  private async handleFrame(data: unknown): Promise<void> {
    let text: string;
    try {
      text = await frameToText(data);
    } catch {
      return;
    }
    if (!text) return;

    let message: any;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    this.routeMessage(message);
  }

  private routeMessage(message: any): void {
    // Cost monitoring — token usage can accompany any server message.
    if (message.usageMetadata?.totalTokenCount) {
      console.log('Live API tokens this turn:', message.usageMetadata.totalTokenCount);
    }

    if (message.setupComplete !== undefined) {
      this.ready = true;
      this.reconnectAttempts = 0;
      this.clearSetupTimer();
      const resolve = this.setupResolve;
      this.setupResolve = null;
      this.setupReject = null;
      resolve?.();
      this.callbacks.onReady?.();
      return;
    }

    if (message.serverContent) {
      const content = message.serverContent;
      if (content.inputTranscription?.text) {
        this.callbacks.onInputTranscript?.(content.inputTranscription.text);
      }
      if (content.outputTranscription?.text) {
        this.callbacks.onOutputTranscript?.(content.outputTranscription.text);
      }
      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (part?.inlineData?.data) {
            this.callbacks.onAudioChunk?.(part.inlineData.data);
          }
        }
      }
      if (content.interrupted) {
        this.callbacks.onInterrupted?.();
      }
      if (content.turnComplete) {
        this.callbacks.onTurnComplete?.();
      }
      return;
    }

    if (message.sessionResumptionUpdate) {
      const update = message.sessionResumptionUpdate;
      if (update.resumable && update.newHandle) {
        this.resumptionHandle = update.newHandle;
      }
      return;
    }

    if (message.goAway) {
      // Server is about to close; onclose will trigger a resumed reconnect.
      console.warn('Live API goAway:', JSON.stringify(message.goAway));
    }
  }

  private handleClose(reason: string): void {
    this.ready = false;
    this.clearSetupTimer();

    if (this.closedByUser) {
      this.callbacks.onClose?.(reason);
      return;
    }

    // Closed before setup completed — fail the connect() promise.
    if (this.setupReject) {
      this.failSetup(new Error(`Live API closed before setup: ${reason}`));
      return;
    }

    // Unexpected mid-conversation drop — reconnect with the resumption handle.
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && this.resumptionHandle) {
      this.reconnectAttempts += 1;
      console.warn(
        `Live API dropped, reconnecting (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
      );
      this.openSocket().catch((error) => {
        this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      });
      return;
    }

    this.callbacks.onError?.(new Error(`Live API connection lost: ${reason}`));
    this.callbacks.onClose?.(reason);
  }

  private failSetup(error: Error): void {
    this.clearSetupTimer();
    const reject = this.setupReject;
    this.setupResolve = null;
    this.setupReject = null;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.ready = false;
    if (reject) {
      reject(error);
    } else {
      this.callbacks.onError?.(error);
    }
  }

  private clearSetupTimer(): void {
    if (this.setupTimer) {
      clearTimeout(this.setupTimer);
      this.setupTimer = null;
    }
  }

  private rawSend(payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}
