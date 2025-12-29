export const colors = {
  // Backgrounds
  background: '#0F0F0F',
  backgroundSecondary: '#1A1A1A',
  backgroundTertiary: '#252525',

  // Primary accent - warm gradient
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',

  // Text
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#666666',

  // Recording states
  recording: '#EF4444',
  recordingGlow: 'rgba(239, 68, 68, 0.3)',

  // AI states
  aiListening: '#10B981',
  aiThinking: '#F59E0B',
  aiSpeaking: '#6366F1',

  // Message bubbles
  userBubble: '#6366F1',
  aiBubble: '#1F1F1F',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Borders & Dividers
  border: '#2A2A2A',
  divider: '#1F1F1F',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(255, 255, 255, 0.05)',
} as const;

export type ColorKeys = keyof typeof colors;
