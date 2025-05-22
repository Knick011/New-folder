// src/components/common/ScoreDisplay.js
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../styles/theme';

/**
 * Component to display score, streak, and milestone progress
 */
const ScoreDisplay = ({ 
  score = 0,
  streak = 0,
  animate = false,
  showStreak = true,
  showMilestoneProgress = true,
  milestoneEvery = 5,
  variant = 'horizontal', // 'horizontal', 'vertical', 'compact'
  onMilestoneReached = null,
  style
}) => {
  // Animation values
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const streakAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Format large numbers with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Calculate streak milestone progress
  const streakProgress = (streak % milestoneEvery) / milestoneEvery;
  const nextMilestone = Math.floor(streak / milestoneEvery + 1) * milestoneEvery;
  const atMilestone = streak > 0 && streak % milestoneEvery === 0;
  
  // Update animations when props change
  useEffect(() => {
    if (animate) {
      // Animate score counting up
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
      
      // Pulse animation for streak
      Animated.sequence([
        Animated.timing(streakAnim, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(2)),
        }),
        Animated.timing(streakAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: streakProgress,
        duration: 600,
        useNativeDriver: false, // Using width interpolation
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      // Set values immediately without animation
      scoreAnim.setValue(1);
      streakAnim.setValue(1);
      progressAnim.setValue(streakProgress);
    }
    
    // Notify when milestone reached
    if (atMilestone && onMilestoneReached) {
      onMilestoneReached(streak);
    }
  }, [score, streak, animate]);
  
  // Render based on variant
  const renderHorizontal = () => (
    <View style={[styles.container, styles.horizontal, style]}>
      {/* Score */}
      <View style={styles.scoreContainer}>
        <Icon name="star" size={20} color={theme.colors.warning} style={styles.scoreIcon} />
        <Animated.Text 
          style={[
            styles.scoreText,
            { opacity: scoreAnim }
          ]}
        >
          {formatNumber(score)}
        </Animated.Text>
      </View>
      
      {/* Streak */}
      {showStreak && (
        <Animated.View 
          style={[
            styles.streakContainer,
            { 
              transform: [{ scale: streakAnim }],
              backgroundColor: atMilestone ? theme.colors.warning : 'white'
            }
          ]}
        >
          <Icon 
            name="fire" 
            size={16} 
            color={atMilestone ? 'white' : theme.colors.primary} 
          />
          <Text 
            style={[
              styles.streakText,
              atMilestone && { color: 'white' }
            ]}
          >
            {streak}
          </Text>
        </Animated.View>
      )}
      
      {/* Milestone Progress Bar */}
      {showMilestoneProgress && streak > 0 && (
        <View style={styles.progressContainer}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }),
                backgroundColor: streak % milestoneEvery === 0 
                  ? theme.colors.warning 
                  : theme.colors.primary
              }
            ]}
          />
          <Text style={styles.nextMilestoneText}>
            {streak % milestoneEvery === 0 ? 'Milestone!' : `${nextMilestone}`}
          </Text>
        </View>
      )}
    </View>
  );
  
  const renderVertical = () => (
    <View style={[styles.container, styles.vertical, style]}>
      {/* Score */}
      <View style={styles.scoreContainerVertical}>
        <Icon name="star" size={24} color={theme.colors.warning} style={styles.scoreIcon} />
        <Animated.Text 
          style={[
            styles.scoreTextLarge,
            { opacity: scoreAnim }
          ]}
        >
          {formatNumber(score)}
        </Animated.Text>
      </View>
      
      {/* Streak */}
      {showStreak && (
        <View style={styles.streakSection}>
          <Text style={styles.sectionLabel}>STREAK</Text>
          <Animated.View 
            style={[
              styles.streakContainerLarge,
              { 
                transform: [{ scale: streakAnim }],
                backgroundColor: atMilestone ? theme.colors.warning : 'white'
              }
            ]}
          >
            <Icon 
              name="fire" 
              size={20} 
              color={atMilestone ? 'white' : theme.colors.primary} 
            />
            <Text 
              style={[
                styles.streakTextLarge,
                atMilestone && { color: 'white' }
              ]}
            >
              {streak}
            </Text>
          </Animated.View>
          
          {/* Milestone Progress Bar */}
          {showMilestoneProgress && (
            <View style={styles.progressContainerVertical}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: streak % milestoneEvery === 0 
                      ? theme.colors.warning 
                      : theme.colors.primary
                  }
                ]}
              />
              <Text style={styles.nextMilestoneText}>
                {streak % milestoneEvery === 0 
                  ? 'Milestone!' 
                  : `Next: ${nextMilestone}`}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
  
  const renderCompact = () => (
    <View style={[styles.container, styles.compact, style]}>
      <View style={styles.compactRow}>
        {/* Score */}
        <View style={styles.scoreContainerCompact}>
          <Icon name="star" size={14} color={theme.colors.warning} style={styles.scoreIcon} />
          <Animated.Text 
            style={[
              styles.scoreTextCompact,
              { opacity: scoreAnim }
            ]}
          >
            {formatNumber(score)}
          </Animated.Text>
        </View>
        
        {/* Streak */}
        {showStreak && (
          <Animated.View 
            style={[
              styles.streakContainerCompact,
              { 
                transform: [{ scale: streakAnim }],
                backgroundColor: atMilestone ? theme.colors.warning : 'white'
              }
            ]}
          >
            <Icon 
              name="fire" 
              size={12} 
              color={atMilestone ? 'white' : theme.colors.primary} 
            />
            <Text 
              style={[
                styles.streakTextCompact,
                atMilestone && { color: 'white' }
              ]}
            >
              {streak}
            </Text>
          </Animated.View>
        )}
      </View>
      
      {/* Compact Progress Bar */}
      {showMilestoneProgress && showStreak && (
        <View style={styles.progressContainerCompact}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }),
                backgroundColor: streak % milestoneEvery === 0 
                  ? theme.colors.warning 
                  : theme.colors.primary
              }
            ]}
          />
        </View>
      )}
    </View>
  );
  
  // Return the appropriate variant
  switch(variant) {
    case 'vertical':
      return renderVertical();
    case 'compact':
      return renderCompact();
    default:
      return renderHorizontal();
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  vertical: {
    padding: theme.spacing.md,
  },
  compact: {
    padding: theme.spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  scoreContainerVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  scoreContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  scoreIcon: {
    marginRight: theme.spacing.xs,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    color: theme.colors.textDark,
  },
  scoreTextLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    color: theme.colors.textDark,
  },
  scoreTextCompact: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    color: theme.colors.textDark,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: theme.spacing.md,
    ...theme.shadows.sm,
  },
  streakContainerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  streakContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 6,
    ...theme.shadows.sm,
  },
  streakText: {
    marginLeft: 4,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
    color: theme.colors.textDark,
  },
  streakTextLarge: {
    marginLeft: 6,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    color: theme.colors.textDark,
  },
  streakTextCompact: {
    marginLeft: 2,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: theme.fonts.bold,
    color: theme.colors.textDark,
  },
  streakSection: {
    marginTop: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressContainerVertical: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressContainerCompact: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  nextMilestoneText: {
    position: 'absolute',
    right: 0,
    top: 8,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});

export default ScoreDisplay;