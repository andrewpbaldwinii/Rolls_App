import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRolls } from '../contexts/RollsContext';
import colors from '../constants/colors';

const ITEMS_PER_PAGE = 20;

const AllRollsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { sectionType } = route.params || {}; // 'owned' or 'contributed'
  
  const { rolls, loading, fetchRolls, getOwnedRolls, getContributedRolls } = useRolls();
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Get the appropriate rolls based on section type
  // Show all rolls except archived (active, developing, developed)
  const allRolls = sectionType === 'contributed' 
    ? getContributedRolls().filter(r => r.status !== 'archived' && r.title?.toLowerCase() !== 'profile photos')
    : getOwnedRolls().filter(r => r.status !== 'archived' && r.title?.toLowerCase() !== 'profile photos');

  const isOwned = sectionType === 'owned';

  // Paginated rolls
  const paginatedRolls = allRolls.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = paginatedRolls.length < allRolls.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRolls();
    setRefreshing(false);
  }, [fetchRolls]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setPage(prev => prev + 1);
        setLoadingMore(false);
      }, 300);
    }
  }, [loadingMore, hasMore]);

  const renderRollCard = useCallback(({ item: roll }) => {
    return (
      <TouchableOpacity
        style={styles.rollCard}
        activeOpacity={0.7}
        onPress={() => {
          navigation.navigate('RollDetail', { rollId: roll.id, initialRoll: roll });
        }}
      >
        <View style={styles.rollCardHeader}>
          <Ionicons
            name={isOwned ? 'camera' : 'people'}
            size={24}
            color={colors.buttonPrimary}
          />
          <View style={styles.rollCardInfo}>
            <View style={styles.rollCardTitleRow}>
              <Text style={styles.rollCardName}>{roll.title}</Text>
              {isOwned && roll.is_public && (
                <Ionicons name="globe" size={16} color={colors.primary} style={styles.publicIcon} />
              )}
            </View>
            {roll.description && (
              <Text style={styles.rollCardDescription} numberOfLines={2}>
                {roll.description}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </View>
        <View style={styles.rollCardFooter}>
          <View style={styles.rollCardFooterLeft}>
            <View style={styles.rollCardFooterItem}>
              <Text style={styles.rollCardStatus}>
                Status: <Text style={styles.rollCardStatusValue}>{roll.status}</Text>
              </Text>
            </View>
            {isOwned && (
              <View style={styles.rollCardFooterItem}>
                <Ionicons
                  name={roll.is_public ? 'globe' : 'lock-closed'}
                  size={14}
                  color={roll.is_public ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.publicToggleText, roll.is_public && styles.publicToggleTextActive]}>
                  {roll.is_public ? 'Public' : 'Private'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.rollCardDate}>
            {roll.submission_deadline 
              ? new Date(roll.submission_deadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'No deadline'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [isOwned, navigation]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.buttonPrimary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={isOwned ? 'camera-outline' : 'people-outline'} 
        size={64} 
        color={colors.textSecondary} 
      />
      <Text style={styles.emptyTitle}>
        {isOwned ? 'No Rolls Yet' : 'No Invited Rolls'}
      </Text>
      <Text style={styles.emptyText}>
        {isOwned 
          ? 'Create your first roll to get started!'
          : 'Others can invite you to contribute to their rolls.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isOwned ? 'All My Rolls' : 'All Invited Rolls'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {loading && paginatedRolls.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
          <Text style={styles.loadingText}>Loading rolls...</Text>
        </View>
      ) : (
        <FlatList
          data={paginatedRolls}
          renderItem={renderRollCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            paginatedRolls.length === 0 && styles.emptyListContent
          ]}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.buttonPrimary}
              colors={[colors.buttonPrimary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  rollCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rollCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rollCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rollCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rollCardName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  publicIcon: {
    marginLeft: 8,
  },
  rollCardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rollCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rollCardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rollCardFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  rollCardStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rollCardStatusValue: {
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  publicToggleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  publicToggleTextActive: {
    color: colors.primary,
  },
  rollCardDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});

export default AllRollsScreen;
