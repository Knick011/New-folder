// src/services/NotificationService.js - Local notifications only (no Firebase)
import { Platform, Alert } from 'react-native';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.lastNotificationDate = null;
    this.STORAGE_KEY = 'brainbites_notification_data';
    this.notificationsEnabled = true;
    this.isInitialized = false;
  }
  
  init() {
    if (this.isInitialized) {
      return;
    }
    // Initialize notifications
    this.initializeNotifications();
    this.loadSettings();
  }
  
  initializeNotifications() {
    // Configure PushNotification for LOCAL notifications only
    PushNotification.configure({
      // Called when a notification is opened
      onNotification: function (notification) {
        console.log('Notification received:', notification);
        
        // Handle notification tap
        if (notification.userInteraction) {
          console.log('User tapped notification');
        }
      },
      
      // No remote notifications - local only
      onRegistrationError: function(err) {
        console.log('Registration error (expected for local-only):', err);
      },
      
      // iOS permissions
      permissions: {
        alert: true,
        badge: false,
        sound: true,
      },
      
      // Don't pop initial notification
      popInitialNotification: false,
      
      // Request permissions on iOS
      requestPermissions: Platform.OS === 'ios',
    });
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'brainbites-local',
          channelName: 'BrainBites Local Notifications',
          channelDescription: 'Local notifications for screen time alerts',
          playSound: true,
          soundName: 'default',
          importance: 4, // High importance
          vibrate: true,
        },
        (created) => {
          console.log(`Local notification channel created: ${created}`);
          this.isInitialized = true;
        }
      );
    } else {
      // iOS doesn't need channels
      this.isInitialized = true;
    }
    
    console.log('Local notification service initialized');
  }
  
  async loadSettings() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        this.notificationsEnabled = parsedData.enabled !== false;
        this.lastNotificationDate = parsedData.lastNotificationDate;
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      const data = {
        enabled: this.notificationsEnabled,
        lastNotificationDate: this.lastNotificationDate,
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }
  
  // Toggle notifications on/off
  async toggleNotifications(enabled) {
    this.notificationsEnabled = enabled;
    await this.saveSettings();
    
    if (!enabled) {
      this.cancelAllNotifications();
    }
    
    console.log(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Schedule a local notification for low time remaining
  scheduleLowTimeNotification(minutes, timeUntilInSeconds) {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Notifications disabled or not initialized');
      return;
    }
    
    // Convert seconds to milliseconds for date calculation
    const fireDate = new Date(Date.now() + (timeUntilInSeconds * 1000));
    
    // Generate unique ID for this notification
    const notificationId = `time-warning-${minutes}`;
    
    console.log(`Scheduling ${minutes} minute warning for:`, fireDate.toLocaleTimeString());
    
    // Schedule the local notification
    PushNotification.localNotificationSchedule({
      // Android specific
      channelId: 'brainbites-local',
      
      // Notification content
      title: `⏰ Screen Time Alert`,
      message: `You have ${minutes} minute${minutes !== 1 ? 's' : ''} of screen time remaining.`,
      
      // When to fire
      date: fireDate,
      
      // Notification settings
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
      
      // Custom data
      userInfo: {
        id: notificationId,
        type: 'time-warning',
        minutesRemaining: minutes
      },
      
      // Auto cancel when tapped
      autoCancel: true,
      
      // Large icon for Android
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
    });
    
    console.log(`✓ Scheduled ${minutes} minute notification (ID: ${notificationId})`);
  }
  
  // Show immediate notification when time expires
  showTimeExpiredNotification() {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Notifications disabled or not initialized');
      return;
    }
    
    console.log('Showing time expired notification');
    
    // Show immediate local notification
    PushNotification.localNotification({
      // Android specific
      channelId: 'brainbites-local',
      
      // Notification content
      title: '⌛ Screen Time Expired',
      message: 'Your screen time has run out. Complete quizzes to earn more time!',
      
      // Notification settings
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
      
      // Custom data
      userInfo: {
        type: 'time-expired'
      },
      
      // Auto cancel when tapped
      autoCancel: true,
      
      // Large icon for Android
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
    });
    
    // Update last notification time
    this.lastNotificationDate = new Date();
    this.saveSettings();
    
    console.log('✓ Time expired notification sent');
  }
  
  // Schedule a reminder to earn more time
  scheduleEarnTimeReminder(hoursFromNow = 8) {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Earn time reminder disabled or not initialized');
      return;
    }
    
    // Only schedule if we haven't sent a notification in the last 4 hours
    if (this.lastNotificationDate) {
      const hoursSinceLastNotification = 
        (Date.now() - new Date(this.lastNotificationDate).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastNotification < 4) {
        console.log('Skipping earn time reminder - sent one recently');
        return;
      }
    }
    
    const fireDate = new Date(Date.now() + (hoursFromNow * 60 * 60 * 1000));
    
    console.log(`Scheduling earn time reminder for:`, fireDate.toLocaleTimeString());
    
    // Schedule the reminder
    PushNotification.localNotificationSchedule({
      channelId: 'brainbites-local',
      title: '📚 Time to Learn!',
      message: 'Complete quizzes to earn more screen time for your favorite apps!',
      date: fireDate,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'earn-reminder'
      },
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
    });
    
    console.log(`✓ Scheduled earn time reminder in ${hoursFromNow} hours`);
  }
  
  // Schedule a streak reminder
  scheduleStreakReminder() {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Streak reminder disabled or not initialized');
      return;
    }
    
    // Only schedule if we haven't sent a notification today
    if (this.lastNotificationDate) {
      const today = new Date().toDateString();
      const lastDate = new Date(this.lastNotificationDate).toDateString();
      
      if (today === lastDate) {
        console.log('Skipping streak reminder - sent one today');
        return;
      }
    }
    
    // Schedule for 7 PM if it's before that, or tomorrow at 7 PM
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(19, 0, 0, 0); // 7 PM
    
    if (now > reminderTime) {
      // Set for tomorrow
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    console.log(`Scheduling streak reminder for:`, reminderTime.toLocaleString());
    
    // Schedule the notification
    PushNotification.localNotificationSchedule({
      channelId: 'brainbites-local',
      title: '🔥 Keep Your Streak Going!',
      message: 'Complete a quiz today to maintain your learning streak!',
      date: reminderTime,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'streak-reminder'
      },
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
    });
    
    console.log(`✓ Scheduled streak reminder`);
  }
  
  // Show a notification for a new milestone reached
  showMilestoneNotification(milestone) {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Milestone notification disabled or not initialized');
      return;
    }
    
    console.log(`Showing milestone notification for: ${milestone}`);
    
    PushNotification.localNotification({
      channelId: 'brainbites-local',
      title: '🎉 New Milestone Achieved!',
      message: `Congratulations! You've reached a ${milestone} correct answer streak!`,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'milestone',
        milestone: milestone
      },
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
    });
    
    this.lastNotificationDate = new Date();
    this.saveSettings();
    
    console.log('✓ Milestone notification sent');
  }
  
  // Cancel specific time-related notifications
  cancelTimeNotifications() {
    // Note: react-native-push-notification doesn't support canceling by custom ID easily
    // For local notifications, we'd need to track notification IDs ourselves
    // For now, we'll just log that we're canceling
    console.log('Canceling time-related notifications');
    
    // This cancels ALL scheduled notifications - not ideal but works for our use case
    PushNotification.cancelAllLocalNotifications();
  }
  
  // Cancel all local notifications
  cancelAllNotifications() {
    console.log('Canceling all local notifications');
    PushNotification.cancelAllLocalNotifications();
  }
  
  // Test notification (for development)
  testNotification() {
    if (!this.isInitialized) {
      console.log('Cannot test - notifications not initialized');
      return;
    }
    
    console.log('Sending test notification');
    
    PushNotification.localNotification({
      channelId: 'brainbites-local',
      title: '🧪 Test Notification',
      message: 'This is a test notification from BrainBites!',
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'test'
      },
      autoCancel: true,
    });
    
    console.log('✓ Test notification sent');
  }
}

export default new NotificationService(); 