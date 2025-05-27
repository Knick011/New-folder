// src/services/TimerService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

class TimerService {
  constructor() {
    this.availableTime = 0; // in seconds
    this.activeApp = null;
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
    
    // Load saved data on initialization
    this.loadSavedTime();
    
    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
  }
  
  // Handle app going to background/foreground
  _handleAppStateChange = (nextAppState) => {
    // If session is running and app goes to background
    if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      this._pauseSession();
    } 
    // If session is paused and app comes to foreground
    else if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      this._resumeSession();
    }
    
    this.appState = nextAppState;
  }
  
  // Load previously saved time from storage
  async loadSavedTime() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        this.availableTime = parsedData.availableTime || 0;
        
        // If there was an active session that wasn't properly ended
        if (parsedData.sessionStartTime && !parsedData.sessionEnded) {
          const elapsedTime = Math.floor((Date.now() - parsedData.sessionStartTime) / 1000);
          const adjustedTime = Math.max(0, this.availableTime - elapsedTime);
          
          // If more than 5 minutes elapsed, assume app was closed and deduct time
          if (elapsedTime > 300) {
            this.availableTime = adjustedTime;
            this.saveTimeData();
          }
        }
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
        lastUpdated: new Date().toISOString(),
        sessionStartTime: this.sessionStartTime,
        sessionEnded: !this.isAppRunning,
        activeApp: this.activeApp
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving time data:', error);
    }
  }
  
  // Pause the session when app goes to background
  _pauseSession() {
    if (!this.isAppRunning) return;
    
    this.pauseStartTime = Date.now();
    
    // Clear the timer but don't end session
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    this._notifyListeners('sessionPaused', { 
      app: this.activeApp,
      elapsedBeforePause: Math.floor((Date.now() - this.sessionStartTime) / 1000) - this.pausedTime
    });
  }
  
  // Resume the session when app comes to foreground
  _resumeSession() {
    if (!this.isAppRunning || !this.pauseStartTime) return;
    
    // Calculate paused duration and add to total paused time
    if (this.pauseStartTime) {
      this.pausedTime += Math.floor((Date.now() - this.pauseStartTime) / 1000);
      this.pauseStartTime = null;
    }
    
    // Restart the timer
    this.timer = setInterval(() => {
      this._updateRemainingTime();
    }, 1000);
    
    this._notifyListeners('sessionResumed', { app: this.activeApp });
  }
  
  // Start the timer for an app
  startAppTimer(appId) {
    if (this.availableTime <= 0) {
      this._notifyListeners('timeExpired');
      return false;
    }
    
    this.activeApp = appId;
    this.isAppRunning = true;
    this.sessionStartTime = Date.now();
    this.pausedTime = 0;
    this.pauseStartTime = null;
    
    // Clear any existing timer
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    // Start tracking time
    this.timer = setInterval(() => {
      this._updateRemainingTime();
    }, 1000);
    
    this._notifyListeners('sessionStarted', { 
      appId,
      availableTime: this.availableTime 
    });
    
    this.saveTimeData();
    return true;
  }
  
  // Stop the timer
  stopAppTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // Calculate time spent in this session
    let timeSpent = 0;
    if (this.sessionStartTime) {
      timeSpent = Math.floor((Date.now() - this.sessionStartTime) / 1000) - this.pausedTime;
      this.availableTime = Math.max(0, this.availableTime - timeSpent);
    }
    
    this.isAppRunning = false;
    this.sessionStartTime = null;
    this.pausedTime = 0;
    this.pauseStartTime = null;
    
    this._notifyListeners('sessionEnded', { 
      appId: this.activeApp,
      timeSpent,
      remainingTime: this.availableTime
    });
    
    this.activeApp = null;
    this.saveTimeData();
    return timeSpent;
  }
  
  // Get current session info
  getCurrentSession() {
    if (!this.isAppRunning) return null;
    
    const rawElapsed = this.sessionStartTime ? 
      Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0;
    
    const elapsedTime = Math.max(0, rawElapsed - this.pausedTime);
    const remainingTime = Math.max(0, this.availableTime - elapsedTime);
    
    return {
      appId: this.activeApp,
      elapsedTime,
      remainingTime,
      startTime: this.sessionStartTime,
      isActive: this.appState === 'active' && !this.pauseStartTime
    };
  }
  
  // Update remaining time
  _updateRemainingTime() {
    if (!this.sessionStartTime || this.pauseStartTime) return;
    
    const rawElapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const elapsedTime = Math.max(0, rawElapsed - this.pausedTime);
    const remainingTime = Math.max(0, this.availableTime - elapsedTime);
    
    // Notify listeners of time update
    this._notifyListeners('timeUpdate', { 
      remaining: remainingTime,
      elapsed: elapsedTime,
      total: this.availableTime
    });
    
    // Check if time expired
    if (remainingTime <= 0) {
      this.stopAppTimer();
      this._notifyListeners('timeExpired');
    }
    
    // Save time periodically (every 30 seconds) to avoid too many writes
    if (elapsedTime % 30 === 0) {
      this.saveTimeData();
    }
  }
  
  // Add time credits (rewards for correct answers)
  addTimeCredits(seconds) {
    this.availableTime += seconds;
    this.saveTimeData();
    this._notifyListeners('creditsAdded', { seconds, newTotal: this.availableTime });
    return this.availableTime;
  }
  
  // Get current available time
  getAvailableTime() {
    // If there's an active session, calculate real-time remaining
    if (this.isAppRunning && this.sessionStartTime) {
      const session = this.getCurrentSession();
      return session.remainingTime;
    }
    return this.availableTime;
  }
  
  // Format seconds to MM:SS or HH:MM:SS if > 60 minutes
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
  
  // Clean up
  cleanup() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    // Remove the AppState event listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // If session is active, save the state before cleanup
    if (this.isAppRunning) {
      this.stopAppTimer();
    }
  }
}

const timerServiceInstance = new TimerService();
export default timerServiceInstance;