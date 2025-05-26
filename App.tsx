// App.tsx (Updated with enhanced components and proper navigation)
import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet, LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackCardStyleInterpolator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

// Import updated screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Import services
import EnhancedTimerService from './src/services/EnhancedTimerService';
import SoundService from './src/services/SoundService';
import QuizService from './src/services/QuizService';
import ScoreService from './src/services/ScoreService';
import NotificationService from './src/services/NotificationService';

// Import components
import TimeIndicator from './src/components/common/TimeIndicator';

// Ignore specific warnings that might come from third-party libraries
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

// Stack navigator type
type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
  Quiz: { category?: string };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [timeIndicatorExpanded, setTimeIndicatorExpanded] = useState(false);
  
  // Setup and initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log("Initializing services...");
        
        // First check if this is the first launch
        const hasLaunchedBefore = await AsyncStorage.getItem('brainbites_onboarding_complete');
        setIsFirstLaunch(hasLaunchedBefore !== 'true');
        
        // Initialize the sound service (simplified approach)
        try {
          await SoundService.initSounds();
          console.log("Sound service initialized (minimal implementation)");
        } catch (err) {
          console.warn("Sound initialization error - continuing anyway:", err);
        }
        
        // Initialize the quiz service
        await QuizService.initialize();
        console.log("Quiz service initialized successfully");
        
        // Initialize score service
        await ScoreService.loadSavedData();
        console.log("Score service initialized successfully");
        
        // Set up permissions for notifications
        if (Platform.OS === 'ios') {
          // Request permissions on iOS
          PushNotificationIOS.requestPermissions()
            .then(permissions => {
              console.log('Notification permissions granted:', permissions);
            })
            .catch(error => {
              console.error('Error requesting notification permissions:', error);
            });
        }
        
        // Load saved time data
        const availableTime = await EnhancedTimerService.loadSavedTime();
        console.log("Enhanced timer service initialized successfully");
        
        // Schedule initial reminder if needed
        if (availableTime <= 300) { // 5 minutes or less
          NotificationService.scheduleEarnTimeReminder(4); // Remind in 4 hours
        }
        
        // Schedule daily streak reminder
        NotificationService.scheduleStreakReminder();
        
        // Delay a bit to make sure everything is ready
        setTimeout(() => {
          setIsInitializing(false);
        }, 1000);
      } catch (error) {
        console.error("Error initializing services:", error);
        setIsInitializing(false);
      }
    };

    initializeServices();
    
    // Cleanup when app unmounts
    return () => {
      EnhancedTimerService.cleanup();
      SoundService.cleanup();
      NotificationService.cancelAllNotifications();
    };
  }, []);

  // Show a loading screen while initializing
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9F1C" />
        <Text style={styles.loadingText}>Loading Brain Bites...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8E7" />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={isFirstLaunch ? "Welcome" : "Home"}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#FFF8E7' },
            // Add fancy transition effects
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateY: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.height, 0],
                      }),
                    },
                  ],
                  opacity: current.progress,
                },
              };
            },
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
        
        {/* Time indicator overlay - shown on all screens */}
        <TimeIndicator 
          expanded={timeIndicatorExpanded}
          onPress={setTimeIndicatorExpanded}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
});

export default App;