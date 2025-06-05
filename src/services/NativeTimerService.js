// src/services/NativeTimerService.js
import { NativeModules, NativeEventEmitter, Platform, AppState, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { BrainBitesTimer } = NativeModules;

class NativeTimerService {
  constructor() {
    this.listeners = [];
    this.remainingTime = 0;
    this.isTracking = false;
    this.isAppForeground = true;
    this.eventEmitter = null;
    this.subscription = null;
    this.appStateSubscription = null;
    
    if (Platform.OS === 'android' && BrainBitesTimer) {
      this.eventEmitter = new NativeEventEmitter(BrainBitesTimer);
      this.initialize();
    }
  }
  
  async initialize() {
    console.log('Initializing Native Timer Service');
    
    // Request notification permission for Android 13+
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'BrainBites needs notification permission to show remaining time',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        console.log('Notification permission:', granted);
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
    
    // Start listening to native timer updates
    if (BrainBitesTimer) {
      BrainBitesTimer.startListening();
      
      this.subscription = this.eventEmitter.addListener('timerUpdate', (data) => {
        this.handleTimerUpdate(data);
      });
      
      // Get initial time
      this.loadSavedTime();
    }
    
    // Listen to app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }
  
  handleTimerUpdate = (data) => {
    this.remainingTime = data.remainingTime || 0;
    this.isTracking = data.isTracking || false;
    this.isAppForeground = data.isAppForeground || false;
    
    // Notify all listeners
    this._notifyListeners('timeUpdate', {
      remaining: this.remainingTime,
      isTracking: this.isTracking,
      isAppForeground: this.isAppForeground
    });
    
    // Check for time expiration
    if (this.remainingTime <= 0 && this.isTracking) {
      this._notifyListeners('timeExpired', {});
    }
  }
  
  handleAppStateChange = (nextAppState) => {
    // App state is handled by native code, but we can use this for any React-side logic
    console.log('App state changed to:', nextAppState);
  }
  
  async loadSavedTime() {
    try {
      if (BrainBitesTimer) {
        const time = await BrainBitesTimer.getRemainingTime();
        this.remainingTime = time;
        this._notifyListeners('timeLoaded', { availableTime: time });
        return time;
      }
    } catch (error) {
      console.error('Error loading saved time:', error);
    }
    return 0;
  }
  
  // Add time credits (for rewards)
  async addTimeCredits(seconds) {
    if (Platform.OS === 'android' && BrainBitesTimer) {
      BrainBitesTimer.addTime(seconds);
      this.remainingTime += seconds;
      this._notifyListeners('creditsAdded', { 
        seconds, 
        newTotal: this.remainingTime 
      });
    } else {
      // Fallback to JS implementation for iOS
      const TimerService = require('./TimerService').default;
      TimerService.addTimeCredits(seconds);
    }
  }
  
  // Get current available time
  getAvailableTime() {
    return this.remainingTime;
  }
  
  // Format time
  formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    } else {
      return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
  }
  
  // Start tracking (for manual control)
  startTracking() {
    if (Platform.OS === 'android' && BrainBitesTimer) {
      BrainBitesTimer.startTracking();
    }
  }
  
  // Stop tracking (for manual control)
  stopTracking() {
    if (Platform.OS === 'android' && BrainBitesTimer) {
      BrainBitesTimer.stopTracking();
    }
  }
  
  // Add event listener
  addEventListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  // Notify listeners
  _notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      listener({ event, ...data });
    });
  }
  
  // Get tracking status
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      isBrainBitesActive: this.isAppForeground,
      availableTime: this.remainingTime,
      platform: Platform.OS
    };
  }
  
  // Get debug info
  getDebugInfo() {
    return {
      availableTime: this.remainingTime,
      formattedTime: this.formatTime(this.remainingTime),
      isRunning: this.isTracking,
      isBrainBitesActive: this.isAppForeground,
      platform: Platform.OS,
      hasNativeModule: !!BrainBitesTimer
    };
  }
  
  // Cleanup
  cleanup() {
    if (this.subscription) {
      this.subscription.remove();
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (BrainBitesTimer) {
      BrainBitesTimer.stopListening();
    }
  }
}

export default new NativeTimerService();