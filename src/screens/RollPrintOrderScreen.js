import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import OptimizedImage from '../components/OptimizedImage';
import {
  loadShippingAddress,
  saveShippingAddress,
  validateShippingAddress,
} from '../services/shippingAddress';
import { recordLocalPrintOrderRequest } from '../services/printOrders';

/** Fulfillment inbox — replace with your real address when wiring production checkout. */
const PRINT_ORDERS_EMAIL = 'prints@rolls.app';

const emptyForm = () => ({
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  country: '',
});

const RollPrintOrderScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const rollId = route.params?.rollId;
  const rollTitle = route.params?.rollTitle || 'Roll';
  const selectedPhotos = route.params?.selectedPhotos || [];

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const saved = await loadShippingAddress(user.id);
      setForm(saved || emptyForm());
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const formatAddressBlock = () => {
    const f = form;
    return [
      f.fullName,
      f.line1,
      f.line2,
      `${f.city}, ${f.stateRegion} ${f.postalCode}`,
      f.country,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const buildEmailBody = () => {
    const ids = selectedPhotos.map((p) => p.id).join(', ');
    return [
      `Roll print order`,
      ``,
      `Roll: ${rollTitle}`,
      `Roll ID: ${rollId}`,
      `Photos requested: ${selectedPhotos.length}`,
      `Image IDs: ${ids}`,
      ``,
      `Ship to:`,
      formatAddressBlock(),
      ``,
      `(Sent from Rolls app — attach or link fulfillment details as needed.)`,
    ].join('\n');
  };

  const onSendOrder = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to place a print order.');
      return;
    }
    const check = validateShippingAddress(form);
    if (!check.ok) {
      Alert.alert('Check address', check.message);
      return;
    }
    if (selectedPhotos.length === 0) {
      Alert.alert('No photos', 'Go back and choose at least one photo.');
      return;
    }

    try {
      setSending(true);
      await saveShippingAddress(user.id, form);

      const buyerSummary = `${formatAddressBlock().split('\n')[0]} · ${form.city}, ${form.country}`;
      await recordLocalPrintOrderRequest(user.id, {
        rollTitle,
        quantity: selectedPhotos.length,
        buyerSummary,
      });

      const subject = encodeURIComponent(
        `Print order: ${rollTitle} (${selectedPhotos.length} photos)`,
      );
      const body = encodeURIComponent(buildEmailBody());
      const mailtoUrl = `mailto:${PRINT_ORDERS_EMAIL}?subject=${subject}&body=${body}`;

      let mailOpened = false;
      try {
        if (await Linking.canOpenURL(mailtoUrl)) {
          await Linking.openURL(mailtoUrl);
          mailOpened = true;
        }
      } catch (err) {
        console.warn(err);
      }

      if (!mailOpened) {
        Alert.alert(
          'Order saved',
          `Your request was saved under Print orders. No email app found — copy details manually or contact ${PRINT_ORDERS_EMAIL}.`,
        );
      } else {
        Alert.alert(
          'Order saved',
          'We opened your email app with a draft to our print team. Your order also appears under Profile → Print orders.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (e) {
      Alert.alert('Could not send', e?.message || 'Try again.');
    } finally {
      setSending(false);
    }
  };

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Print order</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>Sign in to continue.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Order prints
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.rollName} numberOfLines={2}>
            {rollTitle}
          </Text>
          <Text style={styles.subtitle}>
            {selectedPhotos.length} {selectedPhotos.length === 1 ? 'photo' : 'photos'} selected
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
            {selectedPhotos.map((p) => (
              <View key={p.id} style={styles.thumbWrap}>
                {p.imageUrl ? (
                  <OptimizedImage
                    source={{ uri: p.imageUrl, width: 72, height: 72 }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Shipping</Text>
          <Text style={styles.helper}>
            Used for this order. Update anytime in Profile → Shipping addresses.
          </Text>

          {[
            ['fullName', 'Full name'],
            ['line1', 'Address line 1'],
            ['line2', 'Address line 2 (optional)'],
            ['city', 'City'],
            ['stateRegion', 'State / province / region'],
            ['postalCode', 'Postal / ZIP code'],
            ['country', 'Country'],
          ].map(([key, ph]) => (
            <TextInput
              key={key}
              style={styles.input}
              placeholder={ph}
              placeholderTextColor={colors.textSecondary}
              value={form[key]}
              onChangeText={(t) => update(key, t)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          ))}

          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={onSendOrder}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <>
                <Ionicons name="send-outline" size={22} color={colors.buttonText} />
                <Text style={styles.sendButtonText}>Send the order</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footnote}>
            Opens an email draft to {PRINT_ORDERS_EMAIL} and saves this request in Print orders.
            Replace the email in code when your fulfillment flow is ready.
          </Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundLight,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingBottom: 10,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.inputBorder,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    rollName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 15,
      color: colors.textSecondary,
    },
    thumbRow: {
      marginTop: 14,
      marginBottom: 8,
    },
    thumbWrap: {
      marginRight: 10,
    },
    thumb: {
      width: 72,
      height: 72,
      borderRadius: 8,
      backgroundColor: colors.inputBackground,
    },
    thumbPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionTitle: {
      marginTop: 20,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    helper: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    input: {
      marginTop: 10,
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.textPrimary,
    },
    sendButton: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.buttonPrimary,
      paddingVertical: 16,
      borderRadius: 12,
    },
    sendButtonDisabled: { opacity: 0.7 },
    sendButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.buttonText,
    },
    footnote: {
      marginTop: 16,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    muted: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

export default RollPrintOrderScreen;
