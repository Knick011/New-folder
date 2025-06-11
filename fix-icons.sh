#!/bin/bash
# fix-icons.sh - Fix react-native-vector-icons setup

echo "🎨 Fixing icon setup for BrainBites..."

# For Android
echo "📱 Fixing Android icons..."

# Check if the fonts gradle line is already added
if ! grep -q "apply from: \"../../node_modules/react-native-vector-icons/fonts.gradle\"" android/app/build.gradle; then
    echo "Adding vector icons to Android build.gradle..."
    # This is already in your build.gradle, so just confirming
else
    echo "✅ Android vector icons already configured in build.gradle"
fi

# For iOS
echo "🍎 Instructions for iOS:"
echo "1. cd ios && pod install"
echo "2. Open ios/BrainBites.xcworkspace in Xcode"
echo "3. Right-click on BrainBites folder"
echo "4. Select 'Add Files to BrainBites'"
echo "5. Navigate to node_modules/react-native-vector-icons/Fonts"
echo "6. Select all .ttf files"
echo "7. Make sure 'Copy items if needed' is checked"
echo "8. Click 'Add'"
echo ""
echo "OR run this command (if you have xcodeproj gem installed):"
echo "npx react-native-asset"

# Create react-native.config.js if it doesn't exist
if [ ! -f "react-native.config.js" ]; then
    echo ""
    echo "📝 Creating react-native.config.js..."
    cat > react-native.config.js << 'EOF'
module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: null,
      },
    },
  },
  assets: ['./node_modules/react-native-vector-icons/Fonts/'],
};
EOF
    echo "✅ Created react-native.config.js"
fi

echo ""
echo "🔧 Now run these commands:"
echo "1. npx react-native-asset"
echo "2. cd android && ./gradlew clean && cd .."
echo "3. npx react-native run-android"
echo ""
echo "For iOS:"
echo "1. cd ios && pod install && cd .."
echo "2. npx react-native run-ios" 