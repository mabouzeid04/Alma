import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

type WaveformState = 'idle' | 'speaking' | 'processing' | 'aiSpeaking';

interface WaveformVisualizerProps {
  state: WaveformState;
  barCount?: number;
  height?: number;
}

export function WaveformVisualizer({
  state,
  barCount = 12,
  height = 80,
}: WaveformVisualizerProps) {
  const bars = Array(barCount).fill(0);

  return (
    <View style={[styles.container, { height }]}>
      <LinearGradient
        colors={['transparent', colors.background]}
        style={styles.gradientOverlay}
      />
      <View style={styles.barsContainer}>
        {bars.map((_, index) => (
          <WaveformBar
            key={index}
            index={index}
            barCount={barCount}
            state={state}
            maxHeight={height * 0.7}
          />
        ))}
      </View>
    </View>
  );
}

interface WaveformBarProps {
  index: number;
  barCount: number;
  state: WaveformState;
  maxHeight: number;
}

function WaveformBar({ index, barCount, state, maxHeight }: WaveformBarProps) {
  const heightValue = useSharedValue(8);
  const opacity = useSharedValue(0.6);

  const minHeight = 8;
  const centerIndex = (barCount - 1) / 2;
  const distanceFromCenter = Math.abs(index - centerIndex);
  const baseHeight = maxHeight * (1 - (distanceFromCenter / centerIndex) * 0.5);

  useEffect(() => {
    const delay = index * 50;

    if (state === 'speaking') {
      // Active dancing animation when user is speaking
      const randomDuration = 300 + Math.random() * 200;
      heightValue.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(baseHeight * (0.5 + Math.random() * 0.5), {
              duration: randomDuration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(minHeight + Math.random() * (baseHeight * 0.3), {
              duration: randomDuration * 0.8,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );
      opacity.value = withTiming(1, { duration: 200 });
    } else if (state === 'processing') {
      // Pulsing glow effect when AI is processing
      heightValue.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(baseHeight * 0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(baseHeight * 0.2, { duration: 600, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.4, { duration: 600 })
        ),
        -1,
        true
      );
    } else if (state === 'aiSpeaking') {
      // Smooth wave animation when AI is speaking
      const waveDuration = 400;
      const phaseOffset = (index / barCount) * Math.PI * 2;
      heightValue.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(baseHeight * (0.4 + Math.sin(phaseOffset) * 0.3), {
              duration: waveDuration,
              easing: Easing.inOut(Easing.sine),
            }),
            withTiming(baseHeight * (0.6 + Math.cos(phaseOffset) * 0.3), {
              duration: waveDuration,
              easing: Easing.inOut(Easing.sine),
            })
          ),
          -1,
          true
        )
      );
      opacity.value = withTiming(0.9, { duration: 200 });
    } else {
      // Gentle idle pulse
      heightValue.value = withRepeat(
        withSequence(
          withTiming(minHeight + 4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(minHeight, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withTiming(0.5, { duration: 300 });
    }
  }, [state, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightValue.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.bar, animatedStyle]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.barGradient}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    zIndex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 20,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barGradient: {
    flex: 1,
  },
});
