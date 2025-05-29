// App.tsx (Updated without TimeIndicator)
import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet, LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Setup and initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log("Initializing BrainBites services...");
        
        // Check if first launch
        const hasLaunchedBefore = await AsyncStorage.getItem('brainbites_onboarding_complete');
        setIsFirstLaunch(hasLaunchedBefore !== 'true');
        
        // Initialize sound service
        try {
          console.log("✓ Sound service ready");
        } catch (err) {
          console.warn("Sound initialization error:", err);
        }
        
        // Initialize quiz service
        await QuizService.initialize();
        console.log("✓ Quiz service initialized");
        
        // Initialize score service
        await ScoreService.loadSavedData();
        console.log("✓ Score service initialized");
        
        // Set up notification permissions (with error handling for AVD)
        if (Platform.OS === 'ios') {
          try {
            const PushNotificationIOS = require('@react-native-community/push-notification-ios');
            const permissions = await PushNotificationIOS.requestPermissions();
            console.log('✓ iOS notification permissions:', permissions);
          } catch (error) {
            console.log('iOS notification permission error (likely AVD):', error.message);
          }
        }
        
        // Initialize timer service
        await EnhancedTimerService.loadSavedTime();
        console.log("✓ Enhanced timer service initialized");
        
        // Add timer event listener for debugging
        EnhancedTimerService.addEventListener((event) => {
          console.log('Timer Event:', event);
          
          // Update debug info
          setDebugInfo(EnhancedTimerService.getDebugInfo());
          
          // Log important events
          if (event.event === 'trackingStarted') {
            console.log('🟢 Timer started tracking screen time');
          } else if (event.event === 'trackingStopped') {
            console.log('🔴 Timer stopped tracking screen time');
          } else if (event.event === 'timeExpired') {
            console.log('⏰ Screen time expired!');
          } else if (event.event === 'creditsAdded') {
            console.log(`💰 Added ${event.seconds} seconds of screen time`);
          }
        });
        
        // Get initial debug info
        setDebugInfo(EnhancedTimerService.getDebugInfo());
        
        // Schedule initial reminders (with error handling for AVD)
        try {
          const availableTime = EnhancedTimerService.getAvailableTime();
          if (availableTime <= 300) {
            NotificationService.scheduleEarnTimeReminder(4);
          }
          NotificationService.scheduleStreakReminder();
          console.log("✓ Notifications scheduled");
        } catch (error) {
          console.log('Notification scheduling skipped (likely AVD):', error.message);
        }
        
        setTimeout(() => {
          setIsInitializing(false);
          console.log("🚀 BrainBites initialization complete!");
        }, 1000);
        
      } catch (error) {
        console.error("❌ Error initializing services:", error);
        setIsInitializing(false);
      }
    };

    initializeServices();
    
    return () => {
      EnhancedTimerService.cleanup();
      try {
        SoundService.cleanup();
      } catch (error) {
        console.log('Sound cleanup error (expected):', error.message);
      }
      try {
        NotificationService.cancelAllNotifications();
      } catch (error) {
        console.log('Notification cleanup error (likely AVD):', error.message);
      }
    };
  }, []);

  // Show loading screen
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9F1C" />
        <Text style={styles.loadingText}>Loading Brain Bites...</Text>
        {debugInfo && __DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              Time: {debugInfo.formattedTime} | 
              Tracking: {debugInfo.isRunning ? 'ON' : 'OFF'} | 
              App: {debugInfo.isBrainBitesActive ? 'ACTIVE' : 'BACKGROUND'}
            </Text>
          </View>
        )}
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
        
        {/* Debug overlay for development */}
        {__DEV__ && debugInfo && (
          <View style={styles.debugOverlay}>
            <Text style={styles.debugOverlayText}>
              {debugInfo.formattedTime} | {debugInfo.isRunning ? '🟢' : '🔴'} | {debugInfo.isBrainBitesActive ? 'APP' : 'BG'}
            </Text>
          </View>
        )}
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
  debugContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 5,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  debugOverlay: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 5,
    zIndex: 9999,
  },
  debugOverlayText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default App;