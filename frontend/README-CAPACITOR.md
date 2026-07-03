# WadiCab Mobile App (Capacitor)

This project has been configured to build as a mobile app using Ionic Capacitor.

## Prerequisites

### For Android Development
- [Android Studio](https://developer.android.com/studio)
- Android SDK (API level 33 or higher)
- Java Development Kit (JDK) 17 or higher

### For iOS Development (macOS only)
- [Xcode](https://developer.apple.com/xcode/) (latest version)
- iOS Simulator
- CocoaPods (`sudo gem install cocoapods`)

## Available Scripts

### Building for Mobile
```bash
# Build web app and sync with mobile platforms
npm run build:mobile

# Build web app only
npm run build
```

### Development
```bash
# Run on Android device/emulator
npm run dev:android

# Run on iOS device/simulator (macOS only)
npm run dev:ios

# Open Android project in Android Studio
npm run open:android

# Open iOS project in Xcode (macOS only)
npm run open:ios
```

### Manual Commands
```bash
# Sync web assets to mobile platforms
npx cap sync

# Run on specific platform
npx cap run android
npx cap run ios

# Open platform in IDE
npx cap open android
npx cap open ios
```

## Development Workflow

1. **Make changes to your Next.js app** - Edit files in `app/`, `components/`, etc.

2. **Build and sync** - Run `npm run build:mobile` to build the web app and sync with mobile platforms

3. **Test on device/emulator**:
   - Android: `npm run dev:android` or `npm run open:android`
   - iOS: `npm run dev:ios` or `npm run open:ios`

## Project Structure

```
wadi_cab/
├── android/          # Android native project
├── ios/              # iOS native project
├── out/              # Built Next.js static files
├── app/              # Next.js app directory
├── components/       # React components
└── capacitor.config.ts  # Capacitor configuration
```

## Configuration

The Capacitor configuration is in `capacitor.config.ts`:

```typescript
{
  appId: 'com.wadicab.app',
  appName: 'WadiCab',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
}
```

## Adding Capacitor Plugins

To add native functionality, install Capacitor plugins:

```bash
# Example: Adding camera functionality
npm install @capacitor/camera
npx cap sync
```

## Troubleshooting

### Android Issues
- Ensure Android Studio is installed and properly configured
- Check that the Android SDK path is set correctly
- Make sure you have an Android device connected or emulator running

### iOS Issues (macOS only)
- Install CocoaPods: `sudo gem install cocoapods`
- Run `npx cap sync` after installing new plugins
- Open the project in Xcode to resolve any signing issues

### Build Issues
- Make sure to run `npm run build` before syncing
- The `out` directory should contain the built Next.js files
- Check that all paths in `capacitor.config.ts` are correct

## Production Builds

For production builds:

1. Build the web app: `npm run build`
2. Sync with platforms: `npx cap sync`
3. Open in IDE and build for distribution:
   - Android: Open in Android Studio and generate signed APK/AAB
   - iOS: Open in Xcode and archive for App Store

## Live Reload

For development with live reload, you can configure the Capacitor development server:

1. Start your Next.js dev server: `npm run dev`
2. Update `capacitor.config.ts` to point to your local server
3. Run `npx cap run android --livereload` or `npx cap run ios --livereload` 