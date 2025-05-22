// src/components/mascot/EnhancedMascot.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../styles/theme';

// Get screen dimensions for responsive sizing
const { width, height } = Dimensions.get('window');

// Map mascot types to image paths
const MASCOT_IMAGES = {
  happy: require('../../assets/images/mascot/happy.png'),
  sad: require('../../assets/images/mascot/sad.png'),
  excited: require('../../assets/images/mascot/excited.png'),
  depressed: require('../../assets/images/mascot/depressed.png'),
  gamemode: require('../../assets/images/mascot/gamemode.png'),
  below: require('../../assets/images/mascot/below.png'),
};

const EnhancedMascot = ({ 
  type = 'happy', 
  position = 'left',
  message = null,
  autoHide = false,
  autoHideDuration = 5000,
  onDismiss = null,
  onMessageComplete = null,
  fullScreenOverlay = false,
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const [isVisible, setIsVisible] = useState(!!message);
  const [displayedMessage, setDisplayedMessage] = useState(message);
  const [showOverlay, setShowOverlay] = useState(false);
  
  // Animation values
  const entryAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const contentAnim = useRef(new Animated.Value(1)).current;
  
  // Timing controls
  const messageTimer = useRef(null);
  const hideTimer = useRef(null);
  
  // Determine size multiplier
  const getSizeMultiplier = () => {
    switch(size) {
      case 'small': return 0.8;
      case 'large': return 1.5;
      default: return 1.2; // medium
    }
  };
  
  // Handle message changes
  useEffect(() => {
    if (message !== displayedMessage) {
      handleNewMessage(message);
    }
  }, [message]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(messageTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);
  
  const handleNewMessage = (newMessage) => {
    // Clear existing timers
    clearTimeout(messageTimer.current);
    clearTimeout(hideTimer.current);
    
    if (newMessage) {
      // Show mascot with new message
      setDisplayedMessage(newMessage);
      
      if (fullScreenOverlay && !showOverlay) {
        // Fade out content
        Animated.timing(contentAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Show overlay
        setShowOverlay(true);
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
      
      // Animate mascot entrance
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(entryAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        })
      ]).start();
      
      // Start bounce animation
      startBounceAnimation();
      
      // Auto hide after duration if enabled
      if (autoHide) {
        hideTimer.current = setTimeout(() => {
          hideMessage();
        }, autoHideDuration);
      }
    } else {
      // Hide mascot when message is null
      hideMessage();
    }
  };
  
  const hideMessage = () => {
    Animated.parallel([
      Animated.timing(entryAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic)
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsVisible(false);
      setDisplayedMessage(null);
      setShowOverlay(false);
      
      // Return content to normal opacity
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Notify parent that message was dismissed
      if (onMessageComplete) {
        onMessageComplete();
      }
    });
  };
  
  const handleDismiss = () => {
    clearTimeout(hideTimer.current);
    hideMessage();
    
    if (onDismiss) {
      onDismiss();
    }
  };
  
  // Start bounce animation
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
  
  // Exit if nothing to show
  if (!isVisible) return null;
  
  const sizeMultiplier = getSizeMultiplier();
  
  const mascotContent = (
    <View style={[
      styles.container,
      position === 'left' ? styles.left : styles.right,
      showOverlay && styles.overlayPosition
    ]}>
      <Animated.View style={[
        styles.mascotWrapper,
        {
          opacity: entryAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: bounceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -10]
            })}
          ]
        }
      ]}>
        {/* Speech bubble */}
        {displayedMessage && (
          <View style={[
            styles.speechBubble,
            position === 'left' ? styles.leftBubble : styles.rightBubble,
            { transform: [{ scale: sizeMultiplier }] }
          ]}>
            <Text style={styles.speechText}>{displayedMessage}</Text>
            <View style={[
              styles.speechArrow,
              position === 'left' ? styles.leftArrow : styles.rightArrow
            ]} />
            
            {/* Close button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Icon name="close-circle" size={24} color="rgba(0,0,0,0.3)" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Mascot upper body */}
        <View style={[
          styles.mascotImageContainer,
          { transform: [{ scale: sizeMultiplier }] }
        ]}>
          <Image 
            source={MASCOT_IMAGES[type] || MASCOT_IMAGES.happy} 
            style={styles.mascotImage} 
            resizeMode="contain" 
          />
        </View>
      </Animated.View>
    </View>
  );
  
  if (showOverlay && fullScreenOverlay) {
    return (
      <Animated.View style={[
        styles.overlayContainer,
        { opacity: overlayAnim }
      ]}>
        {mascotContent}
      </Animated.View>
    );
  }
  
  return mascotContent;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: -10,
    zIndex: 100,
  },
  left: {
    left: 20,
  },
  right: {
    right: 20,
  },
  overlayPosition: {
    position: 'absolute',
    bottom: '20%',
    alignSelf: 'center',
    left: 0,
    right: 0,
    zIndex: 999,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  mascotWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  mascotImageContainer: {
    width: 160,
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  speechBubble: {
    position: 'absolute',
    bottom: 180,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    padding: 16,
    minWidth: 200,
    maxWidth: 280,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  leftBubble: {
    left: -30,
  },
  rightBubble: {
    right: -30,
  },
  speechText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: theme.colors.textDark,
    lineHeight: 22,
  },
  speechArrow: {
    position: 'absolute',
    bottom: -12,
    width: 24,
    height: 24,
    backgroundColor: theme.colors.background,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  leftArrow: {
    left: 30,
  },
  rightArrow: {
    right: 30,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
});

export default EnhancedMascot;