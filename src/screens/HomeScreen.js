// src/screens/HomeScreen.js - Complete updated version with enhanced mascot
import React, { useState, useEffect, useRef } from 'react';
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
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TimerService from '../services/TimerService';
import QuizService from '../services/QuizService';
import SoundService from '../services/SoundService';
import EnhancedMascotDisplay from '../components/mascot/EnhancedMascotDisplay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../styles/theme';
import commonStyles from '../styles/commonStyles';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [availableTime, setAvailableTime] = useState(0);
  const [categories, setCategories] = useState(['funfacts', 'psychology']);
  const [showMascot, setShowMascot] = useState(false);
  const [mascotType, setMascotType] = useState('happy');
  const [mascotMessage, setMascotMessage] = useState(null);
  const [mascotEnabled, setMascotEnabled] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const timeCardAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  // Initialize with empty animation values array
  const categoryAnimValues = useRef([]).current;
  
  useEffect(() => {
    // Play menu music when entering home screen
    SoundService.startMenuMusic();
    
    // Load initial time
    loadAvailableTime();
    
    // Add timer event listener
    const removeListener = TimerService.addEventListener(handleTimerEvent);
    
    // Load categories
    loadCategories();
    
    // Load settings
    loadSettings();
    
    // Initialize animation values for categories
    initializeCategoryAnimations(categories);
    
    // Start entrance animations
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
      
      // Time card animation
      Animated.sequence([
        Animated.delay(250),
        Animated.spring(timeCardAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      
      // Bounce animation for time icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ),
    ]).start();
    
    // Show welcome mascot after a delay (only if enabled)
    setTimeout(() => {
      if (mascotEnabled) {
        updateMascotMessage();
      }
    }, 2000);
    
    return () => {
      removeListener();
    };
  }, []);
  
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
  
  useEffect(() => {
    // Update mascot message when time changes (only if mascot is enabled)
    if (mascotEnabled) {
      updateMascotMessage();
    }
  }, [availableTime, mascotEnabled]);
  
  // Update category animations when categories change
  useEffect(() => {
    // Initialize animation values for new categories
    initializeCategoryAnimations(categories);
  }, [categories]);
  
  const loadAvailableTime = async () => {
    const timeInSeconds = TimerService.getAvailableTime();
    setAvailableTime(timeInSeconds);
  };
  
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
  
  const updateMascotMessage = () => {
    if (!mascotEnabled) return;
    
    if (availableTime <= 0) {
      setMascotType('depressed');
      setMascotMessage("You're out of app time! 😢\n\nAnswer some questions to earn more time and unlock your favorite apps!\n\nLet's start learning! 📚");
      setShowMascot(true);
    } else {
      setShowMascot(false);
    }
  };
  
  const handleTimerEvent = (event) => {
    if (event.event === 'creditsAdded' || event.event === 'timeUpdate') {
      setAvailableTime(TimerService.getAvailableTime());
    }
  };
  
  const handleStartQuiz = (category) => {
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
  
  const handleTimeCardPress = () => {
    // Show information about current time with mascot
    if (mascotEnabled) {
      let message = '';
      let type = 'happy';
      
      if (availableTime <= 0) {
        type = 'depressed';
        message = "You have no app time remaining! 😔\n\nComplete quizzes to earn time:\n• Each correct answer = 30 seconds\n• Streak milestones = 2 minutes bonus!";
      } else {
        type = 'happy';
        const hours = Math.floor(availableTime / 3600);
        const minutes = Math.floor((availableTime % 3600) / 60);
        const seconds = availableTime % 60;
        
        let timeBreakdown = '';
        if (hours > 0) {
          timeBreakdown = `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (minutes > 0) {
          timeBreakdown = `${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''}`;
        } else {
          timeBreakdown = `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
        
        message = `You have ${timeBreakdown} of app time! ⏰\n\nUse it wisely on your favorite apps.\nWhen it runs out, come back to earn more! 🧠`;
      }
      
      setMascotType(type);
      setMascotMessage(message);
      setShowMascot(true);
    }
  };
  
  const getCategoryIcon = (category) => {
    // Map categories to icons
    const iconMap = {
      'funfacts': 'lightbulb-on-outline',
      'psychology': 'brain',
      'math': 'calculator-variant-outline',
      'science': 'flask-outline',
      'history': 'book-open-page-variant-outline',
      'english': 'alphabetical-variant',
      'general': 'text-box-outline'
    };
    
    return iconMap[category] || 'help-circle-outline';
  };
  
  const getCategoryColor = (category) => {
    // Map categories to colors (similar to web version)
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
  
  const formattedTime = TimerService.formatTime(availableTime);
  
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
          {/* Settings button */}
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={handleOpenSettings}
          >
            <Icon name="cog" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.header}>
            <Text style={styles.title}>Brain Bites Mobile</Text>
            <Text style={styles.subtitle}>Learn and earn app time!</Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.timeCard,
              {
                opacity: timeCardAnim,
                transform: [
                  { 
                    translateY: timeCardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }
                ]
              }
            ]}
            onPress={handleTimeCardPress}
            activeOpacity={0.8}
          >
            {/* Enhanced icon with pulse animation */}
            <Animated.View
              style={{
                transform: [
                  { scale: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1]
                  })}
                ]
              }}
            >
              <Icon name="timer-sand" size={40} color={theme.colors.primary} />
            </Animated.View>
            <Text style={styles.timeTitle}>Available App Time</Text>
            <Text style={styles.timeValue}>{formattedTime}</Text>
            
            {/* Time status indicator */}
            <View style={[
              styles.timeStatus,
              availableTime <= 0 ? styles.timeStatusEmpty :
              availableTime < 300 ? styles.timeStatusLow :
              styles.timeStatusGood
            ]}>
              <Icon 
                name={
                  availableTime <= 0 ? "alert-circle" :
                  availableTime < 300 ? "clock-alert" :
                  "check-circle"
                } 
                size={16} 
                color="white" 
              />
              <Text style={styles.timeStatusText}>
                {availableTime <= 0 ? "No time" :
                 availableTime < 300 ? "Low time" :
                 "Good time"}
              </Text>
            </View>
            
            <Text style={styles.timeSubtext}>
              {availableTime <= 0 ? "Complete quizzes to unlock apps" :
               "Tap for details"}
            </Text>
          </TouchableOpacity>
          
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
          
          {/* Quick stats section */}
          <Animated.View 
            style={[
              styles.quickStatsContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.quickStatsTitle}>Quick Tips</Text>
            <View style={styles.quickStatsGrid}>
              <View style={styles.quickStatItem}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.quickStatText}>Correct answer = 30s</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Icon name="fire" size={20} color="#FF9F1C" />
                <Text style={styles.quickStatText}>5 streak = 2min bonus</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Icon name="timer" size={20} color="#2196F3" />
                <Text style={styles.quickStatText}>Fast answers = more points</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Icon name="brain" size={20} color="#9C27B0" />
                <Text style={styles.quickStatText}>Learning makes you smarter</Text>
              </View>
            </View>
          </Animated.View>
          
          <View style={styles.footer} />
        </ScrollView>
      </Animated.View>
      
      {/* Enhanced Mascot with full screen overlay */}
      <EnhancedMascotDisplay
        type={mascotType}
        position="left"
        showMascot={showMascot}
        message={mascotMessage}
        onDismiss={handleMascotDismiss}
        onMessageComplete={handleMascotDismiss}
        autoHide={false} // User can dismiss by tapping
        fullScreen={true} // Use full screen overlay
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
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-black',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  timeCard: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 28, 0.1)',
  },
  timeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    color: theme.colors.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  timeValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  timeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  timeStatusEmpty: {
    backgroundColor: '#F44336',
  },
  timeStatusLow: {
    backgroundColor: '#FF9800',
  },
  timeStatusGood: {
    backgroundColor: '#4CAF50',
  },
  timeStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  timeSubtext: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
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
  quickStatsContainer: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    ...theme.shadows.sm,
    marginBottom: 16,
  },
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textDark,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  quickStatText: {
    fontSize: 12,
    color: theme.colors.textDark,
    marginLeft: 8,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  footer: {
    height: 100, // Extra space at bottom to avoid mascot overlap
  },
});

export default HomeScreen;