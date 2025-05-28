// src/components/common/TimeSpeechBubble.js - Simple speech bubble for time display
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import TimerService from '../../services/TimerService';
import theme from '../../styles/theme';

const TimeSpeechBubble = ({ visible, onDismiss, position = 'left' }) => {
  const [time, setTime] = useState(TimerService.getAvailableTime());
  
  // Simple fade animation (only opacity - no layout properties)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Subscribe to timer updates
    const removeListener = TimerService.addEventListener(handleTimerEvent);
    return () => removeListener();
  }, []);
  
  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true, // Only opacity animation - safe to use native driver
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start();
    }
  }, [visible]);
  
  // Handle timer events
  const handleTimerEvent = (event) => {
    if (event.event === 'timeUpdate' || event.event === 'creditsAdded') {
      setTime(TimerService.getAvailableTime());
    }
  };
  
  // Get time message
  const getTimeMessage = () => {
    if (time <= 0) {
      return "You have no app time remaining! 😔\n\nComplete quizzes to earn time:\n• Each correct answer = 30 seconds\n• Streak milestones = 2 minutes bonus!\n\nLet's start learning! 🧠";
    } else {
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = time % 60;
      
      let timeBreakdown = '';
      if (hours > 0) {
        timeBreakdown = `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        timeBreakdown = `${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''}`;
      } else {
        timeBreakdown = `${seconds} second${seconds !== 1 ? 's' : ''}`;
      }
      
      return `You have ${timeBreakdown} of app time! ⏰\n\nUse it wisely on your favorite apps.\nWhen it runs out, come back to earn more! 🧠\n\nKeep learning to unlock more time! 📚`;
    }
  };
  
  if (!visible) return null;
  
  return (
    <TouchableWithoutFeedback onPress={onDismiss}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback>
          <Animated.View 
            style={[
              styles.speechBubble,
              position === 'left' ? styles.leftBubble : styles.rightBubble,
              {
                opacity: fadeAnim,
                // Simple scale animation using transform (safe with native driver)
                transform: [
                  { 
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })
                  }
                ]
              }
            ]}
          >
            <Text style={styles.speechText}>{getTimeMessage()}</Text>
            
            {/* Speech bubble arrow */}
            <View 
              style={[
                styles.speechArrow,
                position === 'left' ? styles.leftArrow : styles.rightArrow
              ]} 
            />
            
            {/* Tap to dismiss indicator */}
            <View style={styles.tapIndicator}>
              <Text style={styles.tapText}>Tap anywhere to dismiss</Text>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  speechBubble: {
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: 320,
    minWidth: 280,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  leftBubble: {
    alignSelf: 'flex-start',
    marginLeft: 40,
  },
  rightBubble: {
    alignSelf: 'flex-end',
    marginRight: 40,
  },
  speechText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: theme.colors.textDark,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  speechArrow: {
    position: 'absolute',
    bottom: -12,
    width: 24,
    height: 24,
    backgroundColor: theme.colors.background,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: theme.colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  leftArrow: {
    left: 30,
  },
  rightArrow: {
    right: 30,
  },
  tapIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 159, 28, 0.1)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  tapText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.primary,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default TimeSpeechBubble;