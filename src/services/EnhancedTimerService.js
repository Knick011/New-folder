// src/services/EnhancedTimerService.js - FIXED VERSION with immediate updates
import { AppState, Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';

const { BrainBitesTimer } = NativeModules;

class EnhancedTimerService {
  constructor() {
    this.availableTime = 0;
    this.listeners = [];
    this.STORAGE_KEY = 'brainbites_timer_data';
    this.appState = AppState.currentState;
    this.isBrainBitesActive = true;
    this.isInitialized = false;
    
    // Use native timer on Android
    this.useNativeTimer = Platform.OS === 'android' && !!BrainBitesTimer;
    
    if (this.useNativeTimer) {
      console.log('Using native Android timer service');
      this.setupNativeTimer();
    } else {
      console.log('Using JavaScript timer fallback');
    }
    
    // Listen to app state changes
    this.appStateSubscription = AppState.addEventListener('change', this._handleAppStateChange);
  }
  
  setupNativeTimer() {
    if (!BrainBitesTimer) return;
    
    // Start listening to native timer
    BrainBitesTimer.startListening();
    
    // Subscribe to timer updates using DeviceEventEmitter for better compatibility
    this.subscription = DeviceEventEmitter.addListener('timerUpdate', (data) => {
      this.availableTime = data.remainingTime || 0;
      const isTracking = data.isTracking || false;
      const isAppForeground = data.isAppForeground || false;
      
      // Only log every 10 seconds to reduce spam
      if (this.availableTime % 10 === 0) {
        console.log(`Timer update: ${this.availableTime}s, tracking: ${isTracking}`);
      }
      
      this._notifyListeners('timeUpdate', {
        remaining: this.availableTime,
        isTracking,
        isAppForeground
      });
      
      if (this.availableTime <= 0 && isTracking) {
        this._notifyListeners('timeExpired', {});
      }
    });
  }
  
  _handleAppStateChange = (nextAppState) => {
    const previousState = this.appState;
    this.appState = nextAppState;
    
    console.log(`App state changed: ${previousState} -> ${nextAppState}`);
    
    // Update native service about app state
    if (this.useNativeTimer && BrainBitesTimer) {
      if (nextAppState === 'active') {
        this.isBrainBitesActive = true;
        BrainBitesTimer.notifyAppState('app_foreground');
      } else {
        this.isBrainBitesActive = false;
        BrainBitesTimer.notifyAppState('app_background');
        
        // Force start timer when going to background if we have time
        if (this.availableTime > 0) {
          console.log('Starting timer as app goes to background');
          BrainBitesTimer.startTracking();
        }
      }
    }
  }
  
  async loadSavedTime() {
    try {
      if (this.useNativeTimer && BrainBitesTimer) {
        // Get time from native service
        const time = await BrainBitesTimer.getRemainingTime();
        this.availableTime = time;
        console.log('Loaded time from native:', time);
        
        // Start timer if we have time
        if (time > 0) {
          BrainBitesTimer.startTracking();
        }
      } else {
        // Fallback to AsyncStorage
        const data = await AsyncStorage.getItem(this.STORAGE_KEY);
        if (data) {
          const parsedData = JSON.parse(data);
          this.availableTime = parsedData.availableTime || 0;
        }
      }
      
      console.log('Loaded available time:', this.availableTime);
      this._notifyListeners('timeLoaded', { availableTime: this.availableTime });
      this.isInitialized = true;
      return this.availableTime;
    } catch (error) {
      console.error('Error loading saved time:', error);
      return 0;
    }
  }
  
  async saveTimeData() {
    try {
      if (!this.useNativeTimer) {
        // Only save to AsyncStorage if not using native timer
        const data = {
          availableTime: this.availableTime,
          lastUpdated: new Date().toISOString()
        };
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
      // Native timer saves automatically
    } catch (error) {
      console.error('Error saving time data:', error);
    }
  }
  
  addTimeCredits(seconds) {
    console.log(`Adding ${seconds} seconds of screen time`);
    
    if (this.useNativeTimer && BrainBitesTimer) {
      // Add time through native service
      BrainBitesTimer.addTime(seconds);
      
      // Update local value immediately for UI
      this.availableTime += seconds;
      
      // Notify listeners immediately
      this._notifyListeners('creditsAdded', { 
        seconds, 
        newTotal: this.availableTime 
      });
      
      // Force an immediate update
      setTimeout(() => {
        this._notifyListeners('timeUpdate', {
          remaining: this.availableTime,
          isTracking: !this.isBrainBitesActive
        });
      }, 100);
    } else {
      // JavaScript fallback
      this.availableTime += seconds;
      this.saveTimeData();
      
      this._notifyListeners('creditsAdded', { 
        seconds, 
        newTotal: this.availableTime 
      });
    }
    
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
    
    // Immediately send current state
    callback({
      event: 'timeUpdate',
      remaining: this.availableTime,
      isTracking: !this.isBrainBitesActive && this.availableTime > 0
    });
    
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  _notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      listener({ event, ...data });
    });
  }
  
  getTrackingStatus() {
    return {
      isTracking: !this.isBrainBitesActive && this.availableTime > 0,
      isBrainBitesActive: this.isBrainBitesActive,
      appState: this.appState,
      availableTime: this.availableTime
    };
  }
  
  getDebugInfo() {
    return {
      availableTime: this.availableTime,
      formattedTime: this.formatTime(this.availableTime),
      isRunning: !this.isBrainBitesActive,
      isBrainBitesActive: this.isBrainBitesActive,
      appState: this.appState,
      useNativeTimer: this.useNativeTimer
    };
  }
  
  // For testing
  forceStartTracking() {
    if (this.useNativeTimer && BrainBitesTimer) {
      BrainBitesTimer.startTracking();
    }
  }
  
  forceStopTracking() {
    if (this.useNativeTimer && BrainBitesTimer) {
      BrainBitesTimer.stopTracking();
    }
  }
  
  cleanup() {
    console.log('Cleaning up Enhanced Timer Service');
    
    if (this.subscription) {
      this.subscription.remove();
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (this.useNativeTimer && BrainBitesTimer) {
      BrainBitesTimer.stopListening();
    }
  }
}

export default new EnhancedTimerService();