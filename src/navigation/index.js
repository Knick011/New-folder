// src/navigation/index.js - Updated to remove AppSelectorScreen
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import QuizScreen from '../screens/QuizScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

// Note: AppSelectorScreen has been removed

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  
  useEffect(() => {
    // Check if this is the first launch
    const checkFirstLaunch = async () => {
      try {
        const hasLaunchedBefore = await AsyncStorage.getItem('brainbites_onboarding_complete');
        setIsFirstLaunch(hasLaunchedBefore !== 'true');
      } catch (error) {
        console.error('Error checking first launch:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkFirstLaunch();
  }, []);
  
  if (isLoading) {
    // You could show a splash screen here
    return null;
  }
  
  return (
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
        {/* AppSelectorScreen removed from navigation stack */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;