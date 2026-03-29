import React, { useState, useCallback, useMemo } from 'react';
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
import { useTheme } from '../contexts/ThemeContext';

const ITEMS_PER_PAGE = 20;

const AllRollsScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
        activeOpacity={0.72}
        onPress={() => {
          navigation.navigate('RollDetail', { rollId: roll.id, initialRoll: roll });
        }}
      >
        <View style={styles.rollCardInner}>
          <View style={styles.rollCardBody}>
            <View style={styles.rollCardTopRow}>
              <View style={styles.rollCardTitleMain}>
                <Text style={styles.rollCardName} numberOfLines={2}>
                  {roll.title}
                </Text>
                {isOwned && roll.is_public && (
                  <Ionicons name="globe" size={16} color={colors.primary} style={styles.publicIcon} />
                )}
              </View>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </View>
            </View>
            <View style={styles.rollMetaLine}>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText} numberOfLines={1}>
                  {roll.status}
                </Text>
              </View>
              {isOwned && (
                <View
                  style={[
                    styles.visibilityChip,
                    roll.is_public && styles.visibilityChipPublic,
                  ]}
                >
                  <Ionicons
                    name={roll.is_public ? 'globe-outline' : 'lock-closed-outline'}
                    size={13}
                    color={roll.is_public ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.visibilityChipText,
                      roll.is_public && styles.visibilityChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {roll.is_public ? 'Public' : 'Private'}
                  </Text>
                </View>
              )}
              <Text style={styles.rollCardDateInline} numberOfLines={1}>
                {roll.submission_deadline
                  ? new Date(roll.submission_deadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'No deadline'}
              </Text>
            </View>
            {roll.description ? (
              <Text style={styles.rollCardDescription} numberOfLines={2}>
                {roll.description}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, isOwned, navigation, styles]);

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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
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

const createStyles = (colors, isDark) => StyleSheet.create({
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inputBorder,
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
    color: colors.textPrimary,
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  rollCard: {
    borderRadius: 26,
    marginBottom: 14,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(94, 200, 191, 0.28)' : 'rgba(59, 184, 173, 0.22)',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.18 : 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  rollCardInner: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  rollCardBody: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  rollCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  rollCardTitleMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  rollMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  rollCardName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
  },
  publicIcon: {
    marginLeft: 6,
    marginTop: 2,
  },
  rollCardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 0,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(94, 200, 191, 0.16)' : 'rgba(59, 184, 173, 0.14)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(94, 200, 191, 0.28)' : 'rgba(59, 184, 173, 0.22)',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 4,
    flexShrink: 0,
  },
  visibilityChipPublic: {
    borderColor: isDark ? 'rgba(94, 200, 191, 0.35)' : 'rgba(59, 184, 173, 0.35)',
    backgroundColor: isDark ? 'rgba(94, 200, 191, 0.08)' : 'rgba(59, 184, 173, 0.06)',
  },
  visibilityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  visibilityChipTextActive: {
    color: colors.primary,
  },
  rollCardDateInline: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    flexShrink: 0,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 0,
    backgroundColor: isDark ? 'rgba(94, 200, 191, 0.12)' : 'rgba(59, 184, 173, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
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
    color: colors.textPrimary,
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
