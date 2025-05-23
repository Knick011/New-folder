// src/services/SoundService.js
import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

/**
 * Sound Service using react-native-sound library
 * Manages all app sounds including effects and background music
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
    
    // Define sound files
    this.soundFiles = {
      buttonpress: 'buttonpress.mp3',
      correct: 'correct.mp3',
      incorrect: 'incorrect.mp3',
      streak: 'streak.mp3',
      menumusic: 'menumusic.mp3',
      gamemusic: 'gamemusic.mp3',
    };
    
    // Load settings and initialize
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
      const loadPromises = [];
      
      Object.entries(this.soundFiles).forEach(([key, filename]) => {
        loadPromises.push(
          new Promise((soundResolve, soundReject) => {
            // Load sound from bundle
            const sound = new Sound(
              filename,
              Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE,
              (error) => {
                if (error) {
                  console.error(`Failed to load sound ${filename}:`, error);
                  soundReject(error);
                  return;
                }
                
                console.log(`Successfully loaded sound: ${filename}`);
                this.sounds[key] = sound;
                
                // Set volume for music files
                if (key.includes('music')) {
                  sound.setVolume(0.3); // Lower volume for background music
                } else {
                  sound.setVolume(0.8); // Higher volume for sound effects
                }
                
                soundResolve();
              }
            );
          })
        );
      });
      
      // Wait for all sounds to load
      Promise.allSettled(loadPromises).then((results) => {
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`Sound Service initialized: ${successCount}/${loadPromises.length} sounds loaded`);
        this.isInitialized = true;
        resolve(true);
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
      console.warn(`Sound ${soundName} not found`);
      return null;
    }
    
    // Stop previous instance if playing
    sound.stop(() => {
      // Reset to beginning
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
        }
      });
    });
    
    return sound;
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