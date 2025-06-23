// src/screens/WelcomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundService from '../services/SoundService';
import EnhancedMascotDisplay from '../components/mascot/EnhancedMascotDisplay';
import theme from '../styles/theme';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [mascotType, setMascotType] = useState('excited');
  const [mascotMessage, setMascotMessage] = useState('');
  const [showMascot, setShowMascot] = useState(false);
  
  // Animation values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SoundService.startMenuMusic();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoAnim, {
            toValue: -15,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(logoAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ),
      Animated.sequence([
        Animated.delay(400),
        Animated.spring(buttonAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.spring(cardAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Show mascot after animations
    setTimeout(() => {
      updateMascotForPage(0);
    }, 1500);
    
    return () => {
      SoundService.stopMusic();
    };
  }, []);

  // Update mascot based on current page
  useEffect(() => {
    if (currentPage > 0) {
      // Small delay to let page transition start
      setTimeout(() => {
        updateMascotForPage(currentPage);
      }, 300);
    }
  }, [currentPage]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentPage,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // Cannot use native driver for width
    }).start();
  }, [currentPage]);
  
  const updateMascotForPage = (pageIndex) => {
    let type = 'excited';
    let message = '';
    
    switch(pageIndex) {
      case 0:
        type = 'excited';
        message = 'Welcome to Brain Bites! 🧠✨\n\nI\'m your learning companion!\nI\'ll help you earn app time by getting smarter!\n\nReady to start this amazing journey? 🚀';
        break;
      case 1:
        type = 'happy';
        message = 'Here\'s how it works! 📚\n\nAnswer questions correctly to earn app time!\nEach right answer = 30 seconds ⏰\n\nBuild a streak for bonus time! 🔥\nEvery 5 correct = 2 minute bonus! 🎉';
        break;
      case 2:
        type = 'gamemode';
        message = 'Time to have fun! 🎮📱\n\nUse your earned time on:\n• Social media apps\n• Games and videos\n• Any entertainment app!\n\nWhen time runs out, just earn more! 😊';
        break;
      case 3:
        type = 'excited';
        message = 'You\'re all set! 🌟\n\nThis journey will make you:\n• Smarter 🧠\n• More knowledgeable 📖\n• Better at managing screen time ⚖️\n\nLet\'s begin your adventure! 🚀';
        break;
      case 4:
        type = 'learn-from-mistakes';
        message = 'Wrong answers temporarily reduce your score, but don\'t worry! Keep playing to recover quickly. Every mistake is a chance to learn and grow stronger!';
        break;
      default:
        type = 'excited';
        message = 'Welcome to Brain Bites Mobile! Let\'s learn together! 🎓';
    }
    
    setMascotType(type);
    setMascotMessage(message);
    setShowMascot(true);
  };

  const pages = [
    {
      title: "Welcome to Brain Bites!",
      text: "Transform your screen time into learning time. The more you learn, the more time you earn for your favorite apps!",
      icon: "brain",
      gradient: ['#FF9F1C', '#FFD699'],
    },
    {
      title: "Learn & Earn",
      text: "Each correct quiz answer adds to your screen time. Build up a streak for awesome bonus rewards!",
      icon: "head-question",
      gradient: ['#FF6B6B', '#FFB8B8'],
    },
    {
      title: "Use Your Time Wisely",
      text: "Enjoy your earned time on any app you like! But be careful... if time runs out, your score will start to drop.",
      icon: "shield-alert-outline",
      gradient: ['#4ECDC4', '#A8E6CF'],
    },
    {
      title: "Learn from Mistakes",
      text: "Wrong answers temporarily reduce your score, but don't worry! Keep playing to recover quickly. Every mistake is a chance to learn and grow stronger!",
      icon: "lightbulb-on-outline",
      gradient: ['#667eea', '#764ba2'],
    },
    {
      title: "Ready to Start?",
      text: "Let's begin your journey to becoming smarter while managing your screen time like a pro. You've got this!",
      icon: "rocket-launch",
      gradient: ['#A8E6CF', '#7FCDCD'],
      isLast: true
    }
  ];
  
  const handleNext = () => {
    SoundService.playButtonPress();
    setShowMascot(false);
    
    if (currentPage < pages.length - 1) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => {
        setCurrentPage(currentPage + 1);
        
        slideAnim.setValue(0);
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }).start();
      });
    } else {
      handleFinish();
    }
  };
  
  const handlePrevious = () => {
    if (currentPage > 0) {
      SoundService.playButtonPress();
      setShowMascot(false);
      
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => {
        setCurrentPage(currentPage - 1);
        
        slideAnim.setValue(0);
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }).start();
      });
    }
  };
  
  const handleFinish = async () => {
    SoundService.playStreak();
    setShowMascot(false);
    
    await AsyncStorage.setItem('brainbites_onboarding_complete', 'true');
    
    navigation.replace('Home');
  };
  
  const handleMascotDismiss = () => {
    setShowMascot(false);
  };
  
  const page = pages[currentPage];
  
  // Create gradient-like background with dynamic colors
  const Gradient = ({ colors }) => (
    <View style={[styles.gradient, { backgroundColor: colors[0] }]}>
      <View style={[styles.gradientInner, { backgroundColor: colors[1] }]} />
    </View>
  );
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Gradient colors={page.gradient} />
      
      <Animated.View 
        style={[
          styles.container,
          { 
            opacity: fadeAnim,
            transform: [
              { 
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.content}>
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                transform: [
                  { translateY: logoAnim }
                ]
              }
            ]}
          >
            <Icon name={page.icon} size={80} color="white" />
          </Animated.View>
          
          <Text style={styles.title}>{page.title}</Text>
          <Text style={styles.text}>{page.text}</Text>
        </View>
        
        {/* Progress indicators */}
        <View style={styles.progressContainer}>
          <View style={styles.dotContainer}>
            {pages.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dot,
                  currentPage === index && styles.activeDot
                ]}
                onPress={() => {
                  if (index < currentPage) {
                    // Allow going back to previous pages
                    setShowMascot(false);
                    setCurrentPage(index);
                    setTimeout(() => updateMascotForPage(index), 300);
                  }
                }}
              />
            ))}
          </View>
          
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, pages.length - 1],
                    outputRange: ['25%', '100%']
                  })
                }
              ]}
            />
          </View>
          
          <Text style={styles.progressText}>
            {currentPage + 1} of {pages.length}
          </Text>
        </View>
        
        {/* Navigation buttons */}
        <View style={styles.buttonContainer}>
          <View style={{ flex: 1 }} />
          
          <Animated.View
            style={{
              transform: [
                { scale: buttonAnim }
              ],
              opacity: fadeAnim
            }}
          >
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: page.gradient[1] }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextText}>
                {page.isLast ? "Get Started!" : "Next"}
              </Text>
              {page.isLast ? 
                <Icon name="rocket-launch" size={20} color="white" /> :
                <Icon name="arrow-right" size={20} color="white" />
              }
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
      
      {/* Enhanced Mascot */}
      <EnhancedMascotDisplay
        type={mascotType}
        position="right"
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
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientInner: {
    position: 'absolute',
    right: 0,
    top: '15%',
    width: '120%',
    height: '60%',
    borderTopLeftRadius: 500,
    borderBottomLeftRadius: 500,
    opacity: 0.4,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 28,
  },
  progressBar: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  nextButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
});

export default WelcomeScreen;