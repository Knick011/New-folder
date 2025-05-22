// src/services/AppLauncher.js
import { Linking, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TimerService from './TimerService';

// App schemes for deep linking
const APP_SCHEMES = {
  tiktok: 'tiktok://',
  instagram: 'instagram://',
  facebook: 'fb://',
  twitter: 'twitter://',
  youtube: 'youtube://',
  snapchat: 'snapchat://',
  pinterest: 'pinterest://',
  reddit: 'reddit://',
  linkedin: 'linkedin://',
  whatsapp: 'whatsapp://',
  // Add more apps as needed
};

// App display info
const APP_INFO = {
  tiktok: {
    name: 'TikTok',
    icon: 'music-note',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  instagram: {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E1306C',
    backgroundColor: '#ffffff',
  },
  facebook: {
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    backgroundColor: '#ffffff',
  },
  twitter: {
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    backgroundColor: '#ffffff',
  },
  youtube: {
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    backgroundColor: '#ffffff',
  },
  snapchat: {
    name: 'Snapchat',
    icon: 'snapchat',
    color: '#FFFC00',
    backgroundColor: '#ffffff',
  },
  pinterest: {
    name: 'Pinterest',
    icon: 'pinterest',
    color: '#E60023',
    backgroundColor: '#ffffff',
  },
  reddit: {
    name: 'Reddit',
    icon: 'reddit',
    color: '#FF4500',
    backgroundColor: '#ffffff',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0077B5',
    backgroundColor: '#ffffff',
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    backgroundColor: '#ffffff',
  },
};

// Example of enhanced app launcher card UI
const AppLauncherCard = ({ app, timeAvailable, onLaunch }) => {
  return (
    <TouchableOpacity 
      style={styles.appCard}
      onPress={() => onLaunch(app.id)}
      disabled={timeAvailable <= 0}
    >
      <View 
        style={[
          styles.appIconContainer, 
          { backgroundColor: app.backgroundColor, borderColor: app.color }
        ]}
      >
        <Icon name={app.icon} size={32} color={app.color} />
      </View>
      
      <Text style={styles.appName}>{app.name}</Text>
      
      <View style={styles.timeIndicator}>
        <Icon name="clock-outline" size={14} color="#777" />
        <Text style={styles.timeText}>{formatTime(timeAvailable)}</Text>
      </View>
      
      <Icon 
        name="chevron-right" 
        size={20} 
        color={timeAvailable > 0 ? app.color : "#ccc"} 
        style={styles.launchIcon} 
      />
    </TouchableOpacity>
  );
};

class AppLauncher {
  constructor() {
    this.activeApp = null;
    this.listeners = [];
  }
  
  // Get list of popular apps
  getAppList() {
    return Object.keys(APP_SCHEMES).map(appId => ({
      id: appId,
      ...APP_INFO[appId]
    }));
  }
  
  // Check if an app is installed
  async isAppInstalled(appId) {
    const scheme = APP_SCHEMES[appId];
    if (!scheme) return false;
    
    try {
      return await Linking.canOpenURL(scheme);
    } catch (error) {
      console.error(`Error checking if ${appId} is installed:`, error);
      return false;
    }
  }
  
  // Launch an app
  async launchApp(appId) {
    const scheme = APP_SCHEMES[appId];
    if (!scheme) {
      console.error(`No scheme found for app: ${appId}`);
      return false;
    }
    
    try {
      // Check if app is installed
      const canOpen = await Linking.canOpenURL(scheme);
      if (!canOpen) {
        console.error(`App not installed: ${appId}`);
        return false;
      }
      
      // Check if we have enough time
      const availableTime = TimerService.getAvailableTime();
      if (availableTime <= 0) {
        console.error('No time available');
        return false;
      }
      
      // Start timer
      TimerService.startAppTimer(appId);
      
      // Set as active app
      this.activeApp = appId;
      
      // Launch the app
      await Linking.openURL(scheme);
      
      // Notify listeners
      this._notifyListeners('appLaunched', { appId });
      
      return true;
    } catch (error) {
      console.error(`Error launching app ${appId}:`, error);
      return false;
    }
  }
  
  // Add event listener
  addEventListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  // Notify all listeners
  _notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      listener({ event, ...data });
    });
  }
}

// Additional styles
const styles = StyleSheet.create({
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 16,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  timeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#555',
  },
  launchIcon: {
    marginLeft: 8,
  },
});

export default new AppLauncher();
