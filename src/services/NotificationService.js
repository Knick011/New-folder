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
          channelName: "BrainBites - CaBBy's Messages",
          channelDescription: "Fun reminders from CaBBy to keep your brain growing!",
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
          lightColor: '#FF9F1C',
          enableLights: true,
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
    
    const fireDate = new Date(Date.now() + (timeUntilInSeconds * 1000));
    const notificationId = `time-warning-${minutes}`;
    
    console.log(`Scheduling ${minutes} minute warning for:`, fireDate.toLocaleTimeString());
    
    PushNotification.localNotificationSchedule({
      channelId: 'brainbites-local',
      title: `⏱️ CaBBy Says: Time Check!`,
      message: `Whoa! Only ${minutes} minute${minutes !== 1 ? 's' : ''} left! Time to power up with more quizzes! 🧠✨`,
      date: fireDate,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
      userInfo: {
        id: notificationId,
        type: 'time-warning',
        minutesRemaining: minutes
      },
      autoCancel: true,
      
      // Theme color integration
      color: '#FF9F1C', // Primary orange theme color
      smallIcon: 'ic_notification',
      
      // Enhanced styling with theme colors
      style: 'bigPicture',
      picture: 'cabby_excited_large_cropped',
      lights: true,
      lightColor: '#FF9F1C',
      vibrationPattern: [100, 50, 100],
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
    
    PushNotification.localNotification({
      channelId: 'brainbites-local',
      title: '🎯 CaBBy Needs You!',
      message: 'Your earned time is up! Come back and challenge your brain to unlock more screen time! 🌟',
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
      userInfo: {
        type: 'time-expired'
      },
      autoCancel: true,
      
      // Theme color integration
      color: '#FF9F1C', // Primary orange theme color
      smallIcon: 'ic_notification',
      
      // Enhanced styling with theme colors
      style: 'bigPicture',
      picture: 'cabby_sad_large_cropped',
      lights: true,
      lightColor: '#FF9F1C',
      vibrationPattern: [200, 100, 200, 100, 200],
    });
    
    this.lastNotificationDate = new Date();
    this.saveSettings();
    
    console.log('✓ Time expired notification sent');
  }
  
  // Show notification when user starts losing points
  showOvertimePenaltyNotification(pointsLost) {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Penalty notification disabled or not initialized');
      return;
    }
    
    console.log('Showing overtime penalty notification');
    
    PushNotification.localNotification({
      channelId: 'brainbites-local',
      title: '⚠️ CaBBy is Worried!',
      message: `Oh no! You've lost ${pointsLost} points from overtime. Quick - answer some quizzes to stop the penalty! 💪`,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
      userInfo: {
        type: 'penalty-warning',
        pointsLost: pointsLost
      },
      autoCancel: true,
      
      // Theme color with warning tint
      color: '#FFCC00', // Warning yellow from theme
      smallIcon: 'ic_notification',
      
      // Enhanced styling with warning colors
      style: 'bigPicture',
      picture: 'cabby_depressed_large_cropped',
      lights: true,
      lightColor: '#FFCC00',
      vibrationPattern: [100, 100, 100, 100, 100],
    });
    
    this.lastNotificationDate = new Date();
    this.saveSettings();
    
    console.log('✓ Penalty notification sent');
  }
  
  // Schedule a reminder to earn more time
  scheduleEarnTimeReminder(hoursFromNow = 8) {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Earn time reminder disabled or not initialized');
      return;
    }
    
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
    
    PushNotification.localNotificationSchedule({
      channelId: 'brainbites-local',
      title: "🎮 CaBBy's Power-Up Time!",
      message: "Hey superstar! Ready to boost your brain and unlock more app time? Let's make learning fun! 🚀✨",
      date: fireDate,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'earn-reminder'
      },
      autoCancel: true,
      
      // Theme color integration
      color: '#FF9F1C', // Primary orange theme color
      smallIcon: 'ic_notification',
      
      // Enhanced styling with theme colors
      style: 'bigPicture',
      picture: 'cabby_happy_large_cropped',
      lights: true,
      lightColor: '#FF9F1C',
      vibrationPattern: [150, 75, 150],
    });
    
    console.log(`✓ Scheduled earn time reminder in ${hoursFromNow} hours`);
  }
  
  // Schedule a streak reminder
  scheduleStreakReminder() {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Streak reminder disabled or not initialized');
      return;
    }
    
    if (this.lastNotificationDate) {
      const today = new Date().toDateString();
      const lastDate = new Date(this.lastNotificationDate).toDateString();
      
      if (today === lastDate) {
        console.log('Skipping streak reminder - sent one today');
        return;
      }
    }
    
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(19, 0, 0, 0); // 7 PM
    
    if (now > reminderTime) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    console.log(`Scheduling streak reminder for:`, reminderTime.toLocaleString());
    
    PushNotification.localNotificationSchedule({
      channelId: 'brainbites-local',
      title: "🔥 CaBBy's Streak Alert!",
      message: "Don't break the chain! Your brain is on fire! One quiz keeps your amazing streak alive! 💪🌟",
      date: reminderTime,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'streak-reminder'
      },
      autoCancel: true,
      
      // Theme color with success tint
      color: '#4CD964', // Success green from theme
      smallIcon: 'ic_notification',
      
      // Enhanced styling with success colors
      style: 'bigPicture',
      picture: 'cabby_gamemode_large_cropped',
      lights: true,
      lightColor: '#4CD964',
      vibrationPattern: [100, 50, 100, 50, 100],
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
      title: '🏆 CaBBy is SO Proud!',
      message: `WOW! You hit ${milestone} correct answers! Your brain is growing stronger! Keep being awesome! 🎊🧠`,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'milestone',
        milestone: milestone
      },
      autoCancel: true,
      
      // Theme color with celebration tint
      color: '#5D9CEC', // Accent blue from theme
      smallIcon: 'ic_notification',
      
      // Enhanced styling with celebration colors
      style: 'bigPicture',
      picture: 'cabby_excited_large_cropped',
      lights: true,
      lightColor: '#5D9CEC',
      vibrationPattern: [100, 100, 100, 100, 200],
    });
    
    this.lastNotificationDate = new Date();
    this.saveSettings();
    
    console.log('✓ Milestone notification sent');
  }
  
  // Show encouragement when user gets wrong answers
  showEncouragementNotification() {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Encouragement notification disabled or not initialized');
      return;
    }
    
    console.log('Showing encouragement notification');
    
    PushNotification.localNotification({
      channelId: 'brainbites-local',
      title: '💪 CaBBy Believes in You!',
      message: "Wrong answers don't hurt your score - they're just stepping stones to greatness! Keep going! ✨",
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'encouragement'
      },
      autoCancel: true,
      
      // Theme color integration
      color: '#FF9F1C', // Primary orange theme color
      smallIcon: 'ic_notification',
      
      // Enhanced styling with theme colors
      style: 'bigPicture',
      picture: 'cabby_happy_large_cropped',
      lights: true,
      lightColor: '#FF9F1C',
      vibrationPattern: [150, 75, 150],
    });
    
    this.lastNotificationDate = new Date();
    this.saveSettings();
    
    console.log('✓ Encouragement notification sent');
  }
  
  // Show daily welcome back notification
  showDailyWelcomeNotification() {
    if (!this.notificationsEnabled || !this.isInitialized) {
      console.log('Daily welcome notification disabled or not initialized');
      return;
    }
    
    console.log('Showing daily welcome notification');
    
    PushNotification.localNotification({
      channelId: 'brainbites-local',
      title: '🌅 Good Morning from CaBBy!',
      message: "Ready for another amazing day of learning? Let's earn some app time and make your brain stronger! ☀️",
      playSound: true,
      soundName: 'default',
      vibrate: true,
      userInfo: {
        type: 'daily-welcome'
      },
      autoCancel: true,
      
      // Theme color integration
      color: '#FFB347', // Secondary orange from theme
      smallIcon: 'ic_notification',
      
      // Enhanced styling with theme colors
      style: 'bigPicture',
      picture: 'cabby_excited_large_cropped',
      lights: true,
      lightColor: '#FFB347',
      vibrationPattern: [100, 50, 100],
    });
    
    this.lastNotificationDate = new Date();
    this.saveSettings();
    
    console.log('✓ Daily welcome notification sent');
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