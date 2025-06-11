#!/bin/bash
# copy-audio-android.sh - Copy audio files to Android raw folder

echo "📋 Copying audio files to Android..."

# Check if source directory exists
if [ ! -d "src/assets/sounds" ]; then
    echo "❌ Error: src/assets/sounds directory not found!"
    exit 1
fi

# Check if we have audio files
if [ -z "$(ls -A src/assets/sounds/*.mp3 2>/dev/null)" ]; then
    echo "❌ Error: No MP3 files found in src/assets/sounds/"
    exit 1
fi

# Create Android raw directory if it doesn't exist
mkdir -p android/app/src/main/res/raw

# Copy files
echo "Copying files..."
for file in src/assets/sounds/*.mp3; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        # Android raw resources must be lowercase with no spaces
        android_filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9.]/_/g')
        
        cp "$file" "android/app/src/main/res/raw/$android_filename"
        echo "✅ Copied $filename -> android/app/src/main/res/raw/$android_filename"
    fi
done

echo ""
echo "✅ Android audio files copied successfully!"
echo ""
echo "📱 Now rebuild your Android app:"
echo "   cd android && ./gradlew clean && cd .."
echo "   npx react-native run-android" 