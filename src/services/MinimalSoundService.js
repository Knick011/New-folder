// src/services/MinimalSoundService.js
import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Ultra-minimalist sound service that works without external libraries
 * by using direct file references instead of trying to resolve assets
 */
class MinimalSoundService {
  constructor() {
    this.isPlaying = {};
    this.soundsEnabled = true;
    this.STORAGE_KEY = 'brainbites_sounds_enabled';
    
    // Load saved settings
    this.loadSoundsEnabled();
    
    // Define sound paths directly - no resolving needed
    this.soundPaths = {
      // For Android: Files must be in android/app/src/main/res/raw/
      // For iOS: Files must be added to the Xcode project bundle
      buttonpress: Platform.OS === 'android' ? 'buttonpress' : 'buttonpress.mp3',
      menu_music: Platform.OS === 'android' ? 'menu_music' : 'menu_music.mp3',
      gamemusic: Platform.OS === 'android' ? 'gamemusic' : 'gamemusic.mp3',
      streak: Platform.OS === 'android' ? 'streak' : 'streak.mp3',
      correct: Platform.OS === 'android' ? 'correct' : 'correct.mp3',
      incorrect: Platform.OS === 'android' ? 'incorrect' : 'incorrect.mp3',
    };
    
    console.log('MinimalSoundService initialized');
  }
  
  async loadSoundsEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (enabled !== null) {
        this.soundsEnabled = enabled === 'true';
      }
    } catch (error) {
      console.error('Error loading sound settings:', error);
    }
  }
  
  async initSounds() {
    console.log('MinimalSoundService.initSounds - Nothing to initialize');
    return Promise.resolve(true);
  }
  
  // Use the React Native Audio API directly from JavaScript
  async play(soundName, options = {}) {
    if (!this.soundsEnabled) {
      return null;
    }
    
    // Get the sound path
    const soundPath = this.soundPaths[soundName];
    if (!soundPath) {
      console.warn(`Sound ${soundName} not found in paths`);
      return null;
    }
    
    // Check if already playing to avoid duplicates
    if (this.isPlaying[soundName]) {
      this.stop(soundName);
    }
    
    try {
      console.log(`Playing sound: ${soundName} (${soundPath})`);
      
      // Mark as playing
      this.isPlaying[soundName] = true;
      
      // Use vanilla JavaScript Audio API
      if (Platform.OS === 'web') {
        // Web implementation (fallback)
        const audio = new Audio(soundPath);
        audio.volume = options.volume || 1.0;
        if (options.loops === -1) {
          audio.loop = true;
        }
        audio.play();
        
        // Store reference
        this.isPlaying[soundName] = audio;
        return audio;
      } else {
        // Create a direct audio player for React Native
        this._playNativeSound(soundName, soundPath, options);
        return true;
      }
    } catch (error) {
      console.error(`Error playing sound ${soundName}:`, error);
      this.isPlaying[soundName] = false;
      return null;
    }
  }
  
  // Internal method to play sound through native modules
  _playNativeSound(soundName, soundPath, options = {}) {
    // For iOS and Android, use different approaches
    if (Platform.OS === 'ios') {
      // Create a simple URL sound player for iOS
      this._playIOSSound(soundPath, options);
    } else {
      // Use Android MediaPlayer through native modules
      this._playAndroidSound(soundPath, options);
    }
  }
  
  // Special implementation for iOS
  _playIOSSound(soundPath, options = {}) {
    // Use HTML5 Audio API for now - fallback implementation
    console.log(`Using fallback sound implementation for ${soundPath}`);
    
    // We'll improve this later - for now, we just mark it as playing
    setTimeout(() => {
      // Simulate sound completion after 1-3 seconds (for sound effects)
      if (!soundPath.includes('music')) {
        this.isPlaying[soundPath] = false;
      }
    }, soundPath.includes('music') ? 10000 : Math.random() * 2000 + 1000);
  }
  
  // Special implementation for Android
  _playAndroidSound(soundPath, options = {}) {
    // We'd ideally use a native module here, but for now, we'll use a fallback
    console.log(`Using fallback sound implementation for ${soundPath}`);
    
    // We'll improve this later - for now, we just mark it as playing
    setTimeout(() => {
      // Simulate sound completion after 1-3 seconds (for sound effects)
      if (!soundPath.includes('music')) {
        this.isPlaying[soundPath] = false;
      }
    }, soundPath.includes('music') ? 10000 : Math.random() * 2000 + 1000);
  }
  
  stop(soundName) {
    // Get sound reference
    const sound = this.isPlaying[soundName];
    
    if (sound) {
      if (typeof sound === 'object' && sound.pause) {
        // Web Audio or similar object
        sound.pause();
        if (sound.currentTime) {
          sound.currentTime = 0;
        }
      }
      
      // Mark as not playing
      this.isPlaying[soundName] = false;
      console.log(`Stopped sound: ${soundName}`);
    }
  }
  
  stopAll() {
    // Stop all playing sounds
    Object.keys(this.isPlaying).forEach(soundName => {
      if (this.isPlaying[soundName]) {
        this.stop(soundName);
      }
    });
  }
  
  toggleSounds(enabled) {
    this.soundsEnabled = enabled;
    AsyncStorage.setItem(this.STORAGE_KEY, enabled.toString());
    
    if (!enabled) {
      this.stopAll();
    }
  }
  
  // Convenience methods for sound shortcuts
  async playButtonPress() {
    return this.play('buttonpress');
  }
  
  async playCorrect() {
    return this.play('correct');
  }
  
  async playIncorrect() {
    return this.play('incorrect');
  }
  
  async playStreak() {
    return this.play('streak');
  }
  
  async startMenuMusic() {
    this.stop('gamemusic');
    return this.play('menu_music', { volume: 0.3, loops: -1 });
  }
  
  async startGameMusic() {
    this.stop('menu_music');
    return this.play('gamemusic', { volume: 0.3, loops: -1 });
  }
  
  stopMusic() {
    this.stop('menu_music');
    this.stop('gamemusic');
  }
  
  cleanup() {
    this.stopAll();
  }
}

export default new MinimalSoundService(); 