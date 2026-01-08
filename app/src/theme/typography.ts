import { Platform } from 'react-native';

// Get system serif fonts for instant loading
const getSystemSerifFont = () => Platform.select({
  ios: 'Times New Roman', // iOS system serif - elegant and instant
  android: 'serif', // Android system serif
  default: 'serif',
});

// Create typography configuration
export const createTypography = (crimsonLoaded = false) => {
  const getCrimsonFont = (weight: '400' | '600' | '700') => {
    if (!crimsonLoaded) return getSystemSerifFont();
    if (weight === '600') return 'CrimsonText-SemiBold';
    if (weight === '700') return 'CrimsonText-Bold';
    return 'CrimsonText-Regular';
  };

  return {
    // H1 - Home greeting
    h1: {
      fontFamily: getCrimsonFont('600'),
      fontSize: 34,
      fontWeight: (crimsonLoaded ? '600' : '400') as any,
      lineHeight: 42,
      letterSpacing: -0.3,
    },
    // H2 - Session detail titles, section headers
    h2: {
      fontFamily: getCrimsonFont('600'),
      fontSize: 26,
      fontWeight: (crimsonLoaded ? '600' : '400') as any,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    // Body Large - Transcript text, summaries
    bodyLarge: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 18,
      fontWeight: '400' as any,
      lineHeight: 30,
      letterSpacing: 0,
    },
    // Body - UI text
    body: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 16,
      fontWeight: '400' as any,
      lineHeight: 26,
      letterSpacing: 0,
    },
    // Body Semibold - Date/time headers
    bodySemibold: {
      fontFamily: getCrimsonFont('600'),
      fontSize: 16,
      fontWeight: '600' as any,
      lineHeight: 26,
      letterSpacing: 0,
    },
    // Caption - Timestamps, metadata, hints
    caption: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 14,
      fontWeight: '400' as any,
      lineHeight: 22,
      letterSpacing: 0,
    },
    // Small - Tags
    small: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 12,
      fontWeight: '400' as any,
      lineHeight: 18,
      letterSpacing: 0,
    },
    // Legacy mappings for existing code compatibility
    largeTitle: {
      fontFamily: getCrimsonFont('600'),
      fontSize: 32,
      fontWeight: (crimsonLoaded ? '600' : '400') as any,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    title1: {
      fontFamily: getCrimsonFont('600'),
      fontSize: 28,
      fontWeight: (crimsonLoaded ? '600' : '400') as any,
      lineHeight: 34,
      letterSpacing: -0.4,
    },
    title2: {
      fontFamily: getCrimsonFont('600'),
      fontSize: 24,
      fontWeight: (crimsonLoaded ? '600' : '400') as any,
      lineHeight: 30,
      letterSpacing: -0.3,
    },
    title3: {
      fontFamily: getCrimsonFont('600'),
      fontSize: 20,
      fontWeight: (crimsonLoaded ? '600' : '400') as any,
      lineHeight: 25,
      letterSpacing: -0.2,
    },
    headline: {
      fontFamily: getCrimsonFont('600'),
      fontSize: 17,
      fontWeight: '600' as any,
      lineHeight: 22,
      letterSpacing: -0.3,
    },
    callout: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 16,
      fontWeight: '400' as any,
      lineHeight: 21,
      letterSpacing: -0.2,
    },
    subheadline: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 15,
      fontWeight: '400' as any,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    footnote: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 13,
      fontWeight: '400' as any,
      lineHeight: 18,
      letterSpacing: 0,
    },
    caption1: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 14,
      fontWeight: '400' as any,
      lineHeight: 20,
      letterSpacing: 0,
    },
    caption2: {
      fontFamily: getCrimsonFont('400'),
      fontSize: 12,
      fontWeight: '400' as any,
      lineHeight: 16,
      letterSpacing: 0,
    },
  };
};

// Current typography state
let currentTypography = createTypography(false);

// Function to update font loading state
export const setCrimsonFontsLoaded = (loaded: boolean) => {
  currentTypography = createTypography(loaded);
};

// Export typography that components can import and use directly
// NOTE: For static StyleSheets to update, components would normally need to re-render.
// By exporting this as a Proxy, we can redirect access to the latest configuration.
export const typography = new Proxy({} as ReturnType<typeof createTypography>, {
  get(target, prop) {
    return currentTypography[prop as keyof typeof currentTypography];
  },
});