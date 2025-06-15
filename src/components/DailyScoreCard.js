// src/components/DailyScoreCard.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
  Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EnhancedScoreService from '../services/EnhancedScoreService';
import theme from '../styles/theme';

const DailyScoreCard = ({ onPress, style }) => {
  const [scoreInfo, setScoreInfo] = useState(null);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    loadScoreData();
    
    // Listen to score updates
    const listener = EnhancedScoreService.addEventListener((event) => {
      if (event.event === 'scoreUpdated' || 
          event.event === 'dailyReset' || 
          event.event === 'penaltyApplied') {
        loadScoreData();
        
        if (event.event === 'dailyReset') {
          // Celebration animation
          animateCelebration();
        }
      }
    });
    
    // Update time until reset every minute
    const interval = setInterval(() => {
      updateTimeUntilReset();
    }, 60000);
    
    updateTimeUntilReset();
    
    // Entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    return () => {
      listener();
      clearInterval(interval);
    };
  }, []);
  
  const loadScoreData = async () => {
    const info = EnhancedScoreService.getScoreInfo();
    setScoreInfo(info);
  };
  
  const updateTimeUntilReset = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    
    const diff = midnight - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeUntilReset(`${hours}h ${minutes}m`);
  };
  
  const animateCelebration = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  if (!scoreInfo) return null;
  
  const isPositive = scoreInfo.dailyScore >= 0;
  const hasRollover = scoreInfo.dailyRolloverBonus > 0;
  
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Animated.View 
        style={[
          styles.container,
          style,
          {
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim }
            ]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Today's Score</Text>
            <Text style={styles.resetTime}>Resets in {timeUntilReset}</Text>
          </View>
          <Icon name="calendar-today" size={24} color={theme.colors.primary} />
        </View>
        
        {/* Main Score */}
        <View style={styles.scoreContainer}>
          <Text style={[
            styles.scoreValue,
            !isPositive && styles.negativeScore
          ]}>
            {scoreInfo.dailyScore.toLocaleString()}
          </Text>
          <Text style={styles.scoreLabel}>points</Text>
        </View>
        
        {/* Score Breakdown */}
        <View style={styles.breakdown}>
          {hasRollover && (
            <View style={styles.breakdownItem}>
              <Icon name="piggy-bank" size={16} color={theme.colors.success} />
              <Text style={styles.breakdownText}>
                +{scoreInfo.dailyRolloverBonus} rollover
              </Text>
            </View>
          )}
          
          {scoreInfo.sessionScore > 0 && (
            <View style={styles.breakdownItem}>
              <Icon name="brain" size={16} color={theme.colors.primary} />
              <Text style={styles.breakdownText}>
                +{scoreInfo.sessionScore} earned
              </Text>
            </View>
          )}
          
          {scoreInfo.overtimePenalty > 0 && (
            <View style={styles.breakdownItem}>
              <Icon name="clock-alert" size={16} color={theme.colors.error} />
              <Text style={[styles.breakdownText, styles.penaltyText]}>
                -{scoreInfo.overtimePenalty} overtime
              </Text>
            </View>
          )}
        </View>
        
        {/* Progress Bar to Daily Best */}
        {scoreInfo.allTimeHighScore > 0 && (
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>
              Personal Best: {scoreInfo.allTimeHighScore.toLocaleString()}
            </Text>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (scoreInfo.dailyScore / scoreInfo.allTimeHighScore) * 100)}%`,
                    backgroundColor: scoreInfo.dailyScore >= scoreInfo.allTimeHighScore 
                      ? theme.colors.success 
                      : theme.colors.primary
                  }
                ]}
              />
            </View>
            {scoreInfo.dailyScore >= scoreInfo.allTimeHighScore && (
              <Text style={styles.newRecordText}>🏆 NEW RECORD!</Text>
            )}
          </View>
        )}
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="fire" size={16} color="#FF9F1C" />
            <Text style={styles.statValue}>{scoreInfo.currentStreak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="calendar-check" size={16} color="#4CAF50" />
            <Text style={styles.statValue}>{scoreInfo.totalDaysPlayed}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="chart-line" size={16} color="#2196F3" />
            <Text style={styles.statValue}>{scoreInfo.weeklyAverage}</Text>
            <Text style={styles.statLabel}>Avg</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    ...theme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  resetTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  negativeScore: {
    color: theme.colors.error,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  breakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  breakdownText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  penaltyText: {
    color: theme.colors.error,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  newRecordText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
});

export default DailyScoreCard;