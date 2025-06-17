import analytics from '@react-native-firebase/analytics';

class AnalyticsService {
  constructor() {
    this.isEnabled = true;
  }

  // Initialize analytics
  async initialize() {
    try {
      await analytics().setAnalyticsCollectionEnabled(true);
      console.log('Analytics initialized successfully');
      
      // Set default user properties
      await analytics().setUserProperty('app_version', '1.0.0');
      
      return true;
    } catch (error) {
      console.error('Error initializing analytics:', error);
      return false;
    }
  }

  // Track screen views
  async trackScreen(screenName, screenClass = null) {
    if (!this.isEnabled) return;
    
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
      console.log(`Tracked screen: ${screenName}`);
    } catch (error) {
      console.error('Error tracking screen:', error);
    }
  }

  // Track quiz events
  async trackQuizEvent(eventName, parameters = {}) {
    if (!this.isEnabled) return;
    
    try {
      await analytics().logEvent(eventName, {
        ...parameters,
        timestamp: Date.now(),
      });
      console.log(`Tracked quiz event: ${eventName}`, parameters);
    } catch (error) {
      console.error('Error tracking quiz event:', error);
    }
  }

  // Track answer selection
  async trackAnswerSelected(isCorrect, category, timeToAnswer, currentStreak) {
    await this.trackQuizEvent('answer_selected', {
      is_correct: isCorrect,
      category: category,
      time_to_answer: Math.round(timeToAnswer),
      current_streak: currentStreak,
    });
  }

  // Track streak milestones
  async trackStreakMilestone(streakCount, category) {
    await this.trackQuizEvent('streak_milestone', {
      streak_count: streakCount,
      category: category,
    });
  }

  // Track time earned
  async trackTimeEarned(secondsEarned, method, totalTime) {
    await this.trackQuizEvent('time_earned', {
      seconds_earned: secondsEarned,
      method: method, // 'correct_answer', 'streak_bonus'
      total_time: totalTime,
    });
  }

  // Track daily score
  async trackDailyScore(score, questionsAnswered, timeSpent) {
    await this.trackQuizEvent('daily_score_update', {
      daily_score: score,
      questions_answered: questionsAnswered,
      time_spent: Math.round(timeSpent),
    });
  }

  // Track user engagement
  async trackUserEngagement(sessionDuration, questionsCompleted) {
    await this.trackQuizEvent('session_complete', {
      session_duration: Math.round(sessionDuration),
      questions_completed: questionsCompleted,
    });
  }

  // Track app launches
  async trackAppLaunch(isFirstLaunch = false) {
    await this.trackQuizEvent('app_launch', {
      is_first_launch: isFirstLaunch,
    });
  }

  // Track settings changes
  async trackSettingsChange(setting, value) {
    await this.trackQuizEvent('settings_changed', {
      setting_name: setting,
      setting_value: value.toString(),
    });
  }

  // Track errors
  async trackError(errorType, errorMessage, screenName) {
    await this.trackQuizEvent('app_error', {
      error_type: errorType,
      error_message: errorMessage,
      screen_name: screenName,
    });
  }

  // Set user properties
  async setUserProperty(name, value) {
    if (!this.isEnabled) return;
    
    try {
      await analytics().setUserProperty(name, value.toString());
      console.log(`Set user property: ${name} = ${value}`);
    } catch (error) {
      console.error('Error setting user property:', error);
    }
  }

  // Toggle analytics (for privacy)
  async toggleAnalytics(enabled) {
    this.isEnabled = enabled;
    await analytics().setAnalyticsCollectionEnabled(enabled);
    console.log(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export default new AnalyticsService(); 