import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Main feed showing recent photos from friends and shared rolls</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default HomeScreen;

