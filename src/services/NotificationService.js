import { Platform } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set up PushNotification configuration
PushNotification.configure({
  // (required) Called when a remote is received or opened, or local notification is opened
  onNotification: function (notification) {
    // Process the notification
    console.log('NOTIFICATION:', notification);
    
    // Required on iOS only
    if (Platform.OS === 'ios') {
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    }
  },
  
  // IOS ONLY (optional): default: all - Permissions to register.
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
  
  popInitialNotification: true,
  requestPermissions: Platform.OS === 'ios',
});

// Create a channel for Android
if (Platform.OS === 'android') {
  PushNotification.createChannel(
    {
      channelId: 'brainbites-time-channel',
      channelName: 'BrainBites Time Notifications',
      channelDescription: 'Notifications about your screen time',
      playSound: true,
      soundName: 'default',
      importance: 4, // High importance
      vibrate: true,
    },
    (created) => console.log(`Channel created: ${created}`)
  );
  
  PushNotification.createChannel(
    {
      channelId: 'brainbites-reminder-channel',
      channelName: 'BrainBites Reminders',
      channelDescription: 'Reminders to earn more screen time',
      playSound: true,
      soundName: 'default',
      importance: 3, // Default importance
      vibrate: true,
    },
    (created) => console.log(`Channel created: ${created}`)
  );
}

class NotificationService {
  constructor() {
    this.lastNotificationDate = null;
    this.STORAGE_KEY = 'brainbites_notification_data';
    this.notificationsEnabled = true;
    
    // Load settings
    this.loadSettings();
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
  }
  
  // Schedule a notification for low time remaining
  scheduleLowTimeNotification(minutes, timeUntilInSeconds) {
    if (!this.notificationsEnabled) return;
    
    // Convert seconds to milliseconds
    const timeUntilInMs = timeUntilInSeconds * 1000;
    
    // Generate ID based on minutes remaining
    const id = `time-${minutes}`;
    
    // Schedule the notification
    PushNotification.localNotificationSchedule({
      id,
      channelId: 'brainbites-time-channel',
      title: `Screen Time Alert ⏰`,
      message: `You have ${minutes} minute${minutes !== 1 ? 's' : ''} of screen time remaining.`,
      date: new Date(Date.now() + timeUntilInMs),
      allowWhileIdle: true,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
    });
    
    console.log(`Scheduled ${minutes} minute notification in ${timeUntilInSeconds} seconds`);
  }
  
  // Show notification when time is expired
  showTimeExpiredNotification() {
    if (!this.notificationsEnabled) return;
    
    PushNotification.localNotification({
      channelId: 'brainbites-time-channel',
      title: 'Screen Time Expired ⌛',
      message: 'Your screen time has run out. Complete quizzes to earn more time!',
      playSound: true,
      soundName: 'default',
      vibrate: true,
      importance: 'high',
      priority: 'high',
    });
    
    this.lastNotificationDate = new Date();
    this.saveSettings();
  }
  
  // Schedule a reminder to earn more time
  scheduleEarnTimeReminder(hoursFromNow = 8) {
    if (!this.notificationsEnabled) return;
    
    // Only schedule if we haven't sent a notification in the last 4 hours
    if (this.lastNotificationDate) {
      const hoursSinceLastNotification = 
        (Date.now() - new Date(this.lastNotificationDate).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastNotification < 4) {
        console.log('Skipping reminder - sent one recently');
        return;
      }
    }
    
    // Schedule the notification
    PushNotification.localNotificationSchedule({
      channelId: 'brainbites-reminder-channel',
      title: 'Time to Learn! 📚',
      message: 'Complete quizzes to earn more screen time for your favorite apps!',
      date: new Date(Date.now() + (hoursFromNow * 60 * 60 * 1000)),
      allowWhileIdle: true,
      playSound: true,
      soundName: 'default',
      vibrate: true,
    });
    
    console.log(`Scheduled reminder notification in ${hoursFromNow} hours`);
  }
  
  // Schedule a streak reminder
  scheduleStreakReminder() {
    if (!this.notificationsEnabled) return;
    
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
    
    // Schedule the notification
    PushNotification.localNotificationSchedule({
      channelId: 'brainbites-reminder-channel',
      title: 'Keep Your Streak Going! 🔥',
      message: 'Complete a quiz today to maintain your learning streak!',
      date: reminderTime,
      allowWhileIdle: true,
      playSound: true,
      soundName: 'default',
      vibrate: true,
    });
    
    console.log(`Scheduled streak reminder for ${reminderTime.toString()}`);
  }
  
  // Show a notification for a new milestone reached
  showMilestoneNotification(milestone) {
    if (!this.notificationsEnabled) return;
    
    PushNotification.localNotification({
      channelId: 'brainbites-reminder-channel',
      title: 'New Milestone Achieved! 🎉',
      message: `Congratulations! You've reached a ${milestone} correct answer streak!`,
      playSound: true,
      soundName: 'default',
      vibrate: true,
    });
    
    this.lastNotificationDate = new Date();
    this.saveSettings();
  }
  
  // Cancel time-related notifications
  cancelTimeNotifications() {
    PushNotification.cancelLocalNotification('time-1');
    PushNotification.cancelLocalNotification('time-5');
  }
  
  // Cancel all notifications
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }
}

export default new NotificationService(); 