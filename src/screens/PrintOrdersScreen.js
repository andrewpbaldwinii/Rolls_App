import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { listPrintOrders } from '../services/printOrders';

function formatOrderDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

const PrintOrdersScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      const rows = await listPrintOrders(user.id);
      setOrders(rows);
    } catch (e) {
      console.warn(e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.orderCard}>
        <View style={styles.orderCardTop}>
          <Ionicons name="print-outline" size={22} color={colors.primary} />
          <View style={styles.orderCardText}>
            <Text style={styles.orderTitle} numberOfLines={1}>
              {item.photo_label || item.title || 'Print order'}
            </Text>
            <Text style={styles.orderDate}>{formatOrderDate(item.created_at)}</Text>
          </View>
          <Text style={styles.orderStatus}>{item.status || 'Pending'}</Text>
        </View>
        {item.buyer_summary ? (
          <Text style={styles.orderBuyer} numberOfLines={2}>
            {item.buyer_summary}
          </Text>
        ) : null}
        {item.quantity != null ? (
          <Text style={styles.orderQty}>Qty: {item.quantity}</Text>
        ) : null}
      </View>
    ),
    [colors.primary, styles]
  );

  const keyExtractor = useCallback((item) => String(item.id || item.created_at), []);

  if (!user?.id) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>Sign in to see your print orders.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Print orders</Text>
        <View style={styles.headerRight} />
      </View>

      <Text style={styles.intro}>
        Orders of physical prints of your photos. Status updates will appear here as fulfillment
        tools roll out.
      </Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={52} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No print orders yet</Text>
          <Text style={styles.muted}>
            When buyers purchase prints of your public profile photos, those orders will show up
            here for tracking and shipping.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
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
    intro: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    orderCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.inputBorder,
    },
    orderCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    orderCardText: {
      flex: 1,
      marginLeft: 10,
    },
    orderTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    orderDate: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    orderStatus: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
    },
    orderBuyer: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 10,
      lineHeight: 18,
    },
    orderQty: {
      fontSize: 13,
      color: colors.textLight,
      marginTop: 6,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 28,
    },
    muted: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginTop: 10,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 12,
    },
  });

export default PrintOrdersScreen;
