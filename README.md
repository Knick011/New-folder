# BrainBites Setup Instructions

This guide will help you set up the BrainBites app, including audio files and icons.

## Prerequisites

- Node.js and npm installed
- React Native development environment set up
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Git Bash or WSL (for Windows users)

## Setup Steps

### 1. Make Scripts Executable

First, make all setup scripts executable:

```bash
chmod +x setup-audio-complete.sh
chmod +x copy-audio-android.sh
chmod +x fix-icons.sh
```

### 2. Set Up Audio Files

1. Create the directory structure:
   ```bash
   ./setup-audio-complete.sh
   ```

2. Add your MP3 files to `src/assets/sounds/`:
   - `buttonpress.mp3` (short click sound)
   - `correct.mp3` (positive feedback sound)
   - `incorrect.mp3` (negative feedback sound)
   - `streak.mp3` (celebration sound)
   - `menumusic.mp3` (background music for menu)
   - `gamemusic.mp3` (background music for quiz)

3. Copy files to Android:
   ```bash
   ./copy-audio-android.sh
   ```

### 3. Fix Icons

1. Run the icon fix script:
   ```bash
   ./fix-icons.sh
   ```

2. Link assets:
   ```bash
   npx react-native-asset
   ```

### 4. Clean and Rebuild

#### For Android:
```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

#### For iOS:
```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

## Troubleshooting

### Audio Issues
- Make sure all audio files are valid MP3 files
- Check that filenames match exactly (case-sensitive)
- Verify files are in the correct directories

### Icon Issues
- If icons don't appear, try running `npx react-native-asset` again
- For iOS, make sure to add the font files in Xcode
- Check that the icon names in the code match the available icons

### Build Issues
- If you encounter build errors, try cleaning the project:
  ```bash
  cd android && ./gradlew clean && cd ..  # For Android
  cd ios && pod deintegrate && pod install && cd ..  # For iOS
  ```
- Make sure all dependencies are installed:
  ```bash
  npm install
  ```

## Additional Notes

- The app uses MaterialCommunityIcons for all icons
- Audio files should be optimized for mobile (small file size)
- Keep the original audio files in `src/assets/sounds/` for future updates
