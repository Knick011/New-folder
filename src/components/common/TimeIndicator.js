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
  
  // Animation values
  const expandAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Subscribe to timer updates
    const removeListener = EnhancedTimerService.addEventListener(handleTimerEvent);
    
    // Start pulse animation for low time
    if (time < 300) { // Less than 5 minutes
      startPulseAnimation();
    }
    
    return () => removeListener();
  }, []);
  
  // Update animation when expanded prop changes
  useEffect(() => {
    setIsExpanded(expanded);
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // Using width interpolation
      easing: Easing.inOut(Easing.ease),
    }).start();
  }, [expanded]);
  
  // Start pulsing animation for low time
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
  };
  
  // Handle timer events
  const handleTimerEvent = (event) => {
    if (event.event === 'timeUpdate' || event.event === 'creditsAdded') {
      setTime(EnhancedTimerService.getAvailableTime());
      
      // Start pulsing animation if time is low
      if (EnhancedTimerService.getAvailableTime() < 300 && !pulseAnim._animation) {
        startPulseAnimation();
      }
    }
  };
  
  // Toggle expanded state
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    
    Animated.timing(expandAnim, {
      toValue: newState ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // Using width interpolation
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
            outputRange: [80, 150]
          }),
          backgroundColor: getTimeColor(),
          transform: [
            { scale: time < 300 ? pulseAnim : 1 }
          ]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.touchable}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <Icon name="timer-outline" size={isExpanded ? 18 : 20} color="white" />
        
        <Animated.View
          style={[
            styles.timeTextContainer,
            {
              opacity: expandAnim,
              width: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 80]
              }),
              marginLeft: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 8]
              })
            }
          ]}
        >
          <Text style={styles.timeText}>{formattedTime}</Text>
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
  },
  touchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  timeTextContainer: {
    overflow: 'hidden',
  },
  timeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
});

export default TimeIndicator; 