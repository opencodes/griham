# Flutter Installation Guide for macOS

## Quick Install (Recommended)

### Option 1: Using Homebrew (Easiest)

```bash
# Install Flutter via Homebrew
brew install --cask flutter

# Verify installation
flutter doctor
```

### Option 2: Manual Installation

```bash
# 1. Download Flutter SDK
cd ~/development
curl -O https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.16.0-stable.zip

# 2. Extract the file
unzip flutter_macos_arm64_3.16.0-stable.zip

# 3. Add Flutter to PATH
echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.zshrc
source ~/.zshrc

# 4. Verify installation
flutter doctor
```

## Post-Installation Setup

```bash
# Accept Android licenses (if you have Android Studio)
flutter doctor --android-licenses

# Check for any issues
flutter doctor -v
```

## Quick Start After Installation

```bash
# Navigate to the app directory
cd /Users/rkjha/codebase/griham/mobile_app/griham_sms_reader

# Get dependencies
flutter pub get

# Run the app (with Android device/emulator connected)
flutter run
```

## Alternative: Use Android Studio Directly

If you don't want to install Flutter CLI, you can:

1. **Install Android Studio**: https://developer.android.com/studio
2. **Install Flutter Plugin**: 
   - Open Android Studio
   - Go to Preferences > Plugins
   - Search for "Flutter" and install
3. **Open Project**: 
   - File > Open > Select `griham_sms_reader` folder
   - Android Studio will handle dependencies automatically

## Minimum Requirements

- macOS 10.14 (Mojave) or later
- Xcode (for iOS development, optional)
- Android Studio or VS Code
- 2.8 GB disk space

## Troubleshooting

### Command not found: flutter
```bash
# Check if Flutter is in PATH
echo $PATH | grep flutter

# If not, add to PATH
export PATH="$PATH:$HOME/development/flutter/bin"
```

### Android SDK not found
```bash
# Install Android Studio first
# Then run
flutter doctor --android-licenses
```

## Quick Test

After installation, test with:
```bash
flutter doctor
flutter --version
```

You should see Flutter version information.
