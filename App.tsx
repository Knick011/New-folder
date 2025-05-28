// App.tsx - Clean version without TimeIndicator
import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet, LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

// Import updated screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Import services
import TimerService from './src/services/TimerService';
import SoundService from './src/services/SoundService';
import QuizService from './src/services/QuizService';
import ScoreService from './src/services/ScoreService';
import NotificationService from './src/services/NotificationService';

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'Style property',
  'useNativeDriver',
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
  
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log("Initializing services...");
        
        const hasLaunchedBefore = await AsyncStorage.getItem('brainbites_onboarding_complete');
        setIsFirstLaunch(hasLaunchedBefore !== 'true');
        
        try {
          await SoundService.initSounds();
          console.log("Sound service initialized");
        } catch (err) {
          console.warn("Sound initialization error - continuing anyway:", err);
        }
        
        await QuizService.initialize();
        console.log("Quiz service initialized successfully");
        
        await ScoreService.loadSavedData();
        console.log("Score service initialized successfully");
        
        if (Platform.OS === 'ios') {
          PushNotificationIOS.requestPermissions()
            .then(permissions => {
              console.log('Notification permissions granted:', permissions);
            })
            .catch(error => {
              console.error('Error requesting notification permissions:', error);
            });
        }
        
        const availableTime = await TimerService.loadSavedTime();
        console.log("Timer service initialized successfully");
        
        if (availableTime <= 300) {
          NotificationService.scheduleEarnTimeReminder(4);
        }
        
        NotificationService.scheduleStreakReminder();
        
        setTimeout(() => {
          setIsInitializing(false);
        }, 1000);
      } catch (error) {
        console.error("Error initializing services:", error);
        setIsInitializing(false);
      }
    };

    initializeServices();
    
    return () => {
      TimerService.cleanup();
      SoundService.cleanup();
      NotificationService.cancelAllNotifications();
    };
  }, []);

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
        
        {/* TimeIndicator removed - using speech bubble in individual screens instead */}
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