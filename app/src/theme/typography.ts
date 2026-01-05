import { Platform } from 'react-native';

// Use Crimson Text for warm, charming, thoughtful aesthetic
const fontFamily = Platform.select({
  ios: 'CrimsonText',
  android: 'CrimsonText',
  default: 'CrimsonText',
});

const fontFamilyFallback = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  // H1 - Home greeting
  h1: {
    fontFamily,
    fontSize: 34,
    fontWeight: '600' as const,
    lineHeight: 42,
    letterSpacing: -0.3,
  },
  // H2 - Session detail titles, section headers
  h2: {
    fontFamily,
    fontSize: 26,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  // Body Large - Transcript text, summaries
  bodyLarge: {
    fontFamily: fontFamilyFallback,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 30,  // Better for serif reading
    letterSpacing: 0,
  },
  // Body - UI text
  body: {
    fontFamily: fontFamilyFallback,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 26,
    letterSpacing: 0,
  },
  // Body Semibold - Date/time headers
  bodySemibold: {
    fontFamily: fontFamilyFallback,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: 0,
  },
  // Caption - Timestamps, metadata, hints
  caption: {
    fontFamily: fontFamilyFallback,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  // Small - Tags
  small: {
    fontFamily: fontFamilyFallback,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
  // Legacy mappings for existing code compatibility
  largeTitle: {
    fontFamily,
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  title2: {
    fontFamily,
    fontSize: 24,
    fontWeight: '500' as const,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  title3: {
    fontFamily,
    fontSize: 20,
    fontWeight: '500' as const,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  headline: {
    fontFamily: fontFamilyFallback,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  callout: {
    fontFamily: fontFamilyFallback,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  subheadline: {
    fontFamily: fontFamilyFallback,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  footnote: {
    fontFamily: fontFamilyFallback,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
  caption1: {
    fontFamily: fontFamilyFallback,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: fontFamilyFallback,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
} as const;
