// src/services/EnhancedTimerService.js - FIXED VERSION
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';
import TimerService from './TimerService';  // ✅ Import the INSTANCE (not class)

class EnhancedTimerService {
  constructor() {
    // Copy all properties from TimerService instance
    Object.assign(this, TimerService);
    
    // Enhanced state tracking
    this.isBrainBitesActive = true;
    this.lastUpdateTime = null;
    this.backgroundStartTime = null;
    this.foregroundStartTime = null;
    this.isRunning = false;
    this.backgroundTimer = null; // Separate from TimerService timer
    
    // Override the parent's app state handler
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Use the new AppState API pattern from working examples
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
    
    console.log('Enhanced Timer Service initialized');
  }
  
  // Enhanced app state change handler based on working examples
  _handleAppStateChange = (nextAppState) => {
    const previousState = this.appState;
    this.appState = nextAppState;
    
    console.log(`App state changed: ${previousState} -> ${nextAppState}`);
    
    // App going to background (user switched apps or minimized)
    if (previousState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
      console.log('App went to background - starting time tracking');
      this.isBrainBitesActive = false;
      this.backgroundStartTime = Date.now();
      this._startBackgroundTracking();
    } 
    // App coming to foreground (user returned to app)
    else if ((previousState === 'background' || previousState === 'inactive') && nextAppState === 'active') {
      console.log('App came to foreground - stopping time tracking');
      this.isBrainBitesActive = true;
      this.foregroundStartTime = Date.now();
      this._stopBackgroundTracking();
    }
    
    // Notify listeners of app state change
    this._notifyListeners('appStateChanged', { 
      previousState, 
      currentState: nextAppState,
      isBrainBitesActive: this.isBrainBitesActive 
    });
  }
  
  // Start tracking time when app goes to background
  _startBackgroundTracking() {
    // Only start tracking if we have available time and not already running
    if (this.availableTime > 0 && !this.isRunning) {
      console.log('Starting background time tracking with', this.availableTime, 'seconds available');
      
      this.isRunning = true;
      this.lastUpdateTime = Date.now();
      
      // Update timer every second
      this.backgroundTimer = setInterval(() => {
        this._updateBackgroundTime();
      }, 1000);
      
      // Notify listeners
      this._notifyListeners('trackingStarted', { 
        availableTime: this.availableTime,
        startTime: this.backgroundStartTime
      });
      
      // Schedule low time notifications
      this._scheduleTimeNotifications();
    } else if (this.availableTime <= 0) {
      console.log('No time available - not starting background tracking');
    } else if (this.isRunning) {
      console.log('Background tracking already running');
    }
  }
  
  // Stop tracking when app comes to foreground
  _stopBackgroundTracking() {
    if (this.isRunning) {
      console.log('Stopping background time tracking');
      
      this.isRunning = false;
      
      // Clear the timer
      if (this.backgroundTimer) {
        clearInterval(this.backgroundTimer);
        this.backgroundTimer = null;
      }
      
      // Final time update
      this._updateBackgroundTime();
      
      // Calculate total background time
      const backgroundDuration = this.foregroundStartTime - this.backgroundStartTime;
      const backgroundSeconds = Math.floor(backgroundDuration / 1000);
      
      // Notify listeners
      this._notifyListeners('trackingStopped', { 
        availableTime: this.availableTime,
        backgroundDuration: backgroundSeconds,
        endTime: this.foregroundStartTime
      });
      
      // Cancel scheduled notifications since tracking stopped
      try {
        NotificationService.cancelTimeNotifications();
      } catch (error) {
        console.log('Notification service error (likely simulator):', error.message);
      }
      
      // Save the updated time
      this.saveTimeData();
    }
  }
  
  // Update time during background tracking
  _updateBackgroundTime() {
    if (!this.isRunning || !this.lastUpdateTime) {
      return;
    }
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastUpdateTime) / 1000);
    
    if (elapsedSeconds > 0) {
      // Decrease available time
      const previousTime = this.availableTime;
      this.availableTime = Math.max(0, this.availableTime - elapsedSeconds);
      
      console.log(`Background time update: -${elapsedSeconds}s, remaining: ${this.availableTime}s`);
      
      // Update last update time
      this.lastUpdateTime = now;
      
      // Notify listeners of time update
      this._notifyListeners('timeUpdate', { 
        remaining: this.availableTime,
        elapsed: elapsedSeconds,
        previousTime: previousTime,
        isBackground: true
      });
      
      // Check if time expired
      if (this.availableTime <= 0) {
        console.log('Time expired during background tracking');
        this._handleTimeExpired();
      }
      
      // Save time periodically (every 10 seconds during background)
      const totalBackgroundTime = Math.floor((now - this.backgroundStartTime) / 1000);
      if (totalBackgroundTime % 10 === 0) {
        this.saveTimeData();
      }
    }
  }
  
  // Handle time expiration
  _handleTimeExpired() {
    console.log('Time has expired - stopping tracking and sending notification');
    
    this._stopBackgroundTracking();
    this._notifyListeners('timeExpired', {
      expiredDuring: this.isBrainBitesActive ? 'foreground' : 'background'
    });
    
    // Show time expired notification
    try {
      NotificationService.showTimeExpiredNotification();
    } catch (error) {
      console.log('Notification service error (likely simulator):', error.message);
    }
  }
  
  // Schedule notifications for low time warnings
  _scheduleTimeNotifications() {
    if (!this.isRunning || this.availableTime <= 0) {
      return;
    }
    
    console.log('Scheduling time notifications for', this.availableTime, 'seconds remaining');
    
    try {
      // Cancel any existing notifications first
      NotificationService.cancelTimeNotifications();
      
      // Schedule notification at 5 minutes remaining
      if (this.availableTime > 300) {
        const timeUntil5Min = this.availableTime - 300;
        NotificationService.scheduleLowTimeNotification(5, timeUntil5Min);
        console.log('Scheduled 5-minute warning in', timeUntil5Min, 'seconds');
      }
      
      // Schedule notification at 1 minute remaining  
      if (this.availableTime > 60) {
        const timeUntil1Min = this.availableTime - 60;
        NotificationService.scheduleLowTimeNotification(1, timeUntil1Min);
        console.log('Scheduled 1-minute warning in', timeUntil1Min, 'seconds');
      }
    } catch (error) {
      console.log('Notification scheduling error (likely simulator):', error.message);
    }
  }
  
  // Override loadSavedTime to handle background state restoration
  async loadSavedTime() {
    console.log('Loading saved time data...');
    
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        this.availableTime = parsedData.availableTime || 0;
        
        console.log('Loaded available time:', this.availableTime);
        
        // Check if app was backgrounded when it was closed
        if (parsedData.wasBackgroundTracking && parsedData.backgroundStartTime) {
          const now = Date.now();
          const backgroundStartTime = parsedData.backgroundStartTime;
          const elapsedBackgroundTime = Math.floor((now - backgroundStartTime) / 1000);
          
          console.log('App was closed during background tracking');
          console.log('Elapsed background time since close:', elapsedBackgroundTime, 'seconds');
          
          // Deduct the time that passed while app was closed
          if (elapsedBackgroundTime > 0 && this.availableTime > 0) {
            const adjustedTime = Math.max(0, this.availableTime - elapsedBackgroundTime);
            const deductedTime = this.availableTime - adjustedTime;
            
            this.availableTime = adjustedTime;
            
            console.log('Deducted', deductedTime, 'seconds for time spent closed');
            console.log('Adjusted available time:', this.availableTime);
            
            // Save the adjusted time
            await this.saveTimeData();
          }
        }
        
        // If we still have time and app is likely to go to background, prepare for tracking
        if (this.availableTime > 0 && !this.isBrainBitesActive) {
          // Don't start tracking immediately, wait for proper app state change
          console.log('App loaded with time available, ready for background tracking');
        }
      }
      
      this._notifyListeners('timeLoaded', { availableTime: this.availableTime });
      return this.availableTime;
      
    } catch (error) {
      console.error('Error loading saved time:', error);
      return 0;
    }
  }
  
  // Override saveTimeData to include background tracking state
  async saveTimeData() {
    try {
      const data = {
        availableTime: this.availableTime,
        lastUpdated: new Date().toISOString(),
        wasBackgroundTracking: this.isRunning && !this.isBrainBitesActive,
        backgroundStartTime: this.backgroundStartTime,
        appState: this.appState
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('Saved time data:', data);
      
    } catch (error) {
      console.error('Error saving time data:', error);
    }
  }
  
  // Get current tracking status
  getTrackingStatus() {
    return {
      isTracking: this.isRunning,
      isBrainBitesActive: this.isBrainBitesActive,
      appState: this.appState,
      availableTime: this.availableTime,
      backgroundStartTime: this.backgroundStartTime,
      lastUpdateTime: this.lastUpdateTime
    };
  }
  
  // ✅ FIXED: Add missing getDebugInfo method
  getDebugInfo() {
    return {
      availableTime: this.availableTime,
      formattedTime: this.formatTime(this.availableTime),
      isRunning: this.isRunning,
      isBrainBitesActive: this.isBrainBitesActive,
      appState: this.appState,
      hasTimer: !!this.backgroundTimer,
      backgroundStartTime: this.backgroundStartTime,
      lastUpdateTime: this.lastUpdateTime
    };
  }
  
  // Force start tracking (for testing)
  forceStartTracking() {
    console.log('Force starting background tracking');
    this.isBrainBitesActive = false;
    this.backgroundStartTime = Date.now();
    this._startBackgroundTracking();
  }
  
  // Force stop tracking (for testing)
  forceStopTracking() {
    console.log('Force stopping background tracking');
    this.isBrainBitesActive = true;
    this.foregroundStartTime = Date.now();
    this._stopBackgroundTracking();
  }
  
  // Override cleanup to handle enhanced features
  cleanup() {
    console.log('Cleaning up Enhanced Timer Service');
    
    // Stop background tracking if running
    if (this.isRunning) {
      this._stopBackgroundTracking();
    }
    
    // Clear background timer
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Cancel all notifications
    try {
      NotificationService.cancelAllNotifications();
    } catch (error) {
      console.log('Notification cleanup error (likely simulator):', error.message);
    }
  }
}

// ✅ FIXED: Export singleton instance
export default new EnhancedTimerService();