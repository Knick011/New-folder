// src/components/common/TimeIndicator.js - Fixed version
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing,
  Dimensions,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EnhancedTimerService from '../../services/EnhancedTimerService';
import theme from '../../styles/theme';

const { width } = Dimensions.get('window');

const TimeIndicator = ({ onPress, expanded = false }) => {
  const [time, setTime] = useState(EnhancedTimerService.getAvailableTime());
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  // Animation values - separate native and non-native animations
  const expandAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current; // For pulsing (native driver)
  const opacityAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current; // For text fade (native driver)
  
  useEffect(() => {
    // Subscribe to timer updates
    const removeListener = EnhancedTimerService.addEventListener(handleTimerEvent);
    
    // Start pulse animation for low time
    if (time < 300 && time > 0) { // Less than 5 minutes but more than 0
      startPulseAnimation();
    }
    
    return () => removeListener();
  }, []);
  
  // Update animation when expanded prop changes
  useEffect(() => {
    setIsExpanded(expanded);
    
    // Animate expansion (width - can't use native driver)
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false, // Width animation requires non-native driver
      easing: Easing.inOut(Easing.ease),
    }).start();
    
    // Animate text opacity (can use native driver)
    Animated.timing(opacityAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true, // Opacity can use native driver
      easing: Easing.inOut(Easing.ease),
    }).start();
  }, [expanded]);
  
  // Start pulsing animation for low time
  const startPulseAnimation = () => {
    const pulseSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true, // Scale can use native driver
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    );
    
    pulseSequence.start();
    
    // Stop pulsing after time updates
    return () => pulseSequence.stop();
  };
  
  // Handle timer events
  const handleTimerEvent = (event) => {
    if (event.event === 'timeUpdate' || event.event === 'creditsAdded' || event.event === 'timeLoaded') {
      const newTime = EnhancedTimerService.getAvailableTime();
      setTime(newTime);
      
      // Start pulsing animation if time is low and not already pulsing
      if (newTime < 300 && newTime > 0 && !scaleAnim._animation) {
        startPulseAnimation();
      } else if (newTime === 0 || newTime >= 300) {
        // Stop pulsing if time is 0 or sufficient
        scaleAnim.stopAnimation();
        scaleAnim.setValue(1);
      }
    }
  };
  
  // Toggle expanded state
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    
    // Animate width expansion (non-native)
    Animated.timing(expandAnim, {
      toValue: newState ? 1 : 0,
      duration: 250,
      useNativeDriver: false, // Width requires non-native
      easing: Easing.inOut(Easing.ease),
    }).start();
    
    // Animate text opacity (native)
    Animated.timing(opacityAnim, {
      toValue: newState ? 1 : 0,
      duration: 200,
      useNativeDriver: true, // Opacity can use native
      easing: Easing.inOut(Easing.ease),
    }).start();
    
    if (onPress) {
      onPress(newState);
    }
  };
  
  // Get color based on time
  const getTimeColor = () => {
    if (time <= 60) return theme.colors.error; // 1 minute or less
    if (time <= 300) return theme.colors.warning; // 5 minutes or less
    return theme.colors.primary; // More than 5 minutes
  };
  
  // Format time
  const formattedTime = EnhancedTimerService.formatTime(time);
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [60, 140] // Smaller range to avoid overflow
          }),
          backgroundColor: getTimeColor(),
          transform: [
            { 
              scale: time < 300 && time > 0 ? scaleAnim : 1 
            }
          ]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.touchable}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <Icon 
          name="timer-outline" 
          size={isExpanded ? 16 : 20} 
          color="white" 
          style={styles.icon}
        />
        
        <Animated.View
          style={[
            styles.timeTextContainer,
            {
              opacity: opacityAnim,
              width: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 70] // Fixed width for text
              }),
            }
          ]}
        >
          <Text style={styles.timeText} numberOfLines={1}>
            {formattedTime}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 999,
    overflow: 'hidden', // Prevent text overflow
  },
  touchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 4,
  },
  timeTextContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  timeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
});

export default TimeIndicator;