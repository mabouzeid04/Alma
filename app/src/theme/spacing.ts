// Base unit: 8px as per specification
export const spacing = {
  xxxs: 2,
  xxs: 4,
  xs: 8,      // Base unit / tight spacing (tags, labels)
  sm: 12,
  md: 16,     // Component spacing
  lg: 20,     // Screen margins horizontal
  xl: 24,     // Section padding
  xxl: 32,
  xxxl: 40,   // Bottom metadata margin
  xxxxl: 60,  // Top margin for greeting
} as const;

// Corner radius per specification
export const borderRadius = {
  xs: 8,      // Small elements
  sm: 12,     // Tags, small pills
  md: 16,     // Cards, bubbles
  lg: 24,     // Primary buttons (pill-shaped)
  xl: 32,
  full: 9999, // Circular elements like orb
} as const;

// Animation durations
export const animation = {
  fast: 200,          // Tag appear
  default: 300,       // Screen transitions, button press
  slow: 2000,         // Orb pulse loop
  processing: 4000,   // Processing animation
} as const;

// Shadow definitions for warm aesthetic
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orb: {
    shadowColor: '#E88D67',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
