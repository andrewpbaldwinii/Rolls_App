import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

const PaymentSubscriptionScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment & subscription</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Manage how you pay for Rolls and any premium features. Billing integrations can be
          connected here in a future update.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="card-outline" size={22} color={colors.primary} />
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Payment methods</Text>
              <Text style={styles.cardSub}>No payment method on file yet.</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Subscription</Text>
              <Text style={styles.cardSub}>
                You are on the standard experience. Subscription tiers will appear here when
                available.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          For billing questions, use Contact Support in your profile.
        </Text>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundLight,
    },
    header: {
      backgroundColor: colors.navBackground,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 12,
    },
    backButton: {
      padding: 8,
      width: 44,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.textWhite,
      textAlign: 'center',
    },
    headerRight: {
      width: 44,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    lead: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 24,
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    cardTextWrap: {
      flex: 1,
      marginLeft: 14,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    cardSub: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    footerNote: {
      marginTop: 16,
      fontSize: 14,
      color: colors.textLight,
      lineHeight: 20,
    },
  });

export default PaymentSubscriptionScreen;
