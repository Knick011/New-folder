// App.tsx - Simplified version
import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet, LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AudioTimerTestScreen from './src/screens/AudioTimerTestScreen';

// Import services - only use EnhancedTimerService
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

const Stack = createStackNavigator();

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log("Initializing BrainBites services...");
        
        // Check if first launch
        const hasLaunchedBefore = await AsyncStorage.getItem('brainbites_onboarding_complete');
        setIsFirstLaunch(hasLaunchedBefore !== 'true');
        
        // Initialize services in order
        await QuizService.initialize();
        console.log("✓ Quiz service initialized");
        
        await ScoreService.loadSavedData();
        console.log("✓ Score service initialized");
        
        // Initialize timer service (handles native timer if available)
        await EnhancedTimerService.loadSavedTime();
        console.log("✓ Timer service initialized");
        
        // Schedule notifications
        try {
          const availableTime = EnhancedTimerService.getAvailableTime();
          if (availableTime <= 300) {
            NotificationService.scheduleEarnTimeReminder(4);
          }
          NotificationService.scheduleStreakReminder();
        } catch (error) {
          console.log('Notification scheduling skipped:', error.message);
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
        console.log('Sound cleanup error:', error.message);
      }
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
            cardStyle: { backgroundColor: '#FFF8E7' }
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          {__DEV__ && (
            <Stack.Screen name="AudioTimerTest" component={AudioTimerTestScreen} />
          )}
        </Stack.Navigator>
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