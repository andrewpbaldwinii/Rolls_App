// Must be first: required by react-navigation / gesture APIs on many setups (especially Android).
import 'react-native-gesture-handler';
import '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Background message:', remoteMessage?.messageId);
});

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

