// src/services/TimerService.js - COMPLETE REPLACEMENT
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform, NativeModules } from 'react-native';
import NotificationService from './NotificationService';

const { BrainBitesTimer } = NativeModules;

class TimerService {
  constructor() {
    this.availableTime = 0; // in seconds
    this.isAppRunning = false;
    this.timer = null;
    this.startTime = null;
    this.listeners = [];
    this.STORAGE_KEY = 'brainbites_timer_data';
    this.appState = 'active';
    this.sessionStartTime = null;
    this.pausedTime = 0;
    this.pauseStartTime = null;
    this.appStateSubscription = null;
    this.isBackgroundTracking = false;
    this.backgroundStartTime = null;
    
    // Initialize
    this.loadSavedTime();
    this.setupAppStateListener();
    this.setupNativeTimer();
  }
  
  setupNativeTimer() {
    if (Platform.OS === 'android' && BrainBitesTimer) {
      console.log('Using native Android timer service');
      this.useNativeTimer = true;
    } else {
      console.log('Using JavaScript timer service');
      this.useNativeTimer = false;
    }
  }
  
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
  }
  
  _handleAppStateChange = (nextAppState) => {
    console.log(`App state changed: ${this.appState} -> ${nextAppState}`);
    
    if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App going to background - start time tracking
      this._startBackgroundTracking();
    } else if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App coming to foreground - stop time tracking
      this._stopBackgroundTracking();
    }
    
    this.appState = nextAppState;
  }
  
  _startBackgroundTracking() {
    if (this.availableTime <= 0 || this.isBackgroundTracking) {
      return;
    }
    
    console.log('Starting background time tracking');
    this.isBackgroundTracking = true;
    this.backgroundStartTime = Date.now();
    
    if (this.useNativeTimer && BrainBitesTimer) {
      // Use native Android service
      BrainBitesTimer.setScreenTime(this.availableTime);
      BrainBitesTimer.startTracking();
    } else {
      // Use JavaScript timer
      this._startJSTimer();
    }
    
    // Schedule notifications
    this._scheduleNotifications();
    
    this._notifyListeners('trackingStarted', { availableTime: this.availableTime });
  }
  
  _stopBackgroundTracking() {
    if (!this.isBackgroundTracking) {
      return;
    }
    
    console.log('Stopping background time tracking');
    
    if (this.useNativeTimer && BrainBitesTimer) {
      // Get updated time from native service
      BrainBitesTimer.getRemainingTime().then(time => {
        this.availableTime = time;
        this.saveTimeData();
        this._notifyListeners('timeUpdate', { remaining: this.availableTime });
      });
      BrainBitesTimer.stopTracking();
    } else {
      // Calculate time spent in background
      if (this.backgroundStartTime) {
        const timeSpent = Math.floor((Date.now() - this.backgroundStartTime) / 1000);
        this.availableTime = Math.max(0, this.availableTime - timeSpent);
        console.log(`Time spent in background: ${timeSpent}s, remaining: ${this.availableTime}s`);
      }
      this._stopJSTimer();
    }
    
    this.isBackgroundTracking = false;
    this.backgroundStartTime = null;
    
    // Cancel notifications
    try {
      NotificationService.cancelTimeNotifications();
    } catch (error) {
      console.log('Notification error (simulator):', error.message);
    }
    
    this.saveTimeData();
    this._notifyListeners('trackingStopped', { availableTime: this.availableTime });
  }
  
  _startJSTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.timer = setInterval(() => {
      if (this.availableTime > 0) {
        this.availableTime--;
        this._notifyListeners('timeUpdate', { remaining: this.availableTime });
        
        if (this.availableTime <= 0) {
          this._handleTimeExpired();
        }
        
        // Save every 30 seconds
        if (this.availableTime % 30 === 0) {
          this.saveTimeData();
        }
      }
    }, 1000);
  }
  
  _stopJSTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  
  _scheduleNotifications() {
    try {
      if (this.availableTime > 300) { // 5 minutes
        NotificationService.scheduleLowTimeNotification(5, this.availableTime - 300);
      }
      if (this.availableTime > 60) { // 1 minute
        NotificationService.scheduleLowTimeNotification(1, this.availableTime - 60);
      }
    } catch (error) {
      console.log('Notification scheduling error:', error.message);
    }
  }
  
  _handleTimeExpired() {
    console.log('Time has expired!');
    this._stopBackgroundTracking();
    
    try {
      NotificationService.showTimeExpiredNotification();
    } catch (error) {
      console.log('Notification error:', error.message);
    }
    
    this._notifyListeners('timeExpired', {});
  }
  
  async loadSavedTime() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        this.availableTime = parsedData.availableTime || 0;
        
        // Handle case where app was closed during background tracking
        if (parsedData.wasBackgroundTracking && parsedData.backgroundStartTime) {
          const timeSpentClosed = Math.floor((Date.now() - parsedData.backgroundStartTime) / 1000);
          this.availableTime = Math.max(0, this.availableTime - timeSpentClosed);
          console.log(`Adjusted time for ${timeSpentClosed}s spent while app was closed`);
        }
      }
      
      console.log('Loaded saved time:', this.availableTime);
      this._notifyListeners('timeLoaded', { availableTime: this.availableTime });
      return this.availableTime;
    } catch (error) {
      console.error('Error loading saved time:', error);
      return 0;
    }
  }
  
  async saveTimeData() {
    try {
      const data = {
        availableTime: this.availableTime,
        lastUpdated: new Date().toISOString(),
        wasBackgroundTracking: this.isBackgroundTracking,
        backgroundStartTime: this.backgroundStartTime,
        appState: this.appState
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving time data:', error);
    }
  }
  
  addTimeCredits(seconds) {
    console.log(`Adding ${seconds} seconds of screen time`);
    this.availableTime += seconds;
    
    // Update native service if using it
    if (this.useNativeTimer && BrainBitesTimer && this.isBackgroundTracking) {
      BrainBitesTimer.addTime(seconds);
    }
    
    this.saveTimeData();
    this._notifyListeners('creditsAdded', { seconds, newTotal: this.availableTime });
    return this.availableTime;
  }
  
  getAvailableTime() {
    return this.availableTime;
  }
  
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
  
  addEventListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  _notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      listener({ event, ...data });
    });
  }
  
  cleanup() {
    console.log('Cleaning up Timer Service');
    
    this._stopBackgroundTracking();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    if (this.useNativeTimer && BrainBitesTimer) {
      BrainBitesTimer.stopTracking();
    }
    
    try {
      NotificationService.cancelAllNotifications();
    } catch (error) {
      console.log('Notification cleanup error:', error.message);
    }
  }
}

export default new TimerService();