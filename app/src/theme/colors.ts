// Light mode colors (default)
export const lightColors = {
  // Backgrounds
  background: '#F5F1E8',           // Beige
  backgroundSecondary: '#D4C5B0',  // Tan
  backgroundTertiary: '#FFFFFF',   // White for cards

  // Primary accent - warm orange
  primary: '#E88D67',              // Warm Orange
  primaryLight: '#F4B59F',         // Soft Peach
  primaryDark: '#D67A54',

  // Text
  text: '#4A3F35',                 // Deep Brown
  textSecondary: '#A89080',        // Soft Brown
  textTertiary: '#A89080',         // Soft Brown with opacity applied in use

  // Message bubbles
  userBubble: '#F4B59F',           // Soft Peach
  aiBubble: '#D4C5B0',             // Tan

  // Semantic
  success: '#6B8E6B',              // Earthy green
  warning: '#E88D67',              // Warm Orange
  error: '#C85C5C',                // Muted Red
  delete: '#C85C5C',               // Muted Red for delete actions

  // Borders & Dividers
  border: 'rgba(168, 144, 128, 0.1)',  // Soft brown 10% opacity
  divider: 'rgba(168, 144, 128, 0.2)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(255, 255, 255, 0.8)',

  // Orb glow
  orbGlow: 'rgba(232, 141, 103, 0.3)',
  orbShadow: 'rgba(232, 141, 103, 0.3)',

  // Tags
  tagBackground: 'rgba(168, 144, 128, 0.2)',  // Soft brown 20% opacity
} as const;

// Dark mode colors
export const darkColors = {
  // Backgrounds
  background: '#2A2420',           // Deep charcoal
  backgroundSecondary: '#3D352F',  // Lighter charcoal
  backgroundTertiary: '#4A403A',   // Card background

  // Primary accent - warm orange
  primary: '#E88D67',              // Warm Orange
  primaryLight: '#F4B59F',         // Soft Peach
  primaryDark: '#D67A54',

  // Text
  text: '#F5F1E8',                 // Beige (inverted)
  textSecondary: '#D4C5B0',        // Tan
  textTertiary: '#A89080',         // Soft Brown

  // Message bubbles
  userBubble: '#E88D67',           // Warm Orange (more vibrant in dark)
  aiBubble: '#3D352F',             // Dark tan

  // Semantic
  success: '#8BAE8B',              // Lighter earthy green
  warning: '#E88D67',              // Warm Orange
  error: '#D87070',                // Lighter muted red
  delete: '#D87070',               // Muted Red for delete actions

  // Borders & Dividers
  border: 'rgba(212, 197, 176, 0.15)',  // Tan 15% opacity
  divider: 'rgba(212, 197, 176, 0.1)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(255, 255, 255, 0.05)',

  // Orb glow
  orbGlow: 'rgba(232, 141, 103, 0.4)',
  orbShadow: 'rgba(232, 141, 103, 0.35)',

  // Tags
  tagBackground: 'rgba(212, 197, 176, 0.2)',  // Tan 20% opacity
} as const;

// Default export for light mode (can be switched based on preference)
export const colors = lightColors;

export type ColorKeys = keyof typeof colors;
