#!/bin/bash
# setup-audio-complete.sh - Complete audio setup for BrainBites

echo "🎵 Setting up audio files for BrainBites..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from your project root directory"
    exit 1
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p android/app/src/main/res/raw
mkdir -p src/assets/sounds
mkdir -p ios/BrainBites/sounds

# Download sample sounds (you can replace with your own)
echo "📥 Creating placeholder audio files..."

# Create placeholder files (0.5 second of silence)
# You'll need to replace these with actual sound files

# For Android (no file extension in raw folder)
for sound in buttonpress correct incorrect streak menumusic gamemusic; do
    touch "android/app/src/main/res/raw/${sound}.mp3"
    echo "Created android/app/src/main/res/raw/${sound}.mp3"
done

# For source assets
for sound in buttonpress correct incorrect streak menumusic gamemusic; do
    touch "src/assets/sounds/${sound}.mp3"
    echo "Created src/assets/sounds/${sound}.mp3"
done

echo ""
echo "✅ Directory structure created!"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Add your actual MP3 files to: src/assets/sounds/"
echo "   Required files:"
echo "   - buttonpress.mp3 (short click sound)"
echo "   - correct.mp3 (positive feedback sound)"
echo "   - incorrect.mp3 (negative feedback sound)"
echo "   - streak.mp3 (celebration sound)"
echo "   - menumusic.mp3 (background music for menu)"
echo "   - gamemusic.mp3 (background music for quiz)"
echo ""
echo "2. Run this command to copy files to Android:"
echo "   ./copy-audio-android.sh"
echo ""
echo "3. For iOS: Add files to Xcode project manually"
echo "   - Open ios/BrainBites.xcworkspace"
echo "   - Right-click on BrainBites folder"
echo "   - Select 'Add Files to BrainBites'"
echo "   - Navigate to src/assets/sounds/"
echo "   - Select all MP3 files"
echo "   - Check 'Copy items if needed'"
echo "   - Click 'Add'" 