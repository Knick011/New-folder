// src/components/mascot/MascotDisplay.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing, 
  Image,
  Dimensions
} from 'react-native';

// Get screen dimensions for positioning
const { width, height } = Dimensions.get('window');

// Import all mascot images - Fixed paths to match the actual project structure
const mascotImages = {
  happy: require('../../assets/images/happy.png'),
  sad: require('../../assets/images/sad.png'),
  excited: require('../../assets/images/excited.png'),
  depressed: require('../../assets/images/depressed.png'),
  gamemode: require('../../assets/images/gamemode.png'),
  below: require('../../assets/images/below.png')
};

const MascotDisplay = ({ 
  type = 'happy', 
  position = 'left',
  showMascot = true,
  message = null,
  autoHide = false,
  autoHideDuration = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedMessage, setDisplayedMessage] = useState(message);
  
  // Animation values
  const entryAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  // Manage autoHide timer
  useEffect(() => {
    let hideTimer = null;
    
    if (showMascot) {
      // Show the mascot with animation
      setIsVisible(true);
      
      Animated.timing(entryAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }).start();
      
      // Start bounce animation
      startBounceAnimation();
      
      // Set message
      setDisplayedMessage(message);
      
      // Auto hide if needed
      if (autoHide) {
        hideTimer = setTimeout(() => {
          Animated.timing(entryAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setIsVisible(false);
          });
        }, autoHideDuration);
      }
    } else {
      // Hide the mascot with animation
      Animated.timing(entryAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
    
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [showMascot, message, autoHide, autoHideDuration, entryAnim]);
  
  // Create continuous bounce animation
  const startBounceAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin)
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin)
        })
      ])
    ).start();
  };
  
  // Calculate mascot transform based on position and animations
  const getMascotTransform = () => {
    // Base transform (entry animation)
    const baseTransform = {
      opacity: entryAnim,
      transform: [
        { 
          translateY: entryAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [100, 0] 
          })
        }
      ]
    };
    
    // Add position-specific transforms
    if (position === 'left') {
      baseTransform.transform.push({ rotate: '8deg' });
    } else {
      baseTransform.transform.push({ rotate: '-8deg' });
    }
    
    // Add bounce animation except for 'below' type
    if (type !== 'below') {
      baseTransform.transform.push({
        translateY: bounceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10]
        })
      });
    }
    
    return baseTransform;
  };
  
  // Get appropriate mascot image
  const mascotImage = mascotImages[type] || mascotImages.happy;
  
  // Don't render anything if not supposed to be visible
  if (!isVisible) return null;
  
  // Special case for 'below' type
  if (type === 'below') {
    return (
      <View style={[styles.belowContainer, position === 'left' ? styles.left : styles.right]}>
        {/* Speech bubble */}
        {displayedMessage && (
          <View style={[styles.speechBubble, styles.belowSpeechBubble, position === 'left' ? styles.leftBubble : styles.rightBubble]}>
            <Text style={styles.speechText}>{displayedMessage}</Text>
            <View 
              style={[
                styles.speechArrow, 
                styles.belowSpeechArrow,
                position === 'left' ? styles.leftArrow : styles.rightArrow
              ]} 
            />
          </View>
        )}
        
        {/* Below mascot - only top portion visible */}
        <Animated.View style={[styles.belowMascotWrapper, { opacity: entryAnim }]}>
          <Image source={mascotImage} style={styles.belowMascotImage} resizeMode="contain" />
        </Animated.View>
      </View>
    );
  }
  
  // Regular mascot display
  return (
    <View style={[styles.container, position === 'left' ? styles.left : styles.right]}>
      <Animated.View style={[styles.mascotWrapper, getMascotTransform()]}>
        {/* Speech bubble */}
        {displayedMessage && (
          <View style={[styles.speechBubble, position === 'left' ? styles.leftBubble : styles.rightBubble]}>
            <Text style={styles.speechText}>{displayedMessage}</Text>
            <View 
              style={[
                styles.speechArrow, 
                position === 'left' ? styles.leftArrow : styles.rightArrow
              ]} 
            />
          </View>
        )}
        
        {/* Mascot image */}
        <View style={styles.mascotImageContainer}>
          <Image source={mascotImage} style={styles.mascotImage} resizeMode="contain" />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    zIndex: 100,
  },
  belowContainer: {
    position: 'absolute',
    bottom: -40, // Adjusted to show only 80% of the mascot
    zIndex: 100,
    width: 120,
  },
  left: {
    left: 20,
  },
  right: {
    right: 20,
  },
  mascotWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  belowMascotWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  mascotImageContainer: {
    width: 100,
    height: 120, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  belowMascotImage: {
    width: 120,
    height: 100, 
  },
  speechBubble: {
    position: 'absolute',
    bottom: 130,
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    padding: 12,
    maxWidth: 200,
    borderWidth: 2,
    borderColor: '#FF9F1C',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  belowSpeechBubble: {
    bottom: 90, // Adjusted for 'below' type
  },
  leftBubble: {
    left: 0,
  },
  rightBubble: {
    right: 0,
  },
  speechText: {
    fontSize: 14,
    color: '#333',
  },
  speechArrow: {
    position: 'absolute',
    bottom: -10,
    width: 20,
    height: 20,
    backgroundColor: '#FFF8E7',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FF9F1C',
    transform: [{ rotate: '45deg' }],
  },
  belowSpeechArrow: {
    bottom: -10,
  },
  leftArrow: {
    left: 20,
  },
  rightArrow: {
    right: 20,
  },
});

export default MascotDisplay;