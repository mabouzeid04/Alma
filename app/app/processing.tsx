import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../src/theme';
import { haptics } from '../src/services/haptics';

export default function ProcessingScreen() {
  const router = useRouter();
  const [dots, setDots] = useState('');

  // Orb animations
  const scale = useSharedValue(1);
  const morphX = useSharedValue(1);
  const morphY = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Morphing pulse animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Subtle morphing effect
    morphX.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.98, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    morphY.value = withRepeat(
      withSequence(
        withTiming(0.98, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Slow rotation
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Animated dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    // Minimum processing time of 2 seconds, then navigate to summary
    const processingTimer = setTimeout(() => {
      haptics.medium();
      router.replace('/summary');
    }, 3000);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(processingTimer);
    };
  }, []);

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { scaleX: morphX.value },
      { scaleY: morphY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: scale.value * 1.4 }],
  }));

  const orbSize = 120;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Morphing Orb */}
          <View style={styles.orbWrapper}>
            {/* Outer glow */}
            <Animated.View
              style={[
                styles.glow,
                {
                  width: orbSize * 1.6,
                  height: orbSize * 1.6,
                  borderRadius: orbSize * 0.8,
                },
                glowAnimatedStyle,
              ]}
            />

            {/* Main orb */}
            <Animated.View style={orbAnimatedStyle}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={[
                  styles.orb,
                  {
                    width: orbSize,
                    height: orbSize,
                    borderRadius: orbSize / 2,
                  },
                ]}
              />
            </Animated.View>
          </View>

          {/* Status Text */}
          <Animated.View
            entering={FadeIn.delay(300).duration(500)}
            style={styles.textContainer}
          >
            <Text style={styles.statusText}>
              Reflecting on your session{dots}
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.orbGlow,
  },
  orb: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  textContainer: {
    marginTop: spacing.xl,
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
