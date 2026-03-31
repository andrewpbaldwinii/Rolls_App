import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { useAuth } from '../contexts/AuthContext';
import {
  registerAndSyncFcmToken,
  subscribeToFcmTokenRefresh,
} from '../services/fcm';

/**
 * Registers FCM after login and logs token for Firebase Console test sends.
 */
const PushNotificationBootstrap = () => {
  const { user } = useAuth();
  const refreshUnsubRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      refreshUnsubRef.current?.();
      refreshUnsubRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const token = await registerAndSyncFcmToken(user.id);
      if (cancelled || !token) {
        return;
      }
      console.log(
        '[FCM] Registration OK. Send a test push from Firebase Console → Messaging → “Send test message” and paste:\n',
        token,
      );
    })();

    refreshUnsubRef.current?.();
    refreshUnsubRef.current = subscribeToFcmTokenRefresh(user.id);

    const unsubOnMessage = messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title ?? 'Notification';
      const body = remoteMessage.notification?.body ?? '';
      if (body) {
        Alert.alert(title, body);
      }
    });

    return () => {
      cancelled = true;
      refreshUnsubRef.current?.();
      refreshUnsubRef.current = null;
      unsubOnMessage();
    };
  }, [user?.id]);

  return null;
};

export default PushNotificationBootstrap;
