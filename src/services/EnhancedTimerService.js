// src/services/EnhancedTimerService.js - Fixed version with original notifications
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';

class EnhancedTimerService {
  constructor() {
    this.availableTime = 0; // in seconds
    this.isRunning = false;
    this.timer = null;
    this.startTime = null;
    this.lastUpdateTime = null;
    this.listeners = [];
    this.STORAGE_KEY = 'brainbites_timer_data';
    this.appState = AppState.currentState;
    this.isBrainBitesActive = true;
    
    // Load saved data on initialization
    this.loadSavedTime();
    
    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
  }
  
  // Enhanced app state change handler
  _handleAppStateChange = (nextAppState) => {
    console.log('App state changed from', this.appState, 'to', nextAppState);
    const prevState = this.appState;
    this.appState = nextAppState;
    
    // App going to background - START tracking time
    if (prevState === 'active' && nextAppState.match(/inactive|background/)) {
      this.isBrainBitesActive = false;
      this._startTracking();
      console.log('App went to background - STARTING time tracking');
    } 
    // App coming to foreground - STOP tracking time
    else if (prevState.match(/inactive|background/) && nextAppState === 'active') {
      this.isBrainBitesActive = true;
      this._stopTracking();
      console.log('App came to foreground - STOPPING time tracking');
    }
  }
  
  // Start tracking time when app goes to background
  _startTracking() {
    // Only start if we have time and not already tracking
    if (this.availableTime > 0 && !this.isRunning) {
      this.isRunning = true;
      this.startTime = Date.now();
      this.lastUpdateTime = Date.now();
      
      // Update timer every second
      this.timer = setInterval(() => this._updateTime(), 1000);
      
      // Notify listeners
      this._notifyListeners('trackingStarted', { availableTime: this.availableTime });
      
      // Schedule notifications for low time warnings (only on real devices)
      try {
        this._scheduleTimeNotifications();
      } catch (error) {
        console.log('Notification scheduling skipped (likely AVD):', error.message);
      }
      
      console.log(`Started tracking ${this.availableTime} seconds of time`);
    } else {
      console.log('Cannot start tracking:', {
        hasTime: this.availableTime > 0,
        alreadyRunning: this.isRunning,
        availableTime: this.availableTime
      });
    }
  }
  
  // Stop tracking when app comes to foreground
  _stopTracking() {
    if (this.isRunning) {
      this.isRunning = false;
      
      // Clear the timer
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      
      // Update time one last time
      this._updateTime();
      
      // Cancel scheduled notifications since tracking is stopped
      try {
        NotificationService.cancelTimeNotifications();
      } catch (error) {
        console.log('Notification cancellation skipped (likely AVD):', error.message);
      }
      
      // Notify listeners
      this._notifyListeners('trackingStopped', { availableTime: this.availableTime });
      
      console.log(`Stopped tracking. Remaining time: ${this.availableTime} seconds`);
    }
  }
  
  // Update the time counter (decreases available time)
  _updateTime() {
    if (!this.isRunning || !this.startTime || this.isBrainBitesActive) return;
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastUpdateTime) / 1000);
    
    if (elapsedSeconds > 0) {
      // Decrease available time
      const previousTime = this.availableTime;
      this.availableTime = Math.max(0, this.availableTime - elapsedSeconds);
      
      console.log(`Time update: ${previousTime} -> ${this.availableTime} (spent ${elapsedSeconds}s)`);
      
      // Update last update time
      this.lastUpdateTime = now;
      
      // Notify listeners of time update
      this._notifyListeners('timeUpdate', { 
        remaining: this.availableTime,
        elapsed: elapsedSeconds,
        total: previousTime
      });
      
      // Check if time expired
      if (this.availableTime <= 0) {
        this._handleTimeExpired();
      }
      
      // Save time periodically (every 10 seconds)
      if (Math.floor((now - this.startTime) / 1000) % 10 === 0) {
        this.saveTimeData();
      }
    }
  }
  
  // Handle time expiration
  _handleTimeExpired() {
    console.log('Time expired!');
    this._stopTracking();
    this._notifyListeners('timeExpired');
    
    // Show time expired notification (try/catch for AVD)
    try {
      NotificationService.showTimeExpiredNotification();
    } catch (error) {
      console.log('Time expired notification skipped (likely AVD):', error.message);
    }
    
    // Save the expired state
    this.saveTimeData();
  }
  
  // Schedule low time notifications
  _scheduleTimeNotifications() {
    // Only schedule if we have time tracking active
    if (!this.isRunning) return;
    
    // Cancel any existing notifications first
    try {
      NotificationService.cancelTimeNotifications();
    } catch (error) {
      // Ignore errors on AVD
      return;
    }
    
    // Schedule notification at 5 minutes remaining
    if (this.availableTime > 300) {
      const timeUntil5Min = this.availableTime - 300; // seconds until 5 min remaining
      try {
        NotificationService.scheduleLowTimeNotification(5, timeUntil5Min);
        console.log(`Scheduled 5-minute warning in ${timeUntil5Min} seconds`);
      } catch (error) {
        console.log('5-minute notification scheduling failed (likely AVD)');
      }
    }
    
    // Schedule notification at 1 minute remaining
    if (this.availableTime > 60) {
      const timeUntil1Min = this.availableTime - 60; // seconds until 1 min remaining
      try {
        NotificationService.scheduleLowTimeNotification(1, timeUntil1Min);
        console.log(`Scheduled 1-minute warning in ${timeUntil1Min} seconds`);
      } catch (error) {
        console.log('1-minute notification scheduling failed (likely AVD)');
      }
    }
  }
  
  // Add time credits (rewards for correct answers)
  addTimeCredits(seconds) {
    this.availableTime += seconds;
    console.log(`Added ${seconds} seconds. New total: ${this.availableTime} seconds`);
    
    // If we're currently tracking and time was 0, restart tracking
    if (!this.isBrainBitesActive && !this.isRunning && this.availableTime > 0) {
      this._startTracking();
    }
    
    this.saveTimeData();
    this._notifyListeners('creditsAdded', { seconds, newTotal: this.availableTime });
    return this.availableTime;
  }
  
  // Get current available time
  getAvailableTime() {
    return this.availableTime;
  }
  
  // Load saved time from storage
  async loadSavedTime() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        this.availableTime = parsedData.availableTime || 0;
        
        console.log(`Loaded saved time: ${this.availableTime} seconds`);
        
        // If there was tracking active when app was closed, we need to account for elapsed time
        if (parsedData.wasTracking && parsedData.lastUpdateTime) {
          const timeSinceLastUpdate = Math.floor((Date.now() - parsedData.lastUpdateTime) / 1000);
          if (timeSinceLastUpdate > 0) {
            this.availableTime = Math.max(0, this.availableTime - timeSinceLastUpdate);
            console.log(`Adjusted for ${timeSinceLastUpdate}s elapsed since last update. New time: ${this.availableTime}s`);
          }
        }
      } else {
        console.log('No saved time data found');
      }
      
      // If app is not active and we have time, start tracking
      if (!this.isBrainBitesActive && this.availableTime > 0) {
        this._startTracking();
      }
      
      this._notifyListeners('timeLoaded', { availableTime: this.availableTime });
    } catch (error) {
      console.error('Error loading saved time:', error);
    }
  }
  
  // Save current time state to storage
  async saveTimeData() {
    try {
      const data = {
        availableTime: this.availableTime,
        lastUpdateTime: Date.now(),
        wasTracking: this.isRunning,
        lastSaved: new Date().toISOString()
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log(`Saved time data: ${this.availableTime} seconds`);
    } catch (error) {
      console.error('Error saving time data:', error);
    }
  }
  
  // Format seconds to MM:SS or HH:MM:SS
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
  
  // Add event listener
  addEventListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  // Notify all listeners
  _notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      listener({ event, ...data });
    });
  }
  
  // Get debug info
  getDebugInfo() {
    return {
      availableTime: this.availableTime,
      isRunning: this.isRunning,
      isBrainBitesActive: this.isBrainBitesActive,
      appState: this.appState,
      hasTimer: !!this.timer,
      formattedTime: this.formatTime(this.availableTime)
    };
  }
  
  // Cleanup
  cleanup() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Save final state
    this.saveTimeData();
    
    // Cancel all notifications (with error handling for AVD)
    try {
      NotificationService.cancelAllNotifications();
    } catch (error) {
      console.log('Notification cleanup skipped (likely AVD):', error.message);
    }
  }
}

export default new EnhancedTimerService();