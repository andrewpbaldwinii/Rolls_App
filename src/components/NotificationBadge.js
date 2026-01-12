import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

const NotificationBadge = ({ count }) => {
  if (!count || count === 0) {
    return null;
  }

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.notificationBadge,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.navBackground, // Teal border to match nav background
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
});

export default NotificationBadge;

