#!/bin/bash
# setup-audio.sh - Script to set up audio files for React Native

echo "🎵 Setting up audio files for BrainBites..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from your project root directory"
    exit 1
fi

# Create Android raw directory
echo "📁 Creating Android raw directory..."
mkdir -p android/app/src/main/res/raw

# Copy and rename files for Android
echo "📋 Copying files to Android..."
if [ -d "src/assets/sounds" ]; then
    cp src/assets/sounds/buttonpress.mp3 android/app/src/main/res/raw/buttonpress.mp3 2>/dev/null
    cp src/assets/sounds/correct.mp3 android/app/src/main/res/raw/correct.mp3 2>/dev/null
    cp src/assets/sounds/incorrect.mp3 android/app/src/main/res/raw/incorrect.mp3 2>/dev/null
    cp src/assets/sounds/streak.mp3 android/app/src/main/res/raw/streak.mp3 2>/dev/null
    cp src/assets/sounds/gamemusic.mp3 android/app/src/main/res/raw/gamemusic.mp3 2>/dev/null
    
    # Rename menu_music.mp3 to menumusic.mp3 for Android
    cp src/assets/sounds/menu_music.mp3 android/app/src/main/res/raw/menumusic.mp3 2>/dev/null
    
    echo "✅ Android audio files copied successfully!"
else
    echo "❌ Error: src/assets/sounds directory not found!"
    exit 1
fi

# List the files
echo ""
echo "📋 Android audio files:"
ls -la android/app/src/main/res/raw/

echo ""
echo "🎯 Next steps:"
echo "1. For iOS: Open Xcode and manually add the sound files from src/assets/sounds/"
echo "2. Run: npm install react-native-sound"
echo "3. For iOS: cd ios && pod install"
echo "4. Rebuild your app"
echo ""
echo "✅ Script completed!"