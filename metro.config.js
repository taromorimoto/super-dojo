const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add web platform support
config.resolver.platforms = ['web', 'ios', 'android', 'native'];

// Add platform-specific extensions
config.resolver.sourceExts.push('web.js', 'web.ts', 'web.tsx');

// Configure comprehensive web aliases
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'react-native$': 'react-native-web',
  'react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo$':
    'react-native-web/dist/exports/AccessibilityInfo',
  'react-native/Libraries/Components/Touchable/TouchableOpacity$':
    'react-native-web/dist/exports/TouchableOpacity',
  'react-native/Libraries/EventEmitter/NativeEventEmitter$':
    'react-native-web/dist/vendor/react-native/NativeEventEmitter',
  'react-native/Libraries/vendor/emitter/EventEmitter$':
    'react-native-web/dist/vendor/react-native/emitter/EventEmitter',
  'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$':
    'react-native-web/dist/vendor/react-native/NativeEventEmitter',
  'react-native/Libraries/Utilities/Platform$':
    'react-native-web/dist/exports/Platform',
};

// Add resolver settings for better web compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;