import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  loadShippingAddress,
  saveShippingAddress,
  validateShippingAddress,
} from '../services/shippingAddress';

const emptyForm = () => ({
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  country: '',
});

const ShippingAddressesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const saved = await loadShippingAddress(user.id);
      setForm(saved || emptyForm());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to save a shipping address.');
      return;
    }
    const check = validateShippingAddress(form);
    if (!check.ok) {
      Alert.alert('Check address', check.message);
      return;
    }
    try {
      setSaving(true);
      await saveShippingAddress(user.id, form);
      Alert.alert('Saved', 'Your shipping address has been saved.');
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipping address</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>Sign in to add a shipping address.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipping address</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Use a complete address so physical rewards or orders can be delivered without delays.
          </Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={form.fullName}
            onChangeText={(t) => update('fullName', t)}
            placeholder="First and last name"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Address line 1</Text>
          <TextInput
            style={styles.input}
            value={form.line1}
            onChangeText={(t) => update('line1', t)}
            placeholder="Street, P.O. box, company"
            placeholderTextColor={colors.inputPlaceholder}
          />

          <Text style={styles.label}>Address line 2 (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.line2}
            onChangeText={(t) => update('line2', t)}
            placeholder="Apt, suite, unit, etc."
            placeholderTextColor={colors.inputPlaceholder}
          />

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={form.city}
            onChangeText={(t) => update('city', t)}
            placeholder="City"
            placeholderTextColor={colors.inputPlaceholder}
          />

          <Text style={styles.label}>State / province / region</Text>
          <TextInput
            style={styles.input}
            value={form.stateRegion}
            onChangeText={(t) => update('stateRegion', t)}
            placeholder="State or province"
            placeholderTextColor={colors.inputPlaceholder}
          />

          <Text style={styles.label}>Postal / ZIP code</Text>
          <TextInput
            style={styles.input}
            value={form.postalCode}
            onChangeText={(t) => update('postalCode', t)}
            placeholder="Postal code"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={form.country}
            onChangeText={(t) => update('country', t)}
            placeholder="Country"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.saveButtonText}>Save address</Text>
            )}
          </TouchableOpacity>
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
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    muted: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    intro: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
      marginTop: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
      marginBottom: 4,
    },
    saveButton: {
      marginTop: 24,
      backgroundColor: colors.navBackground,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: colors.textWhite,
      fontWeight: '700',
      fontSize: 16,
    },
  });

export default ShippingAddressesScreen;
