// Light mode colors (default)
export const lightColors = {
  // Backgrounds (DO NOT CHANGE)
  background: '#F5F1E8',           // Beige
  backgroundSecondary: '#D4C5B0',  // Tan
  backgroundTertiary: '#FFFFFF',   // White for cards

  // Primary accent - Golden Wood (Raw Sienna)
  primary: '#A07855',              // Raw Sienna (Golden Wood)
  primaryLight: '#BFAFA0',         // Pale Walnut (Lighter tint)
  primaryDark: '#5C3D2E',          // Dark Roast

  // Text
  text: '#5C3D2E',                 // Dark Roast (Deep Coffee)
  textSecondary: '#7F5539',        // Antique Oak
  textTertiary: '#7F5539',         // Antique Oak with opacity applied in use

  // Message bubbles - Two-Tone Leather
  userBubble: '#A07855',           // Raw Sienna (Golden Wood)
  aiBubble: '#A07855',             // Raw Sienna (Golden Wood)

  // Semantic
  success: '#6B8E6B',              // Earthy green
  warning: '#D4A259',              // Muted Gold
  error: '#C85C5C',                // Muted Red
  delete: '#C85C5C',               // Muted Red for delete actions

  // Borders & Dividers
  border: 'rgba(127, 85, 57, 0.15)',   // Antique Oak 15% opacity
  divider: 'rgba(127, 85, 57, 0.1)',   // Antique Oak 10% opacity

  // Overlays
  overlay: 'rgba(92, 61, 46, 0.4)',    // Dark Roast 40% opacity
  overlayLight: 'rgba(255, 255, 255, 0.8)',

  // Orb glow
  orbGlow: 'rgba(160, 120, 85, 0.3)',   // Raw Sienna 30% opacity
  orbShadow: 'rgba(160, 120, 85, 0.3)', // Raw Sienna 30% opacity

  // Tags
  tagBackground: 'rgba(127, 85, 57, 0.15)', // Antique Oak 15% opacity
} as const;

// Dark mode colors
export const darkColors = {
  // Backgrounds
  background: '#2A2420',           // Deep charcoal
  backgroundSecondary: '#3D352F',  // Lighter charcoal
  backgroundTertiary: '#4A403A',   // Card background

  // Primary accent - Saddle Brown
  primary: '#8B5E3C',              // Saddle Brown
  primaryLight: '#A07855',         // Raw Sienna
  primaryDark: '#5C3D2E',          // Dark Roast

  // Text
  text: '#F5F1E8',                 // Beige (inverted)
  textSecondary: '#D4C5B0',        // Tan
  textTertiary: '#A07855',         // Raw Sienna

  // Message bubbles
  userBubble: '#8B5E3C',           // Saddle Brown (Vibrant in dark)
  aiBubble: '#4A3F35',             // Deep Brown (Subtle in dark)

  // Semantic
  success: '#8BAE8B',              // Lighter earthy green
  warning: '#D4A259',              // Muted Gold
  error: '#D87070',                // Lighter muted red
  delete: '#D87070',               // Muted Red for delete actions

  // Borders & Dividers
  border: 'rgba(212, 197, 176, 0.15)',  // Tan 15% opacity
  divider: 'rgba(212, 197, 176, 0.1)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(255, 255, 255, 0.05)',

  // Orb glow
  orbGlow: 'rgba(139, 94, 60, 0.4)',
  orbShadow: 'rgba(139, 94, 60, 0.35)',

  // Tags
  tagBackground: 'rgba(212, 197, 176, 0.2)',  // Tan 20% opacity
} as const;

// Default export for light mode (can be switched based on preference)
export const colors = lightColors;

export type ColorKeys = keyof typeof colors;
