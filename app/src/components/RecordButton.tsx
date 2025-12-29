import React, { useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '../theme';
import { haptics } from '../services/haptics';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
}

export function RecordButton({
  isRecording,
  onPress,
  size = 80,
  disabled = false,
}: RecordButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      // Pulse animation when recording
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;

    if (isRecording) {
      haptics.recordingStopped();
    } else {
      haptics.recordingStarted();
    }
    onPress();
  };

  const glowSize = size * 1.8;

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
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Button */}
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
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
              opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={
              isRecording
                ? [colors.error, '#B84C4C']
                : [colors.primary, colors.primaryDark]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradient,
              { borderRadius: size / 2 },
            ]}
          >
            {/* Icon */}
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={size * 0.35}
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
