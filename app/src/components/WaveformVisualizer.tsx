import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme';

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
  barWidth?: number;
  barSpacing?: number;
  minHeight?: number;
  maxHeight?: number;
  color?: string;
}

export function WaveformVisualizer({
  isActive,
  barCount = 5,
  barWidth = 4,
  barSpacing = 3,
  minHeight = 8,
  maxHeight = 24,
  color = colors.primary,
}: WaveformVisualizerProps) {
  const animations = useRef<Animated.Value[]>(
    Array(barCount)
      .fill(0)
      .map(() => new Animated.Value(minHeight))
  ).current;

  useEffect(() => {
    if (isActive) {
      animations.forEach((anim, index) => {
        const delay = index * 100;
        const duration = 400 + Math.random() * 200;

        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: minHeight + Math.random() * (maxHeight - minHeight),
              duration,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: minHeight + Math.random() * ((maxHeight - minHeight) / 2),
              duration: duration * 0.8,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ])
        ).start();
      });
    } else {
      animations.forEach((anim) => {
        anim.stopAnimation();
        Animated.timing(anim, {
          toValue: minHeight,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      animations.forEach((anim) => anim.stopAnimation());
    };
  }, [isActive]);

  const totalWidth =
    barCount * barWidth + (barCount - 1) * barSpacing;

  return (
    <View
      style={[
        styles.container,
        { width: totalWidth, height: maxHeight },
      ]}
    >
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: anim,
              backgroundColor: color,
              marginLeft: index > 0 ? barSpacing : 0,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 2,
  },
});
