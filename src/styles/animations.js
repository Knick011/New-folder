// src/styles/animations.js
import { Animated, Easing } from 'react-native';
import theme from './theme';

// Animation helper functions similar to the web version
const animations = {
  // Scale In animation (for popups, notifications)
  scaleIn: (animValue, duration = theme.animation.normal) => {
    return Animated.timing(animValue, {
      toValue: 1,
      duration,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.5)),
    });
  },
  
  // Fade In animation
  fadeIn: (animValue, duration = theme.animation.normal) => {
    return Animated.timing(animValue, {
      toValue: 1,
      duration,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    });
  },
  
  // Slide Up animation (for notifications or toasts)
  slideUp: (animValue, duration = theme.animation.normal) => {
    return Animated.timing(animValue, {
      toValue: 1,
      duration,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    });
  },
  
  // Pulse animation (for buttons, highlighted elements)
  pulse: (animValue, duration = 2000) => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1.05,
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.out(Easing.sin),
        }),
        Animated.timing(animValue, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.in(Easing.sin),
        }),
      ])
    );
  },
  
  // Bounce animation (for mascot and other elements)
  bounce: (animValue, duration = 2000) => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: -10, // Move up
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.out(Easing.sin),
        }),
        Animated.timing(animValue, {
          toValue: 0, // Back to original
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.in(Easing.sin),
        }),
      ])
    );
  },
  
  // Float animation (for welcome screen elements)
  float: (animValue, duration = 4000) => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: -15, // Float up
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(animValue, {
          toValue: 0, // Back to original
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    );
  },
  
  // Shake animation (for errors or incorrect answers)
  shake: (animValue, duration = 500) => {
    return Animated.sequence([
      Animated.timing(animValue, {
        toValue: -10,
        duration: duration / 4,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
      Animated.timing(animValue, {
        toValue: 10,
        duration: duration / 4,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
      Animated.timing(animValue, {
        toValue: -5,
        duration: duration / 4,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
      Animated.timing(animValue, {
        toValue: 0,
        duration: duration / 4,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    ]);
  },
  
  // Countdown timer animation (for questions)
  countdown: (animValue, duration = 10000) => {
    return Animated.timing(animValue, {
      toValue: 0,
      duration,
      useNativeDriver: false, // Need to animate width
      easing: Easing.linear,
    });
  },
  
  // Helper to create animated values with defaults
  createAnimatedValues: () => {
    return {
      scale: new Animated.Value(0.9),
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      bounce: new Animated.Value(0),
    };
  }
};

export default animations;