import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../theme';

type WaveformState = 'idle' | 'speaking' | 'transcribing' | 'processing' | 'aiSpeaking';

interface WaveformVisualizerProps {
  state: WaveformState;
  particleCount?: number;
  size?: number;
  audioLevel?: number;
}

// Golden Wood gradient colors for particles
const particleColors = [
  colors.primary,      // Golden Wood (Raw Sienna)
  colors.primaryLight, // Pale Walnut
  '#7F5539',           // Antique Oak
  '#A07855',           // Raw Sienna
  colors.primaryLight, // Pale Walnut
  colors.primary,      // Golden Wood
];

export function WaveformVisualizer({
  state,
  particleCount = 24,
  size = 120,
  audioLevel = 0,
}: WaveformVisualizerProps) {
  // Generate particles with random properties for organic feel
  const particles = useMemo(() => {
    return Array(particleCount).fill(0).map((_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const radiusVariation = 0.7 + Math.random() * 0.6;
      return {
        id: i,
        angle,
        baseRadius: radiusVariation,
        size: 6 + Math.random() * 6, // 6-12px
        color: particleColors[i % particleColors.length],
        phaseOffset: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.4,
      };
    });
  }, [particleCount]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          particle={particle}
          state={state}
          containerSize={size}
          audioLevel={audioLevel}
        />
      ))}
    </View>
  );
}

interface ParticleProps {
  particle: {
    id: number;
    angle: number;
    baseRadius: number;
    size: number;
    color: string;
    phaseOffset: number;
    speed: number;
  };
  state: WaveformState;
  containerSize: number;
  audioLevel: number;
}

function Particle({ particle, state, containerSize, audioLevel }: ParticleProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  const centerOffset = containerSize / 2 - particle.size / 2;
  const maxRadius = containerSize * 0.35;

  // React to audio levels when speaking
  useEffect(() => {
    if (state === 'speaking') {
      // Expand based on audio level with organic variation
      const targetRadius = maxRadius * (0.3 + audioLevel * 0.7) * particle.baseRadius;
      const wobble = Math.sin(Date.now() / 200 + particle.phaseOffset) * 5;

      const targetX = Math.cos(particle.angle + wobble * 0.02) * targetRadius;
      const targetY = Math.sin(particle.angle + wobble * 0.02) * targetRadius;

      translateX.value = withSpring(targetX, {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
      });
      translateY.value = withSpring(targetY, {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
      });

      scale.value = withSpring(0.8 + audioLevel * 0.4, {
        damping: 12,
        stiffness: 180,
      });

      opacity.value = withTiming(0.6 + audioLevel * 0.4, { duration: 100 });
    }
  }, [audioLevel, state]);

  useEffect(() => {
    const delay = particle.id * 30;

    if (state === 'idle') {
      // Gentle breathing - particles float close together
      const breathRadius = maxRadius * 0.15 * particle.baseRadius;
      const duration = 3000 / particle.speed;

      translateX.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.cos(particle.angle) * breathRadius, {
              duration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.cos(particle.angle + 0.3) * breathRadius * 0.8, {
              duration,
              easing: Easing.inOut(Easing.sin),
            })
          ),
          -1,
          true
        )
      );

      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.sin(particle.angle) * breathRadius, {
              duration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.sin(particle.angle + 0.3) * breathRadius * 0.8, {
              duration,
              easing: Easing.inOut(Easing.sin),
            })
          ),
          -1,
          true
        )
      );

      scale.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.1, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );

      opacity.value = withTiming(0.5, { duration: 400 });
    } else if (state === 'speaking') {
      // Initial state for speaking - will be updated by audioLevel
      opacity.value = withTiming(0.8, { duration: 200 });
    } else if (state === 'transcribing') {
      // Orbital swirling inward - speech being converted to text
      const orbitRadius = maxRadius * 0.3 * particle.baseRadius;
      const orbitDuration = 1200 / particle.speed;

      // Particles orbit around center with staggered rotation
      translateX.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.cos(particle.angle) * orbitRadius, {
              duration: orbitDuration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.cos(particle.angle + Math.PI / 2) * orbitRadius * 0.85, {
              duration: orbitDuration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.cos(particle.angle + Math.PI) * orbitRadius * 0.7, {
              duration: orbitDuration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.cos(particle.angle + Math.PI * 1.5) * orbitRadius * 0.85, {
              duration: orbitDuration,
              easing: Easing.inOut(Easing.sin),
            })
          ),
          -1,
          false
        )
      );

      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.sin(particle.angle) * orbitRadius, {
              duration: orbitDuration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.sin(particle.angle + Math.PI / 2) * orbitRadius * 0.85, {
              duration: orbitDuration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.sin(particle.angle + Math.PI) * orbitRadius * 0.7, {
              duration: orbitDuration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.sin(particle.angle + Math.PI * 1.5) * orbitRadius * 0.85, {
              duration: orbitDuration,
              easing: Easing.inOut(Easing.sin),
            })
          ),
          -1,
          false
        )
      );

      // Gentle pulse while orbiting
      scale.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: orbitDuration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.8, { duration: orbitDuration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.9, { duration: orbitDuration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.85, { duration: orbitDuration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );

      opacity.value = withTiming(0.7, { duration: 200 });
    } else if (state === 'processing') {
      // Pulsing inward/outward - thinking state
      const pulseRadius = maxRadius * 0.25 * particle.baseRadius;

      translateX.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.cos(particle.angle) * pulseRadius * 1.2, {
              duration: 800,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(Math.cos(particle.angle) * pulseRadius * 0.5, {
              duration: 800,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );

      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.sin(particle.angle) * pulseRadius * 1.2, {
              duration: 800,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(Math.sin(particle.angle) * pulseRadius * 0.5, {
              duration: 800,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        )
      );

      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1,
        true
      );

      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (state === 'aiSpeaking') {
      // Flowing wave pattern - AI responding
      const waveRadius = maxRadius * 0.4 * particle.baseRadius;
      const waveDuration = 600 / particle.speed;

      translateX.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.cos(particle.angle + particle.phaseOffset) * waveRadius, {
              duration: waveDuration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.cos(particle.angle + particle.phaseOffset + 0.5) * waveRadius * 1.2, {
              duration: waveDuration,
              easing: Easing.inOut(Easing.sin),
            })
          ),
          -1,
          true
        )
      );

      translateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(Math.sin(particle.angle + particle.phaseOffset) * waveRadius, {
              duration: waveDuration,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(Math.sin(particle.angle + particle.phaseOffset + 0.5) * waveRadius * 1.2, {
              duration: waveDuration,
              easing: Easing.inOut(Easing.sin),
            })
          ),
          -1,
          true
        )
      );

      opacity.value = withTiming(0.85, { duration: 200 });

      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: waveDuration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.9, { duration: waveDuration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
          left: centerOffset,
          top: centerOffset,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
});
