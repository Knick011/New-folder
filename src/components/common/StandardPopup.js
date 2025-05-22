// src/components/common/StandardPopup.js
import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

/**
 * Reusable popup component with animation
 */
const StandardPopup = ({ 
  children, 
  isOpen, 
  onClose, 
  title, 
  showCloseButton = true,
  size = 'md',
  preventBackgroundClick = false
}) => {
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  
  // Handle animation on open/close
  useEffect(() => {
    if (isOpen) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset animations when closed
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [isOpen, fadeAnim, scaleAnim]);
  
  // Handle background click
  const handleBackgroundClick = () => {
    if (!preventBackgroundClick) {
      onClose();
    }
  };
  
  // Determine width based on size
  const getWidth = () => {
    switch(size) {
      case 'sm': return width * 0.75;
      case 'lg': return width * 0.9;
      case 'xl': return width * 0.95;
      case 'md':
      default: return width * 0.85;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={isOpen}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackgroundClick}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.popup,
                {
                  width: getWidth(),
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              {/* Optional header with title */}
              {(title || showCloseButton) && (
                <View style={styles.header}>
                  {title && <Text style={styles.title}>{title}</Text>}
                  {showCloseButton && (
                    <TouchableOpacity 
                      onPress={onClose}
                      style={styles.closeButton}
                    >
                      <Icon name="close" size={24} color="#777" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              {/* Content */}
              <View style={styles.content}>
                {children}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
});

export default StandardPopup;