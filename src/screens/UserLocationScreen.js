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
import { loadUserLocation, saveUserLocation } from '../services/userLocation';

const UserLocationScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState('');
  const [exactLocation, setExactLocation] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const saved = await loadUserLocation(user.id);
      if (saved) {
        setCity(saved.city);
        setExactLocation(saved.exactLocation);
      } else {
        setCity('');
        setExactLocation('');
      }
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

  const onSave = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to save your location.');
      return;
    }
    try {
      setSaving(true);
      await saveUserLocation(user.id, { city, exactLocation });
      Alert.alert('Saved', 'Your location is stored privately on this device.');
    } catch (e) {
      Alert.alert('Check your entries', e?.message || 'Could not save.');
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
          <Text style={styles.headerTitle}>Location</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>Sign in to save a private location.</Text>
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
        <Text style={styles.headerTitle}>Location</Text>
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
          <View style={styles.privacyCard}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
            <Text style={styles.privacyTitle}>Not shown on your profile</Text>
            <Text style={styles.privacyBody}>
              Your city or precise location is saved only on this device for Rolls features that need
              it (such as future local or delivery options). It is not posted to your public profile,
              is not visible to other users, and is not shared with followers.
            </Text>
          </View>

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Portland"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>You can save city only, or add more detail below.</Text>

          <Text style={[styles.label, styles.labelSpaced]}>
            Exact area (optional, private)
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={exactLocation}
            onChangeText={setExactLocation}
            placeholder="Neighborhood, borough, landmark, or street-level detail — stays private"
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <Text style={styles.saveButtonText}>Save location</Text>
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
    privacyCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    privacyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 10,
      marginBottom: 8,
    },
    privacyBody: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    labelSpaced: {
      marginTop: 16,
    },
    hint: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
      lineHeight: 18,
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
    },
    inputMultiline: {
      minHeight: 100,
      paddingTop: Platform.OS === 'ios' ? 12 : 10,
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

export default UserLocationScreen;
