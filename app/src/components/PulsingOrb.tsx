import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';
import { haptics } from '../services/haptics';

interface PulsingOrbProps {
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function PulsingOrb({
  onPress,
  size = 120,
  disabled = false,
  isProcessing = false,
}: PulsingOrbProps) {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const pressScale = useSharedValue(1);
  const morphRotation = useSharedValue(0);

  useEffect(() => {
    if (isProcessing) {
      // Morphing animation for processing state
      morphRotation.value = withRepeat(
        withTiming(360, { duration: 4000, easing: Easing.linear }),
        -1,
        false
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      // Gentle continuous pulse animation (scale 1.0 → 1.05 over 2s)
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Glow pulse
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      morphRotation.value = 0;
    }
  }, [isProcessing]);

  const handlePressIn = () => {
    pressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled) return;
    haptics.recordingStarted();
    onPress();
  };

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseScale.value * pressScale.value },
      { rotate: `${morphRotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: pulseScale.value * 1.3 }],
  }));

  const glowSize = size * 1.6;

  return (
    <View style={[styles.container, { width: glowSize, height: glowSize }]}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
          },
          glowAnimatedStyle,
        ]}
      />

      {/* Main orb */}
      <Animated.View style={orbAnimatedStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[
              styles.gradient,
              { borderRadius: size / 2 },
            ]}
          >
            {/* Microphone icon */}
            <Ionicons
              name="mic"
              size={size * 0.3}
              color="#FFFFFF"
            />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.orbGlow,
  },
  button: {
    ...shadows.orb,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
