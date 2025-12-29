import * as Haptics from 'expo-haptics';

export const haptics = {
  // Light feedback for subtle interactions
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Medium feedback for standard interactions
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy feedback for significant actions
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Soft feedback
  soft: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),

  // Rigid feedback
  rigid: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),

  // Selection change
  selection: () => Haptics.selectionAsync(),

  // Success notification
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Warning notification
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  // Error notification
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  // App-specific haptics
  recordingStarted: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),

  recordingStopped: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  aiResponse: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),

  sessionEnded: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};
