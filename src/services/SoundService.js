// src/services/SoundService.js - Fixed version based on working examples from other apps
import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Enable playback in silence mode (iOS) - This is crucial for iOS
Sound.setCategory('Playback');

/**
 * Sound Service using react-native-sound library
 * Fixed based on working examples from other React Native apps
 */
class SoundService {
  constructor() {
    this.sounds = {};
    this.soundsEnabled = true;
    this.musicEnabled = true;
    this.currentMusic = null;
    this.isInitialized = false;
    this.STORAGE_KEY = 'brainbites_sounds_enabled';
    this.MUSIC_KEY = 'brainbites_music_enabled';
    
    // Load settings first, then initialize
    this.loadSettings().then(() => {
      this.initSounds();
    });
  }
  
  async loadSettings() {
    try {
      const soundsEnabled = await AsyncStorage.getItem(this.STORAGE_KEY);
      const musicEnabled = await AsyncStorage.getItem(this.MUSIC_KEY);
      
      if (soundsEnabled !== null) {
        this.soundsEnabled = soundsEnabled === 'true';
      }
      if (musicEnabled !== null) {
        this.musicEnabled = musicEnabled === 'true';
      }
      
      console.log('Sound settings loaded:', { soundsEnabled: this.soundsEnabled, musicEnabled: this.musicEnabled });
    } catch (error) {
      console.error('Error loading sound settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, this.soundsEnabled.toString());
      await AsyncStorage.setItem(this.MUSIC_KEY, this.musicEnabled.toString());
    } catch (error) {
      console.error('Error saving sound settings:', error);
    }
  }
  
  initSounds() {
    return new Promise((resolve) => {
      // Sound files mapping - these files need to be placed correctly
      const soundFiles = {
        buttonpress: 'buttonpress.mp3',
        correct: 'correct.mp3', 
        incorrect: 'incorrect.mp3',
        streak: 'streak.mp3',
        menumusic: 'menumusic.mp3',
        gamemusic: 'gamemusic.mp3',
      };
      
      const loadPromises = [];
      
      Object.entries(soundFiles).forEach(([key, filename]) => {
        loadPromises.push(
          new Promise((soundResolve) => {
            // Different loading approach for Android vs iOS based on working examples
            let sound;
            
            if (Platform.OS === 'android') {
              // For Android: files should be in android/app/src/main/res/raw/
              // Use null as basePath for raw resources
              sound = new Sound(filename.replace('.mp3', ''), null, (error) => {
                if (error) {
                  console.error(`Failed to load Android sound ${filename}:`, error);
                  soundResolve(false);
                  return;
                }
                
                console.log(`Successfully loaded Android sound: ${filename}`);
                this.sounds[key] = sound;
                
                // Set volume for different types
                if (key.includes('music')) {
                  sound.setVolume(0.3);
                } else {
                  sound.setVolume(0.8);
                }
                
                soundResolve(true);
              });
            } else {
              // For iOS: files should be added to Xcode project bundle
              // Use Sound.MAIN_BUNDLE for iOS
              sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
                if (error) {
                  console.error(`Failed to load iOS sound ${filename}:`, error);
                  soundResolve(false);
                  return;
                }
                
                console.log(`Successfully loaded iOS sound: ${filename}`);
                this.sounds[key] = sound;
                
                // Set volume for different types
                if (key.includes('music')) {
                  sound.setVolume(0.3);
                } else {
                  sound.setVolume(0.8);
                }
                
                soundResolve(true);
              });
            }
          })
        );
      });
      
      // Wait for all sounds to load
      Promise.allSettled(loadPromises).then((results) => {
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        console.log(`Sound Service initialized: ${successCount}/${loadPromises.length} sounds loaded`);
        this.isInitialized = true;
        resolve(successCount > 0);
      });
    });
  }
  
  play(soundName, options = {}) {
    if (!this.isInitialized) {
      console.warn('Sound Service not initialized yet');
      return null;
    }
    
    // Check if sounds are enabled
    if (!this.soundsEnabled && !soundName.includes('music')) {
      return null;
    }
    
    // Check if music is enabled
    if (!this.musicEnabled && soundName.includes('music')) {
      return null;
    }
    
    const sound = this.sounds[soundName];
    if (!sound) {
      console.warn(`Sound ${soundName} not loaded`);
      return null;
    }
    
    // Stop and reset before playing (important for reliability)
    sound.stop(() => {
      sound.setCurrentTime(0);
      
      // Set volume if specified
      if (options.volume !== undefined) {
        sound.setVolume(options.volume);
      }
      
      // Set number of loops
      if (options.loops === -1) {
        sound.setNumberOfLoops(-1); // Infinite loop
      } else if (options.loops > 0) {
        sound.setNumberOfLoops(options.loops);
      } else {
        sound.setNumberOfLoops(0); // Play once
      }
      
      // Play the sound
      sound.play((success) => {
        if (success) {
          console.log(`Successfully played sound: ${soundName}`);
        } else {
          console.error(`Sound playback failed for: ${soundName}`);
          
          // Try to reload the sound if playback failed
          this.reloadSound(soundName);
        }
      });
    });
    
    return sound;
  }
  
  // Reload a specific sound if it fails to play
  reloadSound(soundName) {
    const soundFiles = {
      buttonpress: 'buttonpress.mp3',
      correct: 'correct.mp3', 
      incorrect: 'incorrect.mp3',
      streak: 'streak.mp3',
      menumusic: 'menumusic.mp3',
      gamemusic: 'gamemusic.mp3',
    };
    
    const filename = soundFiles[soundName];
    if (!filename) return;
    
    console.log(`Reloading sound: ${soundName}`);
    
    let sound;
    if (Platform.OS === 'android') {
      sound = new Sound(filename.replace('.mp3', ''), null, (error) => {
        if (!error) {
          this.sounds[soundName] = sound;
          console.log(`Successfully reloaded sound: ${soundName}`);
        }
      });
    } else {
      sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
        if (!error) {
          this.sounds[soundName] = sound;
          console.log(`Successfully reloaded sound: ${soundName}`);
        }
      });
    }
  }
  
  stop(soundName) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.stop(() => {
        sound.setCurrentTime(0);
        console.log(`Stopped sound: ${soundName}`);
      });
    }
  }
  
  stopAll() {
    Object.entries(this.sounds).forEach(([name, sound]) => {
      if (sound) {
        sound.stop(() => {
          sound.setCurrentTime(0);
        });
      }
    });
  }
  
  async toggleSounds(enabled) {
    this.soundsEnabled = enabled;
    await this.saveSettings();
    
    if (!enabled) {
      // Stop all non-music sounds
      Object.entries(this.sounds).forEach(([name, sound]) => {
        if (!name.includes('music') && sound) {
          sound.stop();
        }
      });
    }
  }
  
  async toggleMusic(enabled) {
    this.musicEnabled = enabled;
    await this.saveSettings();
    
    if (!enabled) {
      // Stop all music
      this.stopMusic();
    }
  }
  
  // Convenience methods
  playButtonPress() {
    return this.play('buttonpress');
  }
  
  playCorrect() {
    return this.play('correct');
  }
  
  playIncorrect() {
    return this.play('incorrect');
  }
  
  playStreak() {
    return this.play('streak');
  }
  
  startMenuMusic() {
    if (!this.musicEnabled) return;
    
    // Stop any current music
    this.stopMusic();
    
    // Play menu music on loop
    this.currentMusic = 'menumusic';
    return this.play('menumusic', { volume: 0.3, loops: -1 });
  }
  
  startGameMusic() {
    if (!this.musicEnabled) return;
    
    // Stop any current music
    this.stopMusic();
    
    // Play game music on loop
    this.currentMusic = 'gamemusic';
    return this.play('gamemusic', { volume: 0.3, loops: -1 });
  }
  
  stopMusic() {
    if (this.currentMusic) {
      this.stop(this.currentMusic);
      this.currentMusic = null;
    }
    
    // Stop all music tracks
    this.stop('menumusic');
    this.stop('gamemusic');
  }
  
  pauseMusic() {
    if (this.currentMusic && this.sounds[this.currentMusic]) {
      this.sounds[this.currentMusic].pause();
    }
  }
  
  resumeMusic() {
    if (this.currentMusic && this.sounds[this.currentMusic] && this.musicEnabled) {
      this.sounds[this.currentMusic].play();
    }
  }
  
  setVolume(soundName, volume) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.setVolume(Math.max(0, Math.min(1, volume)));
    }
  }
  
  cleanup() {
    // Stop all sounds
    this.stopAll();
    
    // Release all sound resources
    Object.values(this.sounds).forEach(sound => {
      if (sound) {
        sound.release();
      }
    });
    
    this.sounds = {};
    this.isInitialized = false;
    this.currentMusic = null;
  }
}

export default new SoundService();