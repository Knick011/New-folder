import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated,
  TouchableOpacity,
  Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EnhancedScoreService from '../services/EnhancedScoreService';
import EnhancedTimerService from '../services/EnhancedTimerService';
import theme from '../styles/theme';

const TimeManagementDisplay = ({ style, onPress }) => {
  const [scoreInfo, setScoreInfo] = useState(null);
  const [availableTime, setAvailableTime] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Load initial data
    loadData();
    
    // Listen to score updates
    const scoreListener = EnhancedScoreService.addEventListener((event) => {
      if (event.event === 'penaltyApplied' || event.event === 'rolloverBonus') {
        loadData();
        
        if (event.event === 'penaltyApplied') {
          // Shake animation when penalty applied
          animateShake();
        }
      }
    });
    
    // Listen to timer updates
    const timerListener = EnhancedTimerService.addEventListener((event) => {
      if (event.event === 'timeUpdate') {
        setAvailableTime(event.remaining);
        setIsOvertime(event.remaining <= 0 && !event.isAppForeground);
      }
    });
    
    // Update every minute
    const interval = setInterval(loadData, 60000);
    
    return () => {
      scoreListener();
      timerListener();
      clearInterval(interval);
    };
  }, []);
  
  useEffect(() => {
    // Pulse animation when overtime
    if (isOvertime) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOvertime]);
  
  const loadData = async () => {
    const info = EnhancedScoreService.getDetailedScoreInfo();
    setScoreInfo(info);
  };
  
  const animateShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  if (!scoreInfo) return null;
  
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };
  
  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View 
        style={[
          styles.content,
          isOvertime && styles.overtimeContent,
          {
            transform: [
              { scale: pulseAnim },
              { translateX: shakeAnim }
            ]
          }
        ]}
      >
        {/* Status Icon */}
        <View style={[styles.iconContainer, isOvertime && styles.overtimeIcon]}>
          <Icon 
            name={isOvertime ? 'alert-circle' : 'check-circle'} 
            size={24} 
            color={isOvertime ? '#fff' : theme.colors.success} 
          />
        </View>
        
        {/* Main Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, isOvertime && styles.overtimeText]}>
            {isOvertime ? 'Overtime Active!' : 'Time Status'}
          </Text>
          
          {isOvertime ? (
            <View style={styles.penaltyInfo}>
              <Text style={styles.penaltyText}>
                -{scoreInfo.overtimePenalty} points
              </Text>
              <Text style={styles.penaltySubtext}>
                ({formatTime(scoreInfo.minutesOvertime)} overtime)
              </Text>
            </View>
          ) : (
            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>
                {EnhancedTimerService.formatTime(availableTime)} remaining
              </Text>
              {scoreInfo.dailyRolloverBonus > 0 && (
                <Text style={styles.bonusText}>
                  +{scoreInfo.dailyRolloverBonus} rollover bonus today!
                </Text>
              )}
            </View>
          )}
        </View>
        
        {/* Action Icon */}
        <Icon 
          name="chevron-right" 
          size={20} 
          color={isOvertime ? '#fff' : '#666'} 
        />
      </Animated.View>
      
      {/* Progress Bar */}
      {!isOvertime && availableTime > 0 && (
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${Math.min(100, (availableTime / 3600) * 100)}%`,
                backgroundColor: availableTime > 1800 ? theme.colors.success : theme.colors.warning
              }
            ]} 
          />
        </View>
      )}
      
      {/* Rollover Preview */}
      {!isOvertime && availableTime > 60 && (
        <Text style={styles.rolloverPreview}>
          Save {Math.floor(availableTime / 60)} min = +{Math.floor(availableTime / 60) * 10} points tomorrow
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  overtimeContent: {
    backgroundColor: theme.colors.error,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 217, 100, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  overtimeIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  overtimeText: {
    color: 'white',
  },
  penaltyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  penaltyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  penaltySubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  timeInfo: {
    flexDirection: 'column',
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  bonusText: {
    fontSize: 12,
    color: theme.colors.success,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  rolloverPreview: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    paddingBottom: 8,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
});

export default TimeManagementDisplay; 