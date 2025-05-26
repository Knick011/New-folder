import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';
import TimerService from './TimerService';

class EnhancedTimerService extends TimerService {
  constructor() {
    super();
    this.isBrainBitesActive = true; // App starts in foreground
    this.lastUpdateTime = null;
    
    // Override the app state change handler
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
  }
  
  // Enhanced app state change handler
  _handleAppStateChange = (nextAppState) => {
    const prevState = this.appState;
    this.appState = nextAppState;
    
    // App going to background
    if (prevState === 'active' && nextAppState.match(/inactive|background/)) {
      this.isBrainBitesActive = false;
      this._startTrackingIfNeeded();
      console.log('App went to background - starting time tracking');
    } 
    // App coming to foreground
    else if (prevState.match(/inactive|background/) && nextAppState === 'active') {
      this.isBrainBitesActive = true;
      this._pauseTracking();
      console.log('App came to foreground - pausing time tracking');
    }
  }
  
  // Start tracking time if conditions are met
  _startTrackingIfNeeded() {
    // Only start tracking if we have time available and not already tracking
    if (this.availableTime > 0 && !this.isRunning && !this.isBrainBitesActive) {
      this.isRunning = true;
      this.startTime = Date.now();
      this.lastUpdateTime = Date.now();
      
      // Update timer every second
      this.timer = setInterval(() => this._updateTime(), 1000);
      
      // Notify listeners
      this._notifyListeners('trackingStarted', { availableTime: this.availableTime });
      
      // Schedule low time notifications
      this._scheduleTimeNotifications();
      
      console.log('Time tracking started');
    }
  }
  
  // Pause tracking
  _pauseTracking() {
    if (this.isRunning) {
      this.isRunning = false;
      
      // Clear the timer
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      
      // Update time one last time
      this._updateTime();
      
      // Notify listeners
      this._notifyListeners('trackingPaused', { availableTime: this.availableTime });
      
      // Cancel scheduled notifications since tracking is paused
      NotificationService.cancelTimeNotifications();
      
      console.log('Time tracking paused');
    }
  }
  
  // Update the time counter
  _updateTime() {
    if (!this.isRunning || !this.startTime) return;
    
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastUpdateTime) / 1000);
    
    if (elapsedSeconds > 0) {
      // Decrease available time
      this.availableTime = Math.max(0, this.availableTime - elapsedSeconds);
      
      // Update last update time
      this.lastUpdateTime = now;
      
      // Notify listeners of time update
      this._notifyListeners('timeUpdate', { 
        remaining: this.availableTime,
        elapsed: elapsedSeconds
      });
      
      // Check if time expired
      if (this.availableTime <= 0) {
        this._handleTimeExpired();
      }
      
      // Save time periodically (every 30 seconds)
      if (Math.floor((now - this.startTime) / 1000) % 30 === 0) {
        this.saveTimeData();
      }
    }
  }
  
  // Handle time expiration
  _handleTimeExpired() {
    this._pauseTracking();
    this._notifyListeners('timeExpired');
    
    // Show time expired notification
    NotificationService.showTimeExpiredNotification();
  }
  
  // Schedule low time notifications
  _scheduleTimeNotifications() {
    // Only schedule if we have time tracking active
    if (!this.isRunning) return;
    
    // Cancel any existing notifications first
    NotificationService.cancelTimeNotifications();
    
    // Schedule notification at 5 minutes remaining
    if (this.availableTime > 300) {
      const timeUntil5Min = this.availableTime - 300; // seconds until 5 min remaining
      NotificationService.scheduleLowTimeNotification(5, timeUntil5Min);
    }
    
    // Schedule notification at 1 minute remaining
    if (this.availableTime > 60) {
      const timeUntil1Min = this.availableTime - 60; // seconds until 1 min remaining
      NotificationService.scheduleLowTimeNotification(1, timeUntil1Min);
    }
  }
  
  // Override loadSavedTime to handle background tracking
  async loadSavedTime() {
    await super.loadSavedTime();
    
    // If we have time and app is in background, start tracking
    if (this.availableTime > 0 && !this.isBrainBitesActive) {
      this._startTrackingIfNeeded();
    }
    
    return this.availableTime;
  }
  
  // Override cleanup to handle enhanced features
  cleanup() {
    super.cleanup();
    
    // Cancel all notifications
    NotificationService.cancelAllNotifications();
  }
}

export default new EnhancedTimerService(); 