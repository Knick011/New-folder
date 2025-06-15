// src/screens/AudioTimerTestScreen.js - Test component for both fixes
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  AppState
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundService from '../services/SoundService';
import EnhancedTimerService from '../services/EnhancedTimerService';

const AudioTimerTestScreen = ({ navigation }) => {
  const [soundStatus, setSoundStatus] = useState('Not initialized');
  const [timerStatus, setTimerStatus] = useState('Not initialized');
  const [availableTime, setAvailableTime] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 9)]);
    console.log(`[TEST] ${message}`);
  };

  useEffect(() => {
    // Initialize services
    initializeServices();
    
    // Listen to app state changes
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      addLog(`App state: ${appState} -> ${nextAppState}`);
      setAppState(nextAppState);
    });
    
    // Listen to timer events
    const timerListener = EnhancedTimerService.addEventListener((event) => {
      addLog(`Timer event: ${event.event}`);
      if (event.event === 'timeUpdate') {
        setAvailableTime(event.remaining);
      }
    });
    
    // Update timer status periodically
    const statusInterval = setInterval(() => {
      updateStatus();
    }, 2000);
    
    return () => {
      appStateSubscription?.remove();
      timerListener();
      clearInterval(statusInterval);
    };
  }, []);

  const initializeServices = async () => {
    try {
      // Check sound service
      if (SoundService.isInitialized) {
        setSoundStatus('Initialized');
        addLog('Sound service is ready');
      } else {
        setSoundStatus('Initializing...');
        // Wait a bit for sound service to initialize
        setTimeout(() => {
          if (SoundService.isInitialized) {
            setSoundStatus('Initialized');
            addLog('Sound service initialized');
          } else {
            setSoundStatus('Failed to initialize');
            addLog('Sound service failed to initialize');
          }
        }, 2000);
      }
      
      // Load timer data
      const time = await EnhancedTimerService.loadSavedTime();
      setAvailableTime(time);
      setTimerStatus('Loaded');
      addLog(`Timer loaded with ${time} seconds`);
      
    } catch (error) {
      addLog(`Initialization error: ${error.message}`);
    }
  };

  const updateStatus = () => {
    const status = EnhancedTimerService.getTrackingStatus();
    setTrackingStatus(status);
    setAvailableTime(status.availableTime);
  };

  // Sound test functions
  const testButtonSound = () => {
    addLog('Testing button press sound');
    SoundService.playButtonPress();
  };

  const testCorrectSound = () => {
    addLog('Testing correct answer sound');
    SoundService.playCorrect();
  };

  const testIncorrectSound = () => {
    addLog('Testing incorrect answer sound');
    SoundService.playIncorrect();
  };

  const testStreakSound = () => {
    addLog('Testing streak sound');
    SoundService.playStreak();
  };

  const testMenuMusic = () => {
    addLog('Testing menu music');
    if (SoundService.currentMusic === 'menumusic') {
      SoundService.stopMusic();
      addLog('Stopped menu music');
    } else {
      SoundService.startMenuMusic();
      addLog('Started menu music');
    }
  };

  const testGameMusic = () => {
    addLog('Testing game music');
    if (SoundService.currentMusic === 'gamemusic') {
      SoundService.stopMusic();
      addLog('Stopped game music');
    } else {
      SoundService.startGameMusic();
      addLog('Started game music');
    }
  };

  // Timer test functions
  const addTestTime = () => {
    EnhancedTimerService.addTimeCredits(300); // Add 5 minutes
    addLog('Added 5 minutes of test time');
    updateStatus();
  };

  const forceStartTracking = () => {
    EnhancedTimerService.forceStartTracking();
    addLog('Force started background tracking');
    updateStatus();
  };

  const forceStopTracking = () => {
    EnhancedTimerService.forceStopTracking();
    addLog('Force stopped background tracking');
    updateStatus();
  };

  const simulateBackground = () => {
    Alert.alert(
      'Background Test',
      'Now minimize the app (press home button) and wait 10-20 seconds, then return to see if time was deducted.',
      [{ text: 'OK', onPress: () => addLog('Background test initiated - minimize app now') }]
    );
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Audio & Timer Test</Text>
        </View>

        {/* Status Cards */}
        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Sound Service</Text>
            <Text style={[styles.statusValue, { color: soundStatus === 'Initialized' ? '#4CAF50' : '#F44336' }]}>
              {soundStatus}
            </Text>
          </View>
          
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Timer Service</Text>
            <Text style={[styles.statusValue, { color: timerStatus === 'Loaded' ? '#4CAF50' : '#F44336' }]}>
              {timerStatus}
            </Text>
          </View>
        </View>

        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>App State</Text>
            <Text style={styles.statusValue}>{appState}</Text>
          </View>
          
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Available Time</Text>
            <Text style={styles.statusValue}>{formatTime(availableTime)}</Text>
          </View>
        </View>

        {trackingStatus && (
          <View style={styles.trackingCard}>
            <Text style={styles.cardTitle}>Tracking Status</Text>
            <Text>Is Tracking: {trackingStatus.isTracking ? 'YES' : 'NO'}</Text>
            <Text>Brain Bites Active: {trackingStatus.isBrainBitesActive ? 'YES' : 'NO'}</Text>
            <Text>App State: {trackingStatus.appState}</Text>
          </View>
        )}

        {/* Sound Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Sound Tests</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity style={styles.testButton} onPress={testButtonSound}>
              <Icon name="gesture-tap" size={20} color="white" />
              <Text style={styles.buttonText}>Button</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, styles.correctButton]} onPress={testCorrectSound}>
              <Icon name="check" size={20} color="white" />
              <Text style={styles.buttonText}>Correct</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, styles.incorrectButton]} onPress={testIncorrectSound}>
              <Icon name="close" size={20} color="white" />
              <Text style={styles.buttonText}>Incorrect</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, styles.streakButton]} onPress={testStreakSound}>
              <Icon name="fire" size={20} color="white" />
              <Text style={styles.buttonText}>Streak</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.buttonGrid}>
            <TouchableOpacity style={[styles.testButton, styles.musicButton]} onPress={testMenuMusic}>
              <Icon name="music" size={20} color="white" />
              <Text style={styles.buttonText}>Menu Music</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, styles.musicButton]} onPress={testGameMusic}>
              <Icon name="gamepad-variant" size={20} color="white" />
              <Text style={styles.buttonText}>Game Music</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timer Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Timer Tests</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity style={styles.testButton} onPress={addTestTime}>
              <Icon name="clock-plus" size={20} color="white" />
              <Text style={styles.buttonText}>Add 5 Min</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, styles.trackingButton]} onPress={forceStartTracking}>
              <Icon name="play" size={20} color="white" />
              <Text style={styles.buttonText}>Start Track</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, styles.trackingButton]} onPress={forceStopTracking}>
              <Icon name="stop" size={20} color="white" />
              <Text style={styles.buttonText}>Stop Track</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.testButton, styles.warningButton]} onPress={simulateBackground}>
              <Icon name="cellphone-arrow-down" size={20} color="white" />
              <Text style={styles.buttonText}>Test Background</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logs */}
        <View style={styles.section}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>📝 Logs</Text>
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logContainer}>
            {logs.length === 0 ? (
              <Text style={styles.emptyLog}>No logs yet...</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logText}>{log}</Text>
              ))
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Instructions</Text>
          <Text style={styles.instructionText}>
            1. Test sounds by tapping the sound buttons above{'\n'}
            2. Add test time, then minimize the app to test background tracking{'\n'}
            3. Check logs for debug information{'\n'}
            4. If sounds don't work, check that files are in correct locations{'\n'}
            5. If background tracking doesn't work, check AppState logs
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flex: 0.48,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#FF9F1C',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginBottom: 8,
  },
  correctButton: {
    backgroundColor: '#4CAF50',
  },
  incorrectButton: {
    backgroundColor: '#F44336',
  },
  streakButton: {
    backgroundColor: '#FF5722',
  },
  musicButton: {
    backgroundColor: '#9C27B0',
  },
  trackingButton: {
    backgroundColor: '#2196F3',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearButton: {
    backgroundColor: '#666',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
  },
  logContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    maxHeight: 200,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logText: {
    fontSize: 11,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  emptyLog: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default AudioTimerTestScreen;