// src/screens/HomeScreen.js - Simplified with daily streak instead of real-time timer
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Platform,
  AppState
} from 'react-native';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import EnhancedTimerService from '../services/EnhancedTimerService';
import QuizService from '../services/QuizService';
import SoundService from '../services/SoundService';
import EnhancedScoreService from '../services/EnhancedScoreService';
import EnhancedMascotDisplay from '../components/mascot/EnhancedMascotDisplay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../styles/theme';
import commonStyles from '../styles/commonStyles';
import TimeManagementDisplay from '../components/TimeManagementDisplay';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  const [user, setUser] = useState({ name: 'Cabby' });
  const [isInitializing, setIsInitializing] = useState(true);
  const [availableTime, setAvailableTime] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [categories, setCategories] = useState(['funfacts', 'psychology']);
  const [showMascot, setShowMascot] = useState(false);
  const [mascotType, setMascotType] = useState('happy');
  const [mascotMessage, setMascotMessage] = useState(null);
  const [mascotEnabled, setMascotEnabled] = useState(true);
  const [scoreInfo, setScoreInfo] = useState({
    dailyScore: 0,
    currentStreak: 0,
    totalDaysPlayed: 0,
    allTimeHighScore: 0
  });
  const [showIntro, setShowIntro] = useState(false);
  const [rewardSettings, setRewardSettings] = useState({
    normalReward: 30,
    milestoneReward: 120
  });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const streakCardAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  // Initialize with empty animation values array
  const categoryAnimValues = useRef([]).current;
  
  // This effect runs when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Function to load all data for the screen
      const loadData = async () => {
        const time = EnhancedTimerService.getAvailableTime();
        setAvailableTime(time);
        
        const info = EnhancedScoreService.getScoreInfo();
        setScoreInfo(info);

        const settings = await QuizService.getRewardSettings();
        setRewardSettings(settings);

        // Load daily streak data
        await loadDailyStreakData();

        if (isInitializing) {
          setIsInitializing(false);
        }
      };
      
      loadData(); // Load data initially on focus
      
      // Check if user just returned from quiz and update streak if needed
      const checkQuizCompletion = async () => {
        const scoreInfo = EnhancedScoreService.getScoreInfo();
        // If user has a daily score > 0 and hasn't played today, they just completed a quiz
        if (scoreInfo.dailyScore > 0 && !hasPlayedToday) {
          console.log('User returned from quiz with score, updating streak');
          await updateDailyStreak();
        }
      };
      
      // Check for quiz completion after a short delay to ensure data is loaded
      setTimeout(checkQuizCompletion, 500);
      
      // Set up listeners for real-time updates
      const scoreListener = EnhancedScoreService.addEventListener((event) => {
        // Just reload all data on any score event
        loadData();
      });
      
      const timerListener = EnhancedTimerService.addEventListener((event) => {
        // For timer, directly use the event data for fastest update
        if (event.newTotal !== undefined) {
          setAvailableTime(event.newTotal);
        } else if (event.availableTime !== undefined) {
          setAvailableTime(event.availableTime);
        }
      });
      
      // Clean up listeners when the screen loses focus
      return () => {
        scoreListener();
        timerListener();
      };
    }, [isInitializing, hasPlayedToday]) // Rerun if isInitializing or hasPlayedToday changes
  );

  // Load daily streak data from AsyncStorage
  const loadDailyStreakData = async () => {
    try {
      const streakDataString = await AsyncStorage.getItem('brainbites_daily_streak');
      if (streakDataString) {
        const streakData = JSON.parse(streakDataString);
        const today = new Date().toDateString();
        const lastPlayedDate = new Date(streakData.lastPlayedDate).toDateString();
        
        // Check if user has played today
        const playedToday = today === lastPlayedDate;
        setHasPlayedToday(playedToday);
        
        // Set the streak count
        setDailyStreak(streakData.streak || 0);
        
        console.log('Loaded streak data:', { 
          streak: streakData.streak, 
          lastPlayedDate: streakData.lastPlayedDate,
          playedToday,
          today
        });
      } else {
        // First time user, initialize streak data
        setDailyStreak(0);
        setHasPlayedToday(false);
        console.log('No streak data found, initializing new user');
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
      setDailyStreak(0);
      setHasPlayedToday(false);
    }
  };

  // This effect handles the initial onboarding check
  useEffect(() => {
    const checkFirstLaunch = async () => {
      const hasLaunched = await AsyncStorage.getItem('brainbites_onboarding_complete');
      if (!hasLaunched) {
        setShowIntro(true);
      }
    };
    checkFirstLaunch();
  }, []);

  const handleScoreUpdate = (event) => {
    if (event.event === 'scoreUpdated' || event.event === 'dailyReset') {
      const info = EnhancedScoreService.getScoreInfo();
      setScoreInfo(info);
    }
  };

  const handleTimerUpdate = (event) => {
    if (event.event === 'timeUpdate' || event.event === 'creditsAdded' || event.event === 'timeLoaded') {
      setAvailableTime(event.newTotal !== undefined ? event.newTotal : event.availableTime);
    }
  };
  
  useEffect(() => {
    // Play menu music when entering home screen
    SoundService.startMenuMusic();
    
    // Load categories
    loadCategories();
    
    // Load settings
    loadSettings();
    
    // Initialize animation values for categories
    initializeCategoryAnimations(categories);
    
    // Start entrance animations
    startEntranceAnimations();
    
    // Show welcome mascot after a delay
    const welcomeTimer = setTimeout(() => {
      if (mascotEnabled) {
        showInitialMascotMessage();
      }
    }, 2000);

    // Listen for daily reset events
    const scoreListener = EnhancedScoreService.addEventListener((event) => {
      if (['dailyReset', 'scoreUpdated', 'penaltyApplied'].includes(event.event)) {
        loadData();
      }
      if (event.event === 'dailyReset') {
        handleDailyReset(event);
      } else if (event.event === 'showMessage') {
        if (event.type === 'dailyReset' && mascotEnabled) {
          setMascotType('excited');
          setMascotMessage(event.message);
          setShowMascot(true);
        } else if (event.type === 'penalty' && mascotEnabled) {
          setMascotType('depressed');
          setMascotMessage(event.message);
          setShowMascot(true);
        } else if (event.type === 'rollover' && mascotEnabled) {
          setMascotType('excited');
          setMascotMessage(event.message);
          setShowMascot(true);
        }
      }
    });
    
    return () => {
      clearTimeout(welcomeTimer);
      scoreListener();
    };
  }, []);
  
  const updateDailyStreak = async () => {
    const today = new Date().toDateString();
    
    // Only update streak if user hasn't played today
    if (!hasPlayedToday) {
      const newStreak = dailyStreak + 1;
      const streakData = {
        streak: newStreak,
        lastPlayedDate: today
      };
      
      await AsyncStorage.setItem('brainbites_daily_streak', JSON.stringify(streakData));
      
      setDailyStreak(newStreak);
      setHasPlayedToday(true);
      
      console.log('Updated streak:', { newStreak, today });
      
      // Show streak celebration
      if (mascotEnabled) {
        showStreakCelebration(newStreak);
      }
    } else {
      console.log('User already played today, streak not updated');
    }
  };
  
  const showStreakCelebration = (streak) => {
    let message = '';
    let type = 'excited';
    
    if (streak === 1) {
      message = "🎉 Great start! You've begun your daily streak!\n\nKeep coming back every day to maintain it!";
    } else if (streak % 7 === 0) {
      message = `🔥 AMAZING! ${streak} day streak!\n\nThat's ${streak / 7} full week${streak > 7 ? 's' : ''}! You're unstoppable!`;
    } else if (streak % 30 === 0) {
      message = `🏆 LEGENDARY! ${streak} day streak!\n\nA full month of learning! You're a true Brain Bites champion!`;
    } else {
      message = `🔥 ${streak} day streak! Keep it up!\n\nYour dedication to learning is inspiring!`;
    }
    
    setMascotType(type);
    setMascotMessage(message);
    setShowMascot(true);
  };
  
  const startEntranceAnimations = () => {
    Animated.parallel([
      // Fade in everything
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      
      // Scale in
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      
      // Streak card animation
      Animated.sequence([
        Animated.delay(250),
        Animated.spring(streakCardAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      
      // Bounce animation for streak icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ),
    ]).start();
  };
  
  // Initialize animation values for categories
  const initializeCategoryAnimations = (categoriesList) => {
    // Clear existing animation values
    categoryAnimValues.length = 0;
    
    // Create animation values for each category
    categoriesList.forEach((_, index) => {
      categoryAnimValues[index] = new Animated.Value(0);
    });
    
    // Start staggered animations
    const animations = categoryAnimValues.map((anim, index) => 
      Animated.sequence([
        Animated.delay(500 + (index * 100)),
        Animated.spring(anim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Start all animations in parallel
    Animated.parallel(animations).start();
  };
  
  // Update category animations when categories change
  useEffect(() => {
    // Initialize animation values for new categories
    initializeCategoryAnimations(categories);
  }, [categories]);
  
  const loadCategories = async () => {
    try {
      const cats = await QuizService.getCategories();
      if (cats && cats.length > 0) {
        setCategories(cats);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };
  
  const loadSettings = async () => {
    try {
      const mascotSetting = await AsyncStorage.getItem('brainbites_show_mascot');
      if (mascotSetting !== null) {
        setMascotEnabled(mascotSetting === 'true');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  
  // Show initial mascot message
  const showInitialMascotMessage = () => {
    if (!mascotEnabled) return;
    
    if (!hasPlayedToday) {
      setMascotType('happy');
      setMascotMessage(`Welcome back! 🌟\n\nReady to continue your learning journey?\nPlay a quiz to maintain your ${dailyStreak > 0 ? dailyStreak + ' day' : ''} streak!`);
      setShowMascot(true);
    }
  };
  
  const handleStartQuiz = async (category) => {
    // Play button press sound
    SoundService.playButtonPress();
    
    // Hide mascot
    setShowMascot(false);
    
    // Stop menu music
    SoundService.stopMusic();
    
    // Navigate to quiz
    navigation.navigate('Quiz', { category });
  };
  
  const handleOpenSettings = () => {
    // Play button press sound
    SoundService.playButtonPress();
    
    // Hide mascot
    setShowMascot(false);
    
    navigation.navigate('Settings');
  };
  
  const handleMascotDismiss = () => {
    setShowMascot(false);
  };
  
  const handleDailyReset = async (resetData) => {
    // Play celebration sound
    SoundService.playStreak();
    
    // Update daily streak if they played yesterday
    let newStreak = dailyStreak;
    if (resetData.yesterdayScore > 0) {
      newStreak = dailyStreak + 1;
    } else {
      newStreak = 0;
    }
    
    // Update streak in AsyncStorage
    const today = new Date().toDateString();
    const streakData = {
      streak: newStreak,
      lastPlayedDate: today
    };
    
    await AsyncStorage.setItem('brainbites_daily_streak', JSON.stringify(streakData));
    
    setDailyStreak(newStreak);
    setHasPlayedToday(false);
    
    console.log('Daily reset - updated streak:', { newStreak, today });
  };
  
  const handlePeekingMascotPress = () => {
    if (!mascotEnabled) return;
    
    const time = EnhancedTimerService.getAvailableTime();
    const formattedTime = EnhancedTimerService.formatTime(time);
    
    let message = `📊 Today's Stats:\n\n`;
    message += `🎯 Daily Score: ${(scoreInfo.dailyScore ?? 0).toLocaleString()}\n`;
    message += `🔥 Current Streak: ${scoreInfo.currentStreak ?? 0}\n`;
    message += `⏱️ App Time: ${formattedTime}\n`;
    message += `📅 Days Played: ${scoreInfo.totalDaysPlayed ?? 0}\n\n`;
    
    if ((scoreInfo.dailyScore ?? 0) < 0) {
      message += `⚠️ You're in overtime debt!\nEarn points to get back to positive! 💪`;
    } else if (!hasPlayedToday) {
      message += `Play a quiz to maintain your streak! 🚀`;
    } else {
      message += `Keep going! Beat your best: ${(scoreInfo.allTimeHighScore ?? 0).toLocaleString()} 🏆`;
    }
    
    setMascotType('happy');
    setMascotMessage(message);
    setShowMascot(true);
  };
  
  const handleStreakCardPress = () => {
    // Play button press sound
    SoundService.playButtonPress();
    
    // Show stats in mascot
    handlePeekingMascotPress();
  };
  
  const getCategoryIcon = (category) => {
    // Map categories to icons - using more common icons that are definitely available
    const iconMap = {
      'funfacts': 'lightbulb-outline',
      'psychology': 'head-question-outline',
      'math': 'calculator',
      'science': 'flask',
      'history': 'book-open-variant',
      'english': 'alphabetical',
      'general': 'help-circle-outline'
    };
    
    return iconMap[category] || 'help-circle-outline';
  };
  
  const getCategoryColor = (category) => {
    // Map categories to colors
    const colorMap = {
      'funfacts': theme.colors.primary,
      'psychology': '#FF6B6B',
      'math': '#4CAF50',
      'science': '#2196F3',
      'history': '#9C27B0',
      'english': '#3F51B5',
      'general': '#607D8B'
    };
    
    return colorMap[category] || theme.colors.primary;
  };
  
  const getCategoryDescription = (category) => {
    const descriptions = {
      'funfacts': 'Discover amazing facts',
      'psychology': 'Explore the mind',
      'math': 'Master numbers',
      'science': 'Unlock mysteries',
      'history': 'Journey through time',
      'english': 'Master language',
      'general': 'Test your knowledge'
    };
    
    return descriptions[category] || 'Answer to earn time';
  };
  
  // Ensure we have valid animation values for categories
  const getAnimValue = (index) => {
    // Make sure we have a valid animation value, or create a default
    return categoryAnimValues[index] || new Animated.Value(1);
  };
  
  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.leaderboardButton}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <Icon name="trophy" size={24} color="#FFD700" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={handleOpenSettings}
            >
              <Icon name="cog" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.header}>
            {/* Removed the title and subtitle here */}
          </View>
          
          {/* Daily Streak Card */}
          <TouchableOpacity 
            style={[
              styles.streakCard,
              {
                opacity: streakCardAnim,
                transform: [
                  { 
                    translateY: streakCardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }
                ]
              }
            ]}
            onPress={handleStreakCardPress}
            activeOpacity={0.8}
          >
            <View style={styles.streakHeader}>
              <Animated.View
                style={{
                  transform: [
                    { translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -5]
                    })}
                  ]
                }}
              >
                <Icon 
                  name="fire" 
                  size={40} 
                  color={dailyStreak > 0 ? '#FF5722' : '#ccc'} 
                />
              </Animated.View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakTitle}>Daily Streak</Text>
                <Text style={styles.streakValue}>{dailyStreak} day{dailyStreak !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.streakStats}>
                <View style={styles.statItem}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.statValue}>{(scoreInfo.dailyScore ?? 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Icon name="timer" size={16} color="#4CAF50" />
                  <Text style={styles.statValue}>{EnhancedTimerService.formatTime(availableTime)}</Text>
                </View>
              </View>
            </View>
            
            {/* Streak calendar preview */}
            <View style={styles.streakCalendar}>
              {[...Array(7)].map((_, index) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - index));
                const isToday = index === 6;
                const isPlayed = index < 6 ? (dailyStreak > (6 - index)) : hasPlayedToday;
                
                return (
                  <View key={index} style={styles.calendarDay}>
                    <Text style={styles.calendarDayText}>
                      {date.toLocaleDateString('en', { weekday: 'narrow' })}
                    </Text>
                    <View style={[
                      styles.calendarDot,
                      isPlayed && styles.calendarDotActive,
                      isToday && styles.calendarDotToday
                    ]}>
                      {isPlayed && <Icon name="check" size={12} color="white" />}
                    </View>
                  </View>
                );
              })}
            </View>
            
            <Text style={styles.streakMessage}>
              Play today to continue your streak!
            </Text>
          </TouchableOpacity>
          
          {/* Time Management Display */}
          <TimeManagementDisplay 
            style={{ marginTop: 0 }}
            onPress={handlePeekingMascotPress}
          />
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quiz Categories</Text>
            <Text style={styles.sectionSubtitle}>Choose a topic to start learning</Text>
          </View>
          
          <View style={styles.categoriesContainer}>
            {categories.map((category, index) => (
              <Animated.View
                key={category}
                style={{
                  opacity: getAnimValue(index),
                  transform: [
                    { 
                      translateY: getAnimValue(index).interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      })
                    }
                  ],
                  width: '48%',
                }}
              >
                <TouchableOpacity 
                  style={[
                    styles.categoryCard, 
                    { borderColor: getCategoryColor(category) }
                  ]}
                  onPress={() => handleStartQuiz(category)}
                  activeOpacity={0.8}
                >
                  <View 
                    style={[
                      styles.categoryIcon, 
                      { backgroundColor: getCategoryColor(category) }
                    ]}
                  >
                    <Icon name={getCategoryIcon(category)} size={24} color="white" />
                  </View>
                  <Text style={styles.categoryName}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  <Text style={styles.categorySubtext}>
                    {getCategoryDescription(category)}
                  </Text>
                  
                  {/* Start quiz button */}
                  <View style={[styles.startButton, { backgroundColor: getCategoryColor(category) }]}>
                    <Icon name="play" size={14} color="white" />
                    <Text style={styles.startButtonText}>Start</Text>
                  </View>
                  
                  {/* Category arrow indicator */}
                  <View style={styles.categoryArrow}>
                    <Icon name="arrow-right-circle" size={18} color={getCategoryColor(category)} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
          
          <View style={styles.footer} />
        </ScrollView>
      </Animated.View>
      
      {/* Enhanced Mascot */}
      <EnhancedMascotDisplay
        type={mascotType}
        position="left"
        showMascot={showMascot}
        message={mascotMessage}
        onDismiss={handleMascotDismiss}
        onMessageComplete={handleMascotDismiss}
        autoHide={false}
        fullScreen={true}
        onPeekingPress={handlePeekingMascotPress}
        isQuizScreen={false}
        mascotEnabled={mascotEnabled}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  leaderboardButton: {
    position: 'absolute',
    top: 16,
    right: 60,
    zIndex: 10,
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  streakCard: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.1)',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakInfo: {
    flex: 1,
    marginLeft: 16,
  },
  streakTitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  streakStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  streakCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarDay: {
    alignItems: 'center',
  },
  calendarDayText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  calendarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDotActive: {
    backgroundColor: '#4CAF50',
  },
  calendarDotToday: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  streakMessage: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-black',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    ...theme.shadows.sm,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    position: 'relative',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: theme.colors.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  categorySubtext: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  categoryArrow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  footer: {
    height: 100, // Extra space at bottom to avoid mascot overlap
  },
  dailyScoreCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dailyScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyScoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    marginLeft: 12,
  },
  dailyScoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});

export default HomeScreen;