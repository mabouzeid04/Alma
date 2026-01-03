import { 
  AudioModule,
  createAudioPlayer, 
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  type AudioPlayer,
  type AudioRecorder
} from 'expo-audio';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

let recorder: AudioRecorder | null = null;
let player: AudioPlayer | null = null;
let tempFileCounter = 0;
let meteringInterval: ReturnType<typeof setInterval> | null = null;
let meteringCallback: ((level: number) => void) | null = null;

export interface AudioRecordingResult {
  uri: string;
  duration: number;
}

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

    // Create recorder with high-quality settings
    const recordingOptions = {
      ...RecordingPresets.HIGH_QUALITY,
      numberOfChannels: 1, // Override to mono for voice recording
    };
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
    // Stop any currently playing audio
    if (player) {
      player.release();
      player = null;
    }

    // Setup audio mode for playback
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    let audioUri = uri;

    // Handle base64 data URIs by writing to a temp file
    if (uri.startsWith('data:')) {
      console.log('Converting base64 audio to file...');
      const base64Data = uri.split(',')[1];
      const tempFileName = `temp_audio_${tempFileCounter++}.mp3`;

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
    player = createAudioPlayer({ uri: audioUri });
    
    // Wait for playback to complete
    return new Promise((resolve) => {
      player!.play();
      
      // Poll playback status by checking the playing property
      const statusInterval = setInterval(() => {
        if (!player) {
          clearInterval(statusInterval);
          resolve();
          return;
        }
        
        // Check if player has finished (no longer playing and has duration)
        if (!player.playing && player.currentTime > 0) {
          console.log('Audio playback finished');
          clearInterval(statusInterval);
          resolve();
        }
      }, 100);
      
      // Set timeout to avoid infinite waiting
      setTimeout(() => {
        if (statusInterval) {
          clearInterval(statusInterval);
        }
        resolve();
      }, 60000); // 60 second max
    });
  } catch (error) {
    console.error('Failed to play audio:', error);
  }
}

export async function stopPlayback(): Promise<void> {
  if (player) {
    player.release();
    player = null;
  }
}

export function isRecording(): boolean {
  return recorder !== null;
}
