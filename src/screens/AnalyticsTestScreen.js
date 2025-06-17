// src/screens/AnalyticsTestScreen.js - For testing analytics
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnalyticsService from '../services/AnalyticsService';
import EnhancedTimerService from '../services/EnhancedTimerService';
import EnhancedScoreService from '../services/EnhancedScoreService';

const AnalyticsTestScreen = () => {
  const [lastEvent, setLastEvent] = useState('No events tracked yet');

  const trackEvent = async (eventName, params = {}) => {
    try {
      await AnalyticsService.trackQuizEvent(eventName, params);
      setLastEvent(`Tracked: ${eventName}`);
      Alert.alert('Success', `Tracked event: ${eventName}`);
    } catch (error) {
      setLastEvent(`Error: ${error.message}`);
      Alert.alert('Error', `Failed to track event: ${error.message}`);
    }
  };

  const testScreenView = () => {
    AnalyticsService.trackScreen('AnalyticsTest');
    setLastEvent('Tracked: screen_view');
  };

  const testQuizAnswer = async () => {
    await trackEvent('answer_selected', {
      is_correct: true,
      category: 'test_category',
      time_to_answer: 5,
      current_streak: 3
    });
  };

  const testStreakMilestone = async () => {
    await trackEvent('streak_milestone', {
      streak_count: 10,
      category: 'test_category'
    });
  };

  const testTimeEarned = async () => {
    await trackEvent('time_earned', {
      seconds_earned: 60,
      method: 'test_bonus',
      total_time: 300
    });
  };

  const testDailyScore = async () => {
    await trackEvent('daily_score_update', {
      daily_score: 1000,
      questions_answered: 10,
      time_spent: 300
    });
  };

  const testUserEngagement = async () => {
    await trackEvent('session_complete', {
      session_duration: 600,
      questions_completed: 20
    });
  };

  const testAppLaunch = async () => {
    await trackEvent('app_launch', {
      is_first_launch: false
    });
  };

  const testSettingsChange = async () => {
    await trackEvent('settings_changed', {
      setting_name: 'test_setting',
      setting_value: 'test_value'
    });
  };

  const testError = async () => {
    await trackEvent('app_error', {
      error_type: 'test_error',
      error_message: 'Test error message',
      screen_name: 'AnalyticsTest'
    });
  };

  const testTimerEvents = async () => {
    await EnhancedTimerService.startTracking();
    setTimeout(async () => {
      await EnhancedTimerService.stopTracking();
    }, 2000);
  };

  const testScoreEvents = async () => {
    await EnhancedScoreService.updateScore(100, true, 'test_category');
    setTimeout(async () => {
      await EnhancedScoreService.applyOvertimePenalty(50);
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Icon name="google-analytics" size={32} color="#FF9F1C" />
          <Text style={styles.title}>Analytics Test</Text>
          <Text style={styles.subtitle}>Test various analytics events</Text>
        </View>

        <View style={styles.lastEventContainer}>
          <Text style={styles.lastEventLabel}>Last Event:</Text>
          <Text style={styles.lastEventText}>{lastEvent}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={testScreenView}>
            <Icon name="eye" size={24} color="white" />
            <Text style={styles.buttonText}>Test Screen View</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testQuizAnswer}>
            <Icon name="check-circle" size={24} color="white" />
            <Text style={styles.buttonText}>Test Quiz Answer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testStreakMilestone}>
            <Icon name="fire" size={24} color="white" />
            <Text style={styles.buttonText}>Test Streak Milestone</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testTimeEarned}>
            <Icon name="clock-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Test Time Earned</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testDailyScore}>
            <Icon name="star" size={24} color="white" />
            <Text style={styles.buttonText}>Test Daily Score</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testUserEngagement}>
            <Icon name="account-clock" size={24} color="white" />
            <Text style={styles.buttonText}>Test User Engagement</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testAppLaunch}>
            <Icon name="rocket-launch" size={24} color="white" />
            <Text style={styles.buttonText}>Test App Launch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testSettingsChange}>
            <Icon name="cog" size={24} color="white" />
            <Text style={styles.buttonText}>Test Settings Change</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testError}>
            <Icon name="alert-circle" size={24} color="white" />
            <Text style={styles.buttonText}>Test Error</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testTimerEvents}>
            <Icon name="timer" size={24} color="white" />
            <Text style={styles.buttonText}>Test Timer Events</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testScoreEvents}>
            <Icon name="scoreboard" size={24} color="white" />
            <Text style={styles.buttonText}>Test Score Events</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5B4',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3142',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  lastEventContainer: {
    padding: 15,
    backgroundColor: '#FFE5B4',
    margin: 15,
    borderRadius: 10,
  },
  lastEventLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3142',
  },
  lastEventText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  buttonContainer: {
    padding: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9F1C',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
  },
});

export default AnalyticsTestScreen; 