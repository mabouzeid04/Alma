import React from 'react';
import { useFonts } from 'expo-font';
import { setCrimsonFontsLoaded } from '../theme/typography';

export const useTypography = () => {
  const [fontsLoaded] = useFonts({
    'CrimsonText-Regular': require('../../assets/fonts/CrimsonText-Regular.ttf'),
    'CrimsonText-SemiBold': require('../../assets/fonts/CrimsonText-SemiBold.ttf'),
    'CrimsonText-Bold': require('../../assets/fonts/CrimsonText-Bold.ttf'),
  });

  // Update global font loading state when fonts load
  React.useEffect(() => {
    setCrimsonFontsLoaded(fontsLoaded);
  }, [fontsLoaded]);

  return fontsLoaded;
};
