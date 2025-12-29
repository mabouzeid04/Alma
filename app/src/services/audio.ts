import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let recording: Audio.Recording | null = null;
let sound: Audio.Sound | null = null;

export interface AudioRecordingResult {
  uri: string;
  duration: number;
}

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export async function startRecording(): Promise<boolean> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.warn('Audio permission not granted');
      return false;
    }

    await setupAudioMode();

    // Stop any existing recording
    if (recording) {
      await stopRecording();
    }

    const { recording: newRecording } = await Audio.Recording.createAsync(
      {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      },
      undefined,
      100 // Status update interval in ms
    );

    recording = newRecording;
    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    return false;
  }
}

export async function stopRecording(): Promise<AudioRecordingResult | null> {
  if (!recording) {
    return null;
  }

  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();
    recording = null;

    // Reset audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    if (!uri) return null;

    return {
      uri,
      duration: status.durationMillis ? status.durationMillis / 1000 : 0,
    };
  } catch (error) {
    console.error('Failed to stop recording:', error);
    recording = null;
    return null;
  }
}

export async function pauseRecording(): Promise<void> {
  if (recording) {
    await recording.pauseAsync();
  }
}

export async function resumeRecording(): Promise<void> {
  if (recording) {
    await recording.startAsync();
  }
}

export async function getRecordingStatus(): Promise<Audio.RecordingStatus | null> {
  if (!recording) return null;
  return await recording.getStatusAsync();
}

export async function playAudio(uri: string): Promise<void> {
  try {
    if (sound) {
      await sound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );
    sound = newSound;
  } catch (error) {
    console.error('Failed to play audio:', error);
  }
}

export async function stopPlayback(): Promise<void> {
  if (sound) {
    await sound.stopAsync();
    await sound.unloadAsync();
    sound = null;
  }
}

export function isRecording(): boolean {
  return recording !== null;
}
