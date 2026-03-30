import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, Platform, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CameraScreen from '../screens/CameraScreen';
import RollsScreen from '../screens/RollsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import RollDetailScreen from '../screens/RollDetailScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PhotoViewerScreen from '../screens/PhotoViewerScreen';
import InboxScreen from '../screens/InboxScreen';
import MessageScreen from '../screens/MessageScreen';
import InviteContributorsScreen from '../screens/InviteContributorsScreen';
import InviteConfirmationScreen from '../screens/InviteConfirmationScreen';
import AllRollsScreen from '../screens/AllRollsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import HelpArticleScreen from '../screens/HelpArticleScreen';
import AboutRollsScreen from '../screens/AboutRollsScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import DataPolicyScreen from '../screens/DataPolicyScreen';
import ShippingAddressesScreen from '../screens/ShippingAddressesScreen';
import PaymentSubscriptionScreen from '../screens/PaymentSubscriptionScreen';
import MyPublicProfilePhotosScreen from '../screens/MyPublicProfilePhotosScreen';
import UserLocationScreen from '../screens/UserLocationScreen';
import CameraButton from '../components/CameraButton';
import { useNotificationCounts } from '../contexts/NotificationCountsContext';
import { useTheme } from '../contexts/ThemeContext';
import appIcon from '../assets/images/app_icon.png';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const createTabStyles = (colors) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: colors.navBackground,
      height: Platform.OS === 'ios' ? 88 : 70,
      paddingTop: 5,
      paddingBottom: Platform.OS === 'ios' ? 30 : 10,
      borderTopWidth: 0,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    tabBarLabel: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 4,
    },
    iconContainer: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    cameraButtonContainer: {
      top: -15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    appIcon: {
      width: 24,
      height: 24,
    },
    rollsIconContainer: {
      width: 48,
      height: 48,
    },
  });

const TabNavigator = () => {
  const { colors } = useTheme();
  const { unreadNotificationCount } = useNotificationCounts();
  const styles = useMemo(() => createTabStyles(colors), [colors]);

  const notificationTabBadge =
    unreadNotificationCount > 0
      ? unreadNotificationCount > 99
        ? '99+'
        : unreadNotificationCount
      : undefined;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.navActive,
        tabBarInactiveTintColor: colors.navInactiveLabel,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? 'home' : 'home-outline'} 
                size={size || 24} 
                color={color || (focused ? colors.navActive : colors.navInactive)} 
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarBadge: notificationTabBadge,
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? 'notifications' : 'notifications-outline'} 
                size={size || 24} 
                color={color || (focused ? colors.navActive : colors.navInactive)} 
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => (
            <View style={styles.cameraButtonContainer}>
              <CameraButton onPress={props.onPress} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Rolls"
        component={RollsScreen}
        options={{
          tabBarLabel: 'Rolls',
          tabBarIcon: ({ focused, color, size }) => {
            const iconSize = (size || 24) * 2; // 2x the normal size
            return (
              <View style={[styles.iconContainer, styles.rollsIconContainer]}>
                <Image 
                  source={appIcon}
                  style={[
                    styles.appIcon,
                    {
                      width: iconSize,
                      height: iconSize,
                      opacity: focused ? 1 : 0.7,
                      tintColor: color || (focused ? colors.navActive : colors.navInactive),
                    }
                  ]}
                  resizeMode="contain"
                />
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={focused ? 'person-circle' : 'person-circle-outline'} 
                size={size || 24} 
                color={color || (focused ? colors.navActive : colors.navInactive)} 
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen 
        name="PublicProfile" 
        component={PublicProfileScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="RollDetail"
        component={RollDetailScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="DataPolicy"
        component={DataPolicyScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="ShippingAddresses"
        component={ShippingAddressesScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="PaymentSubscription"
        component={PaymentSubscriptionScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="MyPublicProfilePhotos"
        component={MyPublicProfilePhotosScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="UserLocation"
        component={UserLocationScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="PhotoViewer"
        component={PhotoViewerScreen}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Message"
        component={MessageScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="InviteContributors"
        component={InviteContributorsScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="InviteConfirmation"
        component={InviteConfirmationScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="AllRolls"
        component={AllRollsScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="HelpArticle"
        component={HelpArticleScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="AboutRolls"
        component={AboutRollsScreen}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;
