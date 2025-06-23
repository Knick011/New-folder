// src/screens/SettingsScreen.js (Updated with improved icons and UI)
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  SafeAreaView, 
  Alert,
  StatusBar,
  Platform,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EnhancedTimerService from '../services/EnhancedTimerService';
import QuizService from '../services/QuizService';
import SoundService from '../services/SoundService';
import EnhancedScoreService from '../services/EnhancedScoreService';
import NotificationService from '../services/NotificationService';

const SettingsScreen = ({ navigation }) => {
  const [normalReward, setNormalReward] = useState(30); // Seconds for correct answer
  const [milestoneReward, setMilestoneReward] = useState(120); // Seconds for milestone
  const [showMascot, setShowMascot] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [highestStreak, setHighestStreak] = useState(0);
  const [scoreInfo, setScoreInfo] = useState(null);
  const [appVersion, setAppVersion] = useState("1.0.0");
  
  // Popup selector states
  const [showNormalRewardSelector, setShowNormalRewardSelector] = useState(false);
  const [showMilestoneRewardSelector, setShowMilestoneRewardSelector] = useState(false);
  
  useEffect(() => {
    loadSettings();
    loadScoreData();
  }, []);
  
  const loadSettings = async () => {
    try {
      // Load mascot setting
      const mascotEnabled = await AsyncStorage.getItem('brainbites_show_mascot');
      if (mascotEnabled !== null) {
        setShowMascot(mascotEnabled === 'true');
      }
      
      // Load sounds setting
      const sounds = await AsyncStorage.getItem('brainbites_sounds_enabled');
      if (sounds !== null) {
        setSoundsEnabled(sounds === 'true');
      }
      
      // Load reward settings
      const nReward = await AsyncStorage.getItem('brainbites_normal_reward');
      if (nReward !== null) {
        setNormalReward(parseInt(nReward, 10));
      }
      
      const mReward = await AsyncStorage.getItem('brainbites_milestone_reward');
      if (mReward !== null) {
        setMilestoneReward(parseInt(mReward, 10));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  
  const loadScoreData = async () => {
    try {
      await EnhancedScoreService.loadSavedData();
      const info = EnhancedScoreService.getScoreInfo();
      setScoreInfo(info);
      setHighestStreak(info.highestStreak);
    } catch (error) {
      console.error('Error loading score data:', error);
    }
  };
  
  const handleClearProgress = async () => {
    // Play button sound
    SoundService.playButtonPress();
    
    try {
      // Display confirmation dialog
      Alert.alert(
        'Reset All Progress',
        'This will reset all your progress, time credits, scores, streaks, and question history. This cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Reset Everything',
            style: 'destructive',
            onPress: async () => {
              // Clear AsyncStorage
              await AsyncStorage.multiRemove([
                'brainbites_timer_data',
                'brainbites_quiz_data',
                'brainbites_score_data',
                'brainbites_leaderboard'
              ]);
              
              // Reset services
              await QuizService.resetUsedQuestions();
              EnhancedScoreService.resetSession();
              
              // Reload data
              loadSettings();
              loadScoreData();
              
              // Return to home
              navigation.navigate('Home');
              
              // Show success message
              setTimeout(() => {
                Alert.alert('Reset Complete', 'All data has been reset.');
              }, 500);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Failed to reset data. Please try again.');
    }
  };
  
  const handleRewardChange = (type, value) => {
    // Play button sound
    SoundService.playButtonPress();
    
    if (type === 'normal') {
      setNormalReward(value);
      AsyncStorage.setItem('brainbites_normal_reward', value.toString());
    } else {
      setMilestoneReward(value);
      AsyncStorage.setItem('brainbites_milestone_reward', value.toString());
    }
  };
  
  const handleToggleMascot = (value) => {
    // Play button sound
    SoundService.playButtonPress();
    
    setShowMascot(value);
    AsyncStorage.setItem('brainbites_show_mascot', value.toString());
  };
  
  const handleToggleSounds = (value) => {
    setSoundsEnabled(value);
    AsyncStorage.setItem('brainbites_sounds_enabled', value.toString());
    
    // Update SoundService
    SoundService.toggleSounds(value);
    
    // Play test sound if enabled
    if (value) {
      SoundService.playButtonPress();
    }
  };
  
  const handleAddTestTime = () => {
    // Play button sound
    SoundService.playButtonPress();
    
    // Add 5 minutes (300 seconds) for testing
    EnhancedTimerService.addTimeCredits(300);
    Alert.alert('Added 5 minutes of test time');
  };
  
  const handleGoBack = () => {
    // Play button sound
    SoundService.playButtonPress();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFF8E7" barStyle="dark-content" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>Your Stats</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="star" size={28} color="#FF9F1C" style={styles.statIcon} />
              <Text style={styles.statValue}>{(scoreInfo?.dailyScore ?? 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Daily Score</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="fire" size={28} color="#FF9F1C" style={styles.statIcon} />
              <Text style={styles.statValue}>{highestStreak}</Text>
              <Text style={styles.statLabel}>Highest Streak</Text>
            </View>
          </View>

          {/* Time Management Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="clock-alert" size={28} color="#F44336" style={styles.statIcon} />
              <Text style={styles.statValue}>-{scoreInfo?.overtimePenalty}</Text>
              <Text style={styles.statLabel}>Overtime Penalty</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="piggy-bank" size={28} color="#4CAF50" style={styles.statIcon} />
              <Text style={styles.statValue}>+{scoreInfo?.dailyRolloverBonus}</Text>
              <Text style={styles.statLabel}>Saved Time Bonus</Text>
            </View>
          </View>
        </View>
        
        {/* Time Rewards Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="clock-time-four-outline" size={22} color="#FF9F1C" />
            <Text style={styles.sectionTitle}>Time Rewards</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Icon name="check-circle-outline" size={20} color="#4CAF50" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingLabel}>Correct Answer Reward</Text>
                <Text style={styles.settingDescription}>
                  Time added for each correct answer
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.selectorButton}
              onPress={() => setShowNormalRewardSelector(true)}
            >
              <Text style={styles.selectorButtonText}>
                {normalReward < 60 ? `${normalReward}s` : `${normalReward / 60}m`}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Icon name="fire" size={20} color="#FF9F1C" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingLabel}>Milestone Reward</Text>
                <Text style={styles.settingDescription}>
                  Bonus time for streak milestones (every 5)
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.selectorButton}
              onPress={() => setShowMilestoneRewardSelector(true)}
            >
              <Text style={styles.selectorButtonText}>
                {milestoneReward < 60 ? `${milestoneReward}s` : `${milestoneReward / 60}m`}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* App Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="tune-vertical" size={22} color="#FF9F1C" />
            <Text style={styles.sectionTitle}>App Preferences</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Icon name="account-cowboy-hat" size={20} color="#9C27B0" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingLabel}>Show Mascot</Text>
                <Text style={styles.settingDescription}>
                  Display the helpful mascot character
                </Text>
              </View>
            </View>
            <Switch
              value={showMascot}
              onValueChange={handleToggleMascot}
              trackColor={{ false: '#e0e0e0', true: '#FF9F1C' }}
              thumbColor={showMascot ? '#fff' : '#fff'}
              ios_backgroundColor="#e0e0e0"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Icon name="volume-high" size={20} color="#2196F3" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingDescription}>
                  Play sounds for actions and events
                </Text>
              </View>
            </View>
            <Switch
              value={soundsEnabled}
              onValueChange={handleToggleSounds}
              trackColor={{ false: '#e0e0e0', true: '#FF9F1C' }}
              thumbColor={soundsEnabled ? '#fff' : '#fff'}
              ios_backgroundColor="#e0e0e0"
            />
          </View>
        </View>
        
        {/* Data Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="database" size={22} color="#FF9F1C" />
            <Text style={styles.sectionTitle}>Data Management</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleClearProgress}
          >
            <Icon name="delete-outline" size={22} color="white" />
            <Text style={styles.dangerButtonText}>Reset All Progress</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={handleAddTestTime}
          >
            <Icon name="clock-plus-outline" size={22} color="white" />
            <Text style={styles.testButtonText}>Add Test Time (5 min)</Text>
          </TouchableOpacity>
        </View>
        
        {/* Debug Section - Only show in development */}
        {__DEV__ && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Icon name="bug" size={22} color="#FF9F1C" />
              <Text style={styles.sectionTitle}>Debug Tools</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => {
                EnhancedTimerService.addTimeCredits(300); // Add 5 minutes
                Alert.alert('Debug', 'Added 5 minutes of screen time');
              }}
            >
              <Icon name="clock-plus-outline" size={22} color="white" />
              <Text style={styles.testButtonText}>Add 5 Minutes Time</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => {
                const debug = EnhancedTimerService.getDebugInfo();
                Alert.alert('Debug Info', 
                  `Available Time: ${debug.formattedTime}\n` +
                  `Is Tracking: ${debug.isRunning ? 'YES' : 'NO'}\n` +
                  `App State: ${debug.isBrainBitesActive ? 'ACTIVE' : 'BACKGROUND'}\n` +
                  `App State: ${debug.appState}\n` +
                  `Has Timer: ${debug.hasTimer ? 'YES' : 'NO'}`
                );
              }}
            >
              <Icon name="information-outline" size={22} color="white" />
              <Text style={styles.testButtonText}>Show Debug Info</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#F44336' }]}
              onPress={() => {
                const currentTime = EnhancedTimerService.getAvailableTime();
                EnhancedTimerService.addTimeCredits(-currentTime);
                Alert.alert('Debug', 'Cleared all screen time');
              }}
            >
              <Icon name="delete-outline" size={22} color="white" />
              <Text style={styles.testButtonText}>Clear All Time</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => {
                EnhancedTimerService.addTimeCredits(30); // Add 30 seconds
                Alert.alert('Debug', 'Added 30 seconds - now press home button to test tracking');
              }}
            >
              <Icon name="timer-outline" size={22} color="white" />
              <Text style={styles.testButtonText}>Test 30s + Go to Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#9C27B0' }]}
              onPress={() => {
                NotificationService.testNotification();
                Alert.alert('Debug', 'Test notification sent! Check your notification panel.');
              }}
            >
              <Icon name="bell-ring-outline" size={22} color="white" />
              <Text style={styles.testButtonText}>Test Notification</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('AudioTimerTest')}
            >
              <Icon name="timer" size={22} color="#FF9F1C" />
              <Text style={styles.settingText}>Test Audio Timer</Text>
              <Icon name="chevron-right" size={22} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('AnalyticsTest')}
            >
              <Icon name="google-analytics" size={22} color="#FF9F1C" />
              <Text style={styles.settingText}>Test Analytics</Text>
              <Icon name="chevron-right" size={22} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('Welcome')}
            >
              <Icon name="home" size={22} color="#FF9F1C" />
              <Text style={styles.settingText}>Test Welcome Screen</Text>
              <Icon name="chevron-right" size={22} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.footer}>
          <Icon name="brain" size={32} color="#FF9F1C" style={styles.footerIcon} />
          <Text style={styles.footerText}>Brain Bites</Text>
          <Text style={styles.versionText}>Version {appVersion}</Text>
        </View>
      </ScrollView>
      
      {/* Normal Reward Selector Modal */}
      <Modal
        visible={showNormalRewardSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNormalRewardSelector(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNormalRewardSelector(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Correct Answer Reward</Text>
                <View style={styles.modalOptions}>
                  <TouchableOpacity 
                    style={[
                      styles.modalOption,
                      normalReward === 15 && styles.selectedModalOption
                    ]}
                    onPress={() => {
                      handleRewardChange('normal', 15);
                      setShowNormalRewardSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      normalReward === 15 && styles.selectedModalOptionText
                    ]}>15 seconds</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.modalOption,
                      normalReward === 30 && styles.selectedModalOption
                    ]}
                    onPress={() => {
                      handleRewardChange('normal', 30);
                      setShowNormalRewardSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      normalReward === 30 && styles.selectedModalOptionText
                    ]}>30 seconds</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.modalOption,
                      normalReward === 60 && styles.selectedModalOption
                    ]}
                    onPress={() => {
                      handleRewardChange('normal', 60);
                      setShowNormalRewardSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      normalReward === 60 && styles.selectedModalOptionText
                    ]}>1 minute</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Milestone Reward Selector Modal */}
      <Modal
        visible={showMilestoneRewardSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMilestoneRewardSelector(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMilestoneRewardSelector(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Milestone Reward</Text>
                <View style={styles.modalOptions}>
                  <TouchableOpacity 
                    style={[
                      styles.modalOption,
                      milestoneReward === 60 && styles.selectedModalOption
                    ]}
                    onPress={() => {
                      handleRewardChange('milestone', 60);
                      setShowMilestoneRewardSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      milestoneReward === 60 && styles.selectedModalOptionText
                    ]}>1 minute</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.modalOption,
                      milestoneReward === 120 && styles.selectedModalOption
                    ]}
                    onPress={() => {
                      handleRewardChange('milestone', 120);
                      setShowMilestoneRewardSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      milestoneReward === 120 && styles.selectedModalOptionText
                    ]}>2 minutes</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.modalOption,
                      milestoneReward === 300 && styles.selectedModalOption
                    ]}
                    onPress={() => {
                      handleRewardChange('milestone', 300);
                      setShowMilestoneRewardSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      milestoneReward === 300 && styles.selectedModalOptionText
                    ]}>5 minutes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  statsSection: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  statLabel: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  settingIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  settingDescription: {
    fontSize: 14,
    color: '#777',
    maxWidth: 200,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  dangerButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: 'rgba(244, 67, 54, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  testButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: 'rgba(33, 150, 243, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  footer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  footerIcon: {
    marginBottom: 8,
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  versionText: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  debugSection: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    textAlign: 'center',
  },
  modalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalOption: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#FF9F1C',
    borderRadius: 8,
  },
  selectedModalOption: {
    backgroundColor: '#FF9F1C',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  selectedModalOptionText: {
    color: 'white',
  },
});

export default SettingsScreen;