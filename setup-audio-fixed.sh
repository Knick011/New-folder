#!/bin/bash
# setup-audio-fixed.sh - Proper script to set up audio files for React Native
# Based on working setups from other React Native apps

echo "🎵 Setting up audio files for BrainBites (Fixed Version)..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from your project root directory"
    exit 1
fi

# Create Android raw directory
echo "📁 Creating Android raw directory..."
mkdir -p android/app/src/main/res/raw

# Create assets directory if it doesn't exist
echo "📁 Creating assets directory..."
mkdir -p src/assets/sounds

echo "📝 IMPORTANT: You need to add your sound files!"
echo ""
echo "🔊 Required sound files (MP3 format recommended):"
echo "   - buttonpress.mp3"
echo "   - correct.mp3" 
echo "   - incorrect.mp3"
echo "   - streak.mp3"
echo "   - menumusic.mp3"
echo "   - gamemusic.mp3"
echo ""

# Check if sound files exist in assets
if [ -d "src/assets/sounds" ] && [ "$(ls -A src/assets/sounds)" ]; then
    echo "📋 Found sound files in src/assets/sounds, copying to Android..."
    
    # Copy files to Android raw folder (convert to lowercase and remove spaces)
    for file in src/assets/sounds/*.mp3; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            # Convert to lowercase and replace spaces/special chars with underscores
            android_filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9.]/_/g')
            cp "$file" "android/app/src/main/res/raw/$android_filename"
            echo "   ✅ Copied $filename -> $android_filename"
        fi
    done
    
    echo ""
    echo "✅ Android audio files copied successfully!"
else
    echo "⚠️  No sound files found in src/assets/sounds/"
    echo "   Please add your MP3 files there and run this script again"
fi

# List Android files
echo ""
echo "📋 Android audio files:"
if [ -d "android/app/src/main/res/raw" ] && [ "$(ls -A android/app/src/main/res/raw)" ]; then
    ls -la android/app/src/main/res/raw/
else
    echo "   (No files found - add them to src/assets/sounds/ first)"
fi

# Create react-native.config.js for linking assets
echo ""
echo "📝 Creating react-native.config.js for asset linking..."
cat > react-native.config.js << 'EOF'
module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          project: 'ios/BrainBites.xcodeproj',
          xcodeprojPath: 'ios/BrainBites.xcodeproj',
          plistPath: 'ios/BrainBites/Info.plist',
          folder: 'ios',
        },
      },
    },
  },
  assets: ['./src/assets/sounds/'],
};
EOF

echo "✅ Created react-native.config.js"

echo ""
echo "🎯 SETUP INSTRUCTIONS:"
echo ""
echo "1. 📁 Add your sound files:"
echo "   Place all .mp3 files in: src/assets/sounds/"
echo "   Required files: buttonpress.mp3, correct.mp3, incorrect.mp3, streak.mp3, menumusic.mp3, gamemusic.mp3"
echo ""
echo "2. 🔄 Link assets (run after adding sound files):"
echo "   npx react-native-asset"
echo ""
echo "3. 🍎 For iOS (IMPORTANT):"
echo "   - Open ios/BrainBites.xcworkspace in Xcode"
echo "   - Drag & drop all sound files from src/assets/sounds/ into the Xcode project"
echo "   - Make sure to check 'Copy items if needed' and 'Add to target: BrainBites'"
echo ""
echo "4. 📱 For Android:"
echo "   Files are automatically copied to android/app/src/main/res/raw/"
echo "   (Already done by this script)"
echo ""
echo "5. 🏗️ Rebuild your app:"
echo "   npx react-native run-android"
echo "   npx react-native run-ios"
echo ""
echo "❗ CRITICAL NOTES:"
echo "   - Sound files MUST be in MP3 format"
echo "   - File names should be lowercase with no spaces"
echo "   - For iOS, you MUST add files through Xcode manually"
echo "   - Android files are placed in res/raw/ automatically"
echo ""
echo "🐛 If sounds still don't work:"
echo "   1. Check that react-native-sound is properly installed"
echo "   2. Verify files are in correct locations"
echo "   3. Check console logs for loading errors"
echo "   4. Try using .wav files instead of .mp3 if issues persist"
echo ""
echo "✅ Script completed! Follow the instructions above." 