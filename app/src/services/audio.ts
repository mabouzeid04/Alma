import {
  AudioModule,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  RecordingPresets,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
  type RecordingOptions
} from 'expo-audio';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

let recorder: AudioRecorder | null = null;
let player: AudioPlayer | null = null;
let tempFileCounter = 0;
let meteringInterval: ReturnType<typeof setInterval> | null = null;
let meteringCallback: ((level: number) => void) | null = null;

// True only between actual play-start and play-end, so callers can ask whether
// audio is *audibly* playing — not just whether a player object happens to exist.
let isCurrentlyPlaying = false;
// Monotonic id incremented on every new playback / teardown. Listeners from a
// torn-down player carry their own captured id and bail out if it's stale, so
// they can't resolve a newer playback promise.
let currentPlaybackId = 0;

export interface AudioRecordingResult {
  uri: string;
  duration: number;
}

// When the Live API is enabled the recorder must produce raw 16-bit PCM at
// 16kHz mono (Live API does not accept AAC). iOS records this directly as a
// WAV via LINEARPCM; Android's MediaRecorder cannot emit raw PCM, so the
// Android path here is best-effort pending the device spike in
// docs/live-api-refactor.md.
const USE_LIVE_API = process.env.EXPO_PUBLIC_USE_LIVE_API === 'true';

const PCM_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    outputFormat: 'lpcm',
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    extension: '.wav',
    sampleRate: 16000,
    numberOfChannels: 1,
  },
} as unknown as RecordingOptions;

export async function requestPermissions(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  return granted;
}

export async function setupAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });
}

export async function startRecording(onMeteringUpdate?: (level: number) => void): Promise<boolean> {
  try {
    // Belt-and-suspenders: deactivate any leftover playback session before
    // switching the audio category to PlayAndRecord. If a prior playback
    // path didn't clean up (or a future caller introduces a new one), this
    // prevents the silent-mic regression where the recorder starts but
    // captures no audio.
    try {
      await setIsAudioActiveAsync(false);
    } catch {
      // ignore — no active session is fine
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.warn('Audio permission not granted');
      return false;
    }

    await setupAudioMode();

    // Stop any existing recording
    if (recorder) {
      await stopRecording();
    }

    // Store the metering callback
    meteringCallback = onMeteringUpdate || null;

    // Live API needs raw PCM; the REST pipeline uses the AAC preset.
    const recordingOptions: RecordingOptions = USE_LIVE_API
      ? PCM_RECORDING_OPTIONS
      : ({
          ...RecordingPresets.HIGH_QUALITY,
          numberOfChannels: 1, // Override to mono for voice recording
        } as RecordingOptions);
    recorder = new AudioModule.AudioRecorder(recordingOptions);

    // Prepare and start recording
    await recorder.prepareToRecordAsync();
    await recorder.record();

    // Start polling for metering if callback provided
    if (meteringCallback) {
      meteringInterval = setInterval(() => {
        if (recorder) {
          const status = recorder.getStatus();
          if (status.isRecording) {
            if (status.metering !== undefined) {
              // Use real metering data
              const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));
              meteringCallback!(normalizedLevel);
            } else {
              // Fallback: simulate audio levels with organic oscillation
              // This ensures the waveform always moves during recording
              const time = Date.now();
              const baseLevel = 0.3 + Math.sin(time / 300) * 0.2;
              const variation = Math.random() * 0.15;
              const simulatedLevel = baseLevel + variation;
              meteringCallback!(Math.max(0, Math.min(1, simulatedLevel)));
            }
          }
        }
      }, 100); // Poll every 100ms
    }

    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    return false;
  }
}

export async function stopRecording(): Promise<AudioRecordingResult | null> {
  if (!recorder) {
    return null;
  }

  try {
    // Clear metering interval
    if (meteringInterval) {
      clearInterval(meteringInterval);
      meteringInterval = null;
    }

    const statusBefore = recorder.getStatus();
    await recorder.stop();
    const statusAfter = recorder.getStatus();
    const uri = statusAfter.url;
    recorder = null;

    // Reset audio mode for playback
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    if (!uri) return null;

    return {
      uri,
      duration: statusBefore.durationMillis ? statusBefore.durationMillis / 1000 : 0,
    };
  } catch (error) {
    console.error('Failed to stop recording:', error);
    recorder = null;
    if (meteringInterval) {
      clearInterval(meteringInterval);
      meteringInterval = null;
    }
    return null;
  }
}

export async function pauseRecording(): Promise<void> {
  if (recorder) {
    await recorder.pause();
    // Pause metering polling
    if (meteringInterval) {
      clearInterval(meteringInterval);
      meteringInterval = null;
    }
  }
}

export async function resumeRecording(): Promise<void> {
  if (recorder) {
    await recorder.record();
    // Resume metering polling if callback exists
    if (meteringCallback) {
      meteringInterval = setInterval(() => {
        if (recorder) {
          const status = recorder.getStatus();
          if (status.isRecording) {
            if (status.metering !== undefined) {
              // Use real metering data
              const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));
              meteringCallback!(normalizedLevel);
            } else {
              // Fallback: simulate audio levels with organic oscillation
              const time = Date.now();
              const baseLevel = 0.3 + Math.sin(time / 300) * 0.2;
              const variation = Math.random() * 0.15;
              const simulatedLevel = baseLevel + variation;
              meteringCallback!(Math.max(0, Math.min(1, simulatedLevel)));
            }
          }
        }
      }, 100);
    }
  }
}

export async function getRecordingStatus(): Promise<any> {
  if (!recorder) return null;
  return recorder.getStatus();
}

export async function playAudio(uri: string): Promise<void> {
  try {
    // Tear down any previous player and invalidate its listener.
    if (player) {
      try {
        player.pause();
      } catch {
        // ignore — player may already be in a terminal state
      }
      player.release();
      player = null;
    }
    isCurrentlyPlaying = false;
    const myPlaybackId = ++currentPlaybackId;

    // iOS playback session lifecycle: activate BEFORE play() and deactivate
    // when playback finishes or is torn down (see finish() below and
    // stopPlayback). The activation matters because without it the very first
    // greeting queues against an inactive session and only drains once
    // startRecording flips categories — which is exactly when the mic is
    // opening. The deactivation matters because if the session stays active
    // in Playback category, the next startRecording can't switch to
    // PlayAndRecord cleanly and the recorder silently captures nothing.
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
    try {
      await setIsAudioActiveAsync(true);
    } catch (error) {
      console.warn('[audio] setIsAudioActiveAsync failed:', error);
    }

    let audioUri = uri;

    // Handle base64 data URIs by writing to a temp file
    if (uri.startsWith('data:')) {
      console.log('Converting base64 audio to file...');
      const base64Data = uri.split(',')[1];
      const mimeType = uri.split(';')[0].split(':')[1];
      const ext = mimeType === 'audio/wav' ? '.wav' : '.mp3';
      const tempFileName = `temp_audio_${tempFileCounter++}${ext}`;

      // Use new expo-file-system API
      const tempFile = new File(Paths.cache, tempFileName);

      // Convert base64 to Uint8Array and write
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      await tempFile.write(bytes);

      audioUri = tempFile.uri;
      console.log('Audio file written to:', audioUri);
    }

    console.log('Creating player from:', audioUri.substring(0, 50));
    // 100ms status updates so we see didJustFinish promptly (default is 500ms).
    player = createAudioPlayer({ uri: audioUri }, { updateInterval: 100 });

    return new Promise<void>((resolve) => {
      let resolved = false;
      let hasStartedPlaying = false;
      let subscription: { remove: () => void } | null = null;
      let hardTimeout: ReturnType<typeof setTimeout> | null = null;
      let startupTimeout: ReturnType<typeof setTimeout> | null = null;

      const finish = (reason: string) => {
        if (resolved) return;
        resolved = true;
        if (hardTimeout) clearTimeout(hardTimeout);
        if (startupTimeout) clearTimeout(startupTimeout);
        try {
          subscription?.remove();
        } catch {
          // ignore — listener may already be detached
        }
        // Only release if no newer playback has taken over this slot.
        if (currentPlaybackId === myPlaybackId && player) {
          try {
            player.pause();
          } catch {
            // ignore
          }
          player.release();
          player = null;
          isCurrentlyPlaying = false;
          // Deactivate the iOS audio session so the next startRecording can
          // cleanly switch to PlayAndRecord. Fire-and-forget — finish() is
          // synchronous and an already-inactive session is fine.
          setIsAudioActiveAsync(false).catch(() => {});
        }
        console.log(`Audio playback finished (${reason})`);
        resolve();
      };

      subscription = player!.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (currentPlaybackId !== myPlaybackId) return; // stale event
        if (status.playing && status.currentTime > 0) {
          hasStartedPlaying = true;
          isCurrentlyPlaying = true;
        }
        if (status.didJustFinish) {
          finish('didJustFinish');
        }
      });

      // Safety net so the promise can never hang forever.
      hardTimeout = setTimeout(() => finish('hard-timeout'), 60_000);

      // If we never observe playing=true within 2s, surface it loudly. This is
      // the exact regression signature of the original bug.
      startupTimeout = setTimeout(() => {
        if (!hasStartedPlaying) {
          console.warn('[audio] play() called but no playing=true status received within 2s');
        }
      }, 2_000);

      player!.play();
    });
  } catch (error) {
    console.error('Failed to play audio:', error);
  }
}

export async function stopPlayback(): Promise<void> {
  if (player) {
    // pause() before release() so the audio buffer is silenced immediately
    // rather than risking a final fragment after the SharedObject is torn down.
    try {
      player.pause();
    } catch {
      // ignore — player may already be in a terminal state
    }
    player.release();
    player = null;
  }
  isCurrentlyPlaying = false;
  // Invalidate any in-flight playbackStatusUpdate listener so it can't resolve
  // a promise that was meant for the player we just released.
  currentPlaybackId++;
  // Deactivate the iOS audio session so a follow-up startRecording can switch
  // cleanly from Playback to PlayAndRecord. Without this, the recorder
  // appears to start but captures no audio.
  try {
    await setIsAudioActiveAsync(false);
  } catch {
    // ignore — already inactive is fine
  }
}

export function isRecording(): boolean {
  return recorder !== null;
}

export function isPlaying(): boolean {
  return isCurrentlyPlaying;
}

// =============================================================================
// Live API audio helpers (raw PCM)
// =============================================================================

/**
 * Reads a recorded clip and returns base64-encoded raw 16-bit PCM, suitable
 * for the Live API. A WAV container (iOS LINEARPCM) has its header stripped;
 * anything else is returned untouched (the Live API will reject non-PCM).
 */
export async function getRecordingPcmBase64(uri: string): Promise<string> {
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  const binary = atob(base64);

  const isWav =
    binary.length > 12 &&
    binary.slice(0, 4) === 'RIFF' &&
    binary.slice(8, 12) === 'WAVE';

  if (isWav) {
    const dataOffset = findWavDataOffset(binary);
    if (dataOffset >= 0) {
      return btoa(binary.slice(dataOffset));
    }
  }

  console.warn(
    `Recording is not WAV/PCM (${binary.length} bytes) — Live API requires raw PCM`
  );
  return base64;
}

/** Finds the byte offset of a WAV file's PCM data, scanning chunk headers. */
function findWavDataOffset(binary: string): number {
  let offset = 12; // skip 'RIFF' + size + 'WAVE'
  while (offset + 8 <= binary.length) {
    const chunkId = binary.slice(offset, offset + 4);
    const chunkSize =
      binary.charCodeAt(offset + 4) |
      (binary.charCodeAt(offset + 5) << 8) |
      (binary.charCodeAt(offset + 6) << 16) |
      (binary.charCodeAt(offset + 7) << 24);
    if (chunkId === 'data') {
      return offset + 8;
    }
    offset += 8 + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }
  return -1;
}

/**
 * Plays a turn of Live API response audio. Chunks are raw 16-bit PCM (24kHz
 * mono); they are concatenated, wrapped in a WAV header, and played as one
 * clip. Resolves when playback finishes.
 */
export async function playPcmChunks(
  chunksBase64: string[],
  sampleRate = 24000
): Promise<void> {
  if (chunksBase64.length === 0) return;

  const buffers: Uint8Array[] = [];
  let totalLength = 0;
  for (const chunk of chunksBase64) {
    const bin = atob(chunk);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    buffers.push(bytes);
    totalLength += bytes.length;
  }

  const pcm = new Uint8Array(totalLength);
  let pos = 0;
  for (const buffer of buffers) {
    pcm.set(buffer, pos);
    pos += buffer.length;
  }

  const wavBase64 = pcmBytesToWavBase64(pcm, sampleRate);
  await playAudio(`data:audio/wav;base64,${wavBase64}`);
}

/** Wraps raw 16-bit mono PCM bytes in a WAV container and base64-encodes it. */
function pcmBytesToWavBase64(pcm: Uint8Array, sampleRate: number): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const bytes = new Uint8Array(buffer);
  bytes.set(pcm, 44);

  const CHUNK = 8192;
  let binaryStr = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binaryStr += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + CHUNK, bytes.length)))
    );
  }
  return btoa(binaryStr);
}
