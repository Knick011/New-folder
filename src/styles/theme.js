// src/styles/theme.js (Updated with fun fonts and improved color scheme)
const theme = {
  // Core Colors - enhanced palette
  colors: {
    primary: '#FF9F1C',       // Primary orange
    secondary: '#FFB347',     // Secondary orange
    accent: '#5D9CEC',        // Accent blue
    success: '#4CD964',       // Success green
    warning: '#FFCC00',       // Warning yellow
    error: '#FF3B30',         // Error red
    background: '#FFF8E7',    // Background light cream
    card: '#FFFFFF',          // Card background
    textDark: '#333333',      // Text dark
    textLight: '#FFFFFF',     // Text light
    textMuted: '#777777',     // Text muted
    successLight: 'rgba(76, 217, 100, 0.15)',
    errorLight: 'rgba(255, 59, 48, 0.15)',
    warningLight: 'rgba(255, 204, 0, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  // Fonts - more playful options
  fonts: {
    primary: Platform.OS === 'ios' ? 'Avenir-Medium' : 'Roboto',
    bold: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'Roboto-Bold',
    light: Platform.OS === 'ios' ? 'Avenir-Light' : 'Roboto-Light',
  },
  
  // Enhanced Spacing system
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border Radius
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },
  
  // Enhanced Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    // Special shadow for buttons
    btn: {
      shadowColor: 'rgba(255, 159, 28, 0.4)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 4,
    },
  },
  
  // Typography
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 22,
      xxl: 28,
      title: 32,
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // Animation durations
  animation: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  // Icons sizes
  icons: {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  },
};

export default theme;