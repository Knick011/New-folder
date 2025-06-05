// src/screens/QuizScreen.js - Fixed version with original mascot functionality
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QuizService from '../services/QuizService';
import TimerService from '../services/TimerService';
import SoundService from '../services/SoundService';
import ScoreService from '../services/ScoreService';
import EnhancedMascotDisplay from '../components/mascot/EnhancedMascotDisplay';
import EnhancedTimerService from '../services/EnhancedTimerService';
import NativeTimerService from '../services/NativeTimerService';

const QuizScreen = ({ navigation, route }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [streak, setStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [category, setCategory] = useState(route.params?.category || 'funfacts');
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [streakLevel, setStreakLevel] = useState(0);
  const [isStreakMilestone, setIsStreakMilestone] = useState(false);
  
  // Mascot state - simplified for quiz functionality
  const [mascotType, setMascotType] = useState('happy');
  const [mascotMessage, setMascotMessage] = useState('');
  const [showMascot, setShowMascot] = useState(false);
  
  // Animation values
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const optionsAnim = useRef([]).current;
  const explanationAnim = useRef(new Animated.Value(0)).current;
  const streakAnim = useRef(new Animated.Value(1)).current;
  const pointsAnim = useRef(new Animated.Value(0)).current;
  
  // Timer animation
  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const timerAnimation = useRef(null);
  
  // Store start time for scoring
  const questionStartTime = useRef(0);
  
  useEffect(() => {
    // Start game music
    SoundService.startGameMusic();
    
    // Initialize Score Service
    ScoreService.loadSavedData().then(() => {
      const scoreInfo = ScoreService.getScoreInfo();
      setStreak(scoreInfo.currentStreak);
      setTotalScore(scoreInfo.totalScore);
      setStreakLevel(scoreInfo.streakLevel);
    });
    
    // Load first question
    loadQuestion();
    
    return () => {
      // Stop game music
      SoundService.stopMusic();
      
      // Clear timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      if (timerAnimation.current) {
        timerAnimation.current.stop();
      }
    };
  }, []);

  // Start a new question
  const loadQuestion = async () => {
    setIsLoading(true);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowExplanation(false);
    setShowPointsAnimation(false);
    setIsStreakMilestone(false);
    setShowMascot(false); // Hide mascot when loading new question
    
    // Reset animations
    cardAnim.setValue(0);
    fadeAnim.setValue(0);
    explanationAnim.setValue(0);
    timerAnim.setValue(1);
    
    try {
      const question = await QuizService.getRandomQuestion(category);
      setCurrentQuestion(question);
      setQuestionsAnswered(prev => prev + 1);
      
      // Play button sound
      SoundService.playButtonPress();
      
      // Create animation values for each option
      optionsAnim.length = Object.keys(question.options || {}).length;
      for (let i = 0; i < optionsAnim.length; i++) {
        optionsAnim[i] = new Animated.Value(0);
      }
      
      // Start animations
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        // Staggered options animation
        ...optionsAnim.map((anim, index) => 
          Animated.sequence([
            Animated.delay(400 + (index * 100)),
            Animated.spring(anim, {
              toValue: 1,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
      
      // Start timer animation (20 seconds)
      timerAnimation.current = Animated.timing(timerAnim, {
        toValue: 0,
        duration: 20000,
        useNativeDriver: false, // Need for width animation
        easing: Easing.linear,
      });
      
      timerAnimation.current.start();
      
      // Set timer to show time's up after 20 seconds
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      timerRef.current = setTimeout(() => {
        // Only trigger if no answer selected yet
        if (selectedAnswer === null) {
          handleTimeUp();
        }
      }, 20000);
      
      // Record start time for scoring
      questionStartTime.current = Date.now();
      ScoreService.startQuestionTimer();
      
    } catch (error) {
      console.error('Error loading question:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTimeUp = () => {
    // Check if already answered
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer('TIMEOUT');
    setIsCorrect(false);
    
    // Show explanation with a short delay
    setTimeout(() => {
      setShowExplanation(true);
      showExplanationWithAnimation();
    }, 500);
    
    // Score the answer (incorrect)
    const scoreResult = ScoreService.recordAnswer(false);
    setStreak(0);
    
    // Play incorrect sound
    SoundService.playIncorrect();
    
    // Show mascot for timeout
    showMascotForTimeout();
  };
  
  const showMascotForTimeout = () => {
    setMascotType('sad');
    setMascotMessage("Time's up! ⏰\nDon't worry, you'll get the next one!");
    setShowMascot(true);
  };

  const handleAnswerSelect = (option) => {
    if (selectedAnswer !== null) return; // Prevent multiple selections
    
    // Stop timer animation and clear timeout immediately
    if (timerAnimation.current) {
      timerAnimation.current.stop();
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    setSelectedAnswer(option);
    const correct = option === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    
    // Score the answer
    const scoreResult = ScoreService.recordAnswer(correct);
    
    if (correct) {
      // Update UI based on score result
      setStreak(scoreResult.currentStreak);
      setTotalScore(scoreResult.totalScore);
      setStreakLevel(scoreResult.streakLevel);
      setIsStreakMilestone(scoreResult.isStreakMilestone);
      setPointsEarned(scoreResult.pointsEarned);
      setCorrectAnswers(prev => prev + 1);
      
      // Show points animation
      setShowPointsAnimation(true);
      
      // Animate points popup
      Animated.sequence([
        Animated.timing(pointsAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.delay(1500), // Longer delay to see the points
        Animated.timing(pointsAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start(() => {
        // Fix useInsertionEffect error
        setTimeout(() => {
          setShowPointsAnimation(false);
        }, 0);
      });
      
      // Animate streak counter
      Animated.sequence([
        Animated.timing(streakAnim, {
          toValue: 1.3,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(streakAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
      ]).start();
      
      // Handle milestone FIRST before regular rewards
      if (scoreResult.isStreakMilestone) {
        console.log('🎉 STREAK MILESTONE REACHED:', scoreResult.currentStreak);
        
        // Add milestone bonus time - 2 minutes (120 seconds)
        TimerService.addTimeCredits(120);
        
        // Play streak sound
        SoundService.playStreak();
        
        // Show streak celebration mascot (IMPORTANT: Before explanation)
        setTimeout(() => {
          showMascotForStreak(scoreResult.currentStreak);
        }, 800); // Show after points animation starts
        
        // Show explanation much later
        setTimeout(() => {
          setShowExplanation(true);
          showExplanationWithAnimation();
        }, 3000); // 3 seconds to see streak celebration
        
      } else {
        // Regular correct answer
        TimerService.addTimeCredits(30);
        SoundService.playCorrect();
        
        // Show explanation sooner for regular answers
        setTimeout(() => {
          setShowExplanation(true);
          showExplanationWithAnimation();
        }, 1200);
      }
    } else {
      // Wrong answer
      setStreak(0);
      SoundService.playIncorrect();
      
      // Show mascot for wrong answer
      setTimeout(() => {
        showMascotForWrongAnswer();
      }, 500);
      
      // Show explanation after mascot
      setTimeout(() => {
        setShowExplanation(true);
        showExplanationWithAnimation();
      }, 2000);
    }
  };
  
  const showExplanationWithAnimation = () => {
    Animated.timing(explanationAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      // Defer state updates
      setTimeout(() => {
        setShowExplanation(false);
        loadQuestion();
      }, 0);
    });
  };
  
  const showMascotForStreak = (streakCount) => {
    console.log('🔥 Showing streak celebration for:', streakCount);
    
    let message = '';
    let mascotType = 'excited';
    
    if (streakCount >= 15) {
      message = `🔥 LEGENDARY STREAK! ${streakCount} in a row! 🔥\n\nYou're absolutely UNSTOPPABLE! 🚀\nYou earned 2 bonus minutes!\n\nYou're a true Brain Bites master! 👑`;
    } else if (streakCount >= 10) {
      message = `🔥 INCREDIBLE STREAK! ${streakCount} correct! 🔥\n\nYou're on fire! Amazing work! 🌟\nYou earned 2 bonus minutes!\n\nKeep this momentum going! 💪`;
    } else if (streakCount >= 5) {
      message = `🎉 STREAK MILESTONE! ${streakCount} correct! 🎉\n\nFantastic job! You're doing great! ⭐\nYou earned 2 bonus minutes of app time!\n\nCan you reach ${Math.ceil(streakCount/5)*5 + 5}? 🎯`;
    }
    
    setMascotType(mascotType);
    setMascotMessage(message);
    setShowMascot(true);
  };

  const showMascotForWrongAnswer = () => {
    setMascotType('sad');
    setMascotMessage(`Oops! That's not quite right. 😔\n\nThe correct answer was:\n${currentQuestion.correctAnswer}: ${currentQuestion.options[currentQuestion.correctAnswer]}\n\nTap me for a detailed explanation!`);
    setShowMascot(true);
  };
  
  // ORIGINAL QUIZ FUNCTIONALITY: Handle peeking mascot press for explanations
  const handlePeekingMascotPress = () => {
    if (!currentQuestion) return;
    
    if (selectedAnswer && showExplanation) {
      // Show detailed explanation after answering
      if (isCorrect) {
        setMascotType('happy');
        setMascotMessage(`Great job! Here's why this is correct:\n\n${currentQuestion.explanation}\n\nKeep up the excellent work! 🌟`);
      } else {
        setMascotType('happy');
        setMascotMessage(`Let me explain why the answer was ${currentQuestion.correctAnswer}:\n\n${currentQuestion.explanation}\n\nDon't worry, you'll get the next one! 💪`);
      }
      setShowMascot(true);
    } else if (!selectedAnswer) {
      // No answer selected yet - show hint
      setMascotType('happy');
      setMascotMessage('Take your time and think carefully! 🤔\n\nRead each option and pick the one that seems most correct.\n\nYou\'ve got this! 💪');
      setShowMascot(true);
    }
  };
  
  const handleMascotDismiss = () => {
    setShowMascot(false);
  };
  
  const handleContinue = () => {
    // Play button sound
    SoundService.playButtonPress();
    
    // Hide mascot if still showing
    setShowMascot(false);
    
    // Add a small delay before starting next question
    setTimeout(() => {
      // Hide explanation with animation
      Animated.timing(explanationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => {
        // Fix useInsertionEffect error
        setTimeout(() => {
          setShowExplanation(false);
          loadQuestion();
        }, 0);
      });
    }, 100); // Small delay to prevent accidental double-tap
  };
  
  const handleGoBack = () => {
    // Play button sound
    SoundService.playButtonPress();
    
    // Hide mascot if showing
    setShowMascot(false);
    
    navigation.goBack();
  };
  
  // Get reward text
  const getRewardText = () => {
    if (!isCorrect) return '';
    
    // Different text for milestone versus regular correct answer
    if (isStreakMilestone) {
      return '🎉 Milestone bonus! +2 minutes of app time!';
    } else {
      return '+30 seconds of app time!';
    }
  };
  
  // Get streak progress (0-1)
  const getStreakProgress = () => {
    if (streak === 0) return 0;
    return (streak % 5) / 5;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#FFF8E7" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9F1C" />
          <Text style={styles.loadingText}>Loading question...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFF8E7" barStyle="dark-content" />
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with stats */}
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.statsContainer}>
            <Icon name="check-circle-outline" size={18} color="#4CAF50" />
            <Text style={styles.statsText}>{correctAnswers}/{questionsAnswered}</Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <Icon name="star" size={18} color="#FF9F1C" />
            <Text style={styles.scoreText}>{totalScore}</Text>
          </View>
          
          <Animated.View 
            style={[
              styles.streakContainer,
              {
                transform: [{ scale: streakAnim }],
                backgroundColor: isStreakMilestone ? '#FF9F1C' : 'white',
              }
            ]}
          >
            <Icon 
              name="fire" 
              size={16} 
              color={isStreakMilestone ? 'white' : (streak > 0 ? '#FF9F1C' : '#ccc')} 
            />
            <Text 
              style={[
                styles.streakText,
                isStreakMilestone && { color: 'white' }
              ]}
            >
              {streak}
            </Text>
          </Animated.View>
        </Animated.View>
        
        {/* Category indicator */}
        <Animated.View 
          style={[
            styles.categoryContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.categoryText}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Text>
        </Animated.View>
        
        {/* Streak progress bar */}
        {streak > 0 && (
          <Animated.View 
            style={[
              styles.streakProgressContainer,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.streakProgressBar}>
              <Animated.View 
                style={[
                  styles.streakProgressFill,
                  {
                    width: `${getStreakProgress() * 100}%`,
                    backgroundColor: isStreakMilestone ? '#FF9F1C' : '#FF9F1C'
                  }
                ]}
              />
            </View>
            <Text style={styles.streakProgressText}>
              {isStreakMilestone ? 'Streak Milestone!' : `Next milestone: ${Math.ceil(streak/5)*5}`}
            </Text>
          </Animated.View>
        )}
        
        {/* Timer bar */}
        <Animated.View 
          style={[
            styles.timerContainer,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.timerBar}>
            <Animated.View 
              style={[
                styles.timerFill,
                {
                  width: timerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  }),
                  backgroundColor: timerAnim.interpolate({
                    inputRange: [0, 0.3, 0.7, 1],
                    outputRange: ['#ef4444', '#facc15', '#22c55e', '#22c55e']
                  })
                }
              ]}
            />
          </View>
          <View style={styles.timerIconContainer}>
            <Icon name="timer-outline" size={18} color="#777" />
          </View>
        </Animated.View>
        
        {/* Question card */}
        <Animated.View 
          style={[
            styles.questionContainer,
            {
              opacity: cardAnim,
              transform: [
                { 
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                },
                { 
                  scale: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={styles.questionText}>{currentQuestion?.question}</Text>
          
          <View style={styles.optionsContainer}>
            {currentQuestion?.options && Object.entries(currentQuestion.options).map(([key, value], index) => (
              <Animated.View
                key={key}
                style={{
                  opacity: optionsAnim[index] || fadeAnim,
                  transform: [
                    { 
                      translateY: (optionsAnim[index] || fadeAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }
                  ]
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    selectedAnswer === key && (
                      key === currentQuestion.correctAnswer ? styles.correctOption : styles.incorrectOption
                    ),
                    // Add hover effect when no selection yet
                    selectedAnswer === null && styles.hoverableOption
                  ]}
                  onPress={() => handleAnswerSelect(key)}
                  disabled={selectedAnswer !== null}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.optionKeyContainer,
                    // Change background color based on selection
                    selectedAnswer === key && key === currentQuestion.correctAnswer && styles.correctKeyContainer,
                    selectedAnswer === key && key !== currentQuestion.correctAnswer && styles.incorrectKeyContainer
                  ]}>
                    <Text style={[
                      styles.optionKey,
                      // Change text color based on selection
                      selectedAnswer === key && styles.selectedOptionKeyText
                    ]}>{key}</Text>
                  </View>
                  
                  <Text style={styles.optionText}>{value}</Text>
                  
                  {/* Result icons with enhanced visual feedback */}
                  {selectedAnswer === key && key === currentQuestion.correctAnswer && (
                    <View style={styles.resultIconContainer}>
                      <Icon name="check-circle" size={24} color="#4CAF50" style={styles.resultIcon} />
                    </View>
                  )}
                  
                  {selectedAnswer === key && key !== currentQuestion.correctAnswer && (
                    <View style={styles.resultIconContainer}>
                      <Icon name="close-circle" size={24} color="#F44336" style={styles.resultIcon} />
                    </View>
                  )}
                  
                  {selectedAnswer !== key && selectedAnswer !== null && key === currentQuestion.correctAnswer && (
                    <View style={styles.resultIconContainer}>
                      <Icon name="check-circle-outline" size={24} color="#4CAF50" style={styles.resultIcon} />
                    </View>
                  )}
                  
                  {/* Add subtle arrow icon when no selection yet to indicate this is clickable */}
                  {selectedAnswer === null && (
                    <Icon name="chevron-right" size={20} color="#ccc" style={styles.optionArrow} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
        
        {/* Points animation popup */}
        {showPointsAnimation && (
          <Animated.View 
            style={[
              styles.pointsAnimationContainer,
              {
                opacity: pointsAnim,
                transform: [
                  { 
                    translateY: pointsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30]
                    })
                  },
                  { 
                    scale: pointsAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.2, 1]
                    })
                  }
                ]
              }
            ]}
          >
            <Icon name="star" size={20} color="#FFD700" style={styles.pointsIcon} />
            <Text style={styles.pointsText}>+{pointsEarned}</Text>
          </Animated.View>
        )}
        
        {/* Continue button after answering */}
        {selectedAnswer !== null && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Next Question</Text>
            <Icon name="arrow-right" size={20} color="white" />
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Enhanced Mascot - Quiz Screen with original functionality */}
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
        // Quiz-specific props for original functionality
        isQuizScreen={true}
        currentQuestion={currentQuestion}
        selectedAnswer={selectedAnswer}
        showExplanation={showExplanation}
        isCorrect={isCorrect}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  container: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#777',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
    color: '#333',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scoreText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
    color: '#333',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  streakText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
    color: '#333',
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF9F1C',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  streakProgressContainer: {
    marginBottom: 16,
  },
  streakProgressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  streakProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  streakProgressText: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
    textAlign: 'right',
  },
  questionContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  optionKeyContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionKey: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  resultIcon: {
    marginLeft: 12,
  },
  correctOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  incorrectOption: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  continueButton: {
    backgroundColor: '#FF9F1C',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(255, 159, 28, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  pointsAnimationContainer: {
    position: 'absolute',
    top: '30%', 
    right: '15%',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  pointsIcon: {
    marginRight: 6,
  },
  pointsText: {
    color: '#FF9F1C',
    fontWeight: 'bold',
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  hoverableOption: {
    // This is for a subtle hover effect
    borderColor: '#ddd',
  },
  correctKeyContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  incorrectKeyContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  selectedOptionKeyText: {
    color: 'white',
  },
  resultIconContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 2,
  },
  optionArrow: {
    position: 'absolute',
    right: 16,
  },
  timerContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  timerBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 4,
  },
  timerIconContainer: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default QuizScreen;