import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserPublicProfilePhotosPage,
  PUBLIC_PROFILE_PHOTOS_PAGE_SIZE,
} from '../services/publicProfile';
import { PHOTO_TYPES } from '../services/interactions';
import OptimizedImage from '../components/OptimizedImage';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const GAP = 6;
const COLS = 3;
const CELL = Math.floor((width - H_PAD * 2 - GAP * (COLS - 1)) / COLS);

const MyPublicProfilePhotosScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = route?.params?.userId || user?.id;

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadPage = useCallback(
    async (nextOffset, { append } = { append: false }) => {
      if (!userId) return;
      const { photos: page, hasMore: more } = await getUserPublicProfilePhotosPage(userId, {
        limit: PUBLIC_PROFILE_PHOTOS_PAGE_SIZE,
        offset: nextOffset,
      });
      if (append) {
        setPhotos((prev) => [...prev, ...page]);
      } else {
        setPhotos(page);
      }
      setHasMore(more);
      setOffset(nextOffset + page.length);
    },
    [userId]
  );

  const initialLoad = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    try {
      await loadPage(0, { append: false });
    } finally {
      setLoading(false);
    }
  }, [userId, loadPage]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    try {
      await loadPage(0, { append: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      await loadPage(offset, { append: true });
    } finally {
      setLoadingMore(false);
    }
  }, [userId, loadingMore, hasMore, loading, offset, loadPage]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        style={[styles.cell, { width: CELL, height: CELL }]}
        onPress={() =>
          navigation.navigate('PhotoViewer', {
            photoId: item.id,
            photoType: PHOTO_TYPES.PROFILE_PHOTO,
            userId,
            initialIndex: index,
          })
        }
        activeOpacity={0.9}
      >
        <OptimizedImage
          source={{ uri: item.image_url }}
          style={styles.cellImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    ),
    [navigation, userId]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const listHeader = useMemo(
    () => (
      <Text style={styles.intro}>
        Newest first. Pull to refresh. More photos load as you scroll.
      </Text>
    ),
    [styles.intro]
  );

  const listFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoad}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors.primary, styles.footerLoad]);

  if (!userId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile photos</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>Sign in to view your profile photos.</Text>
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
        <Text style={styles.headerTitle}>Profile photos</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No profile photos yet</Text>
          <Text style={styles.muted}>Add some from your public profile.</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => navigation.navigate('PublicProfile', { userId })}
          >
            <Text style={styles.emptyCtaText}>Open public profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={COLS}
          columnWrapperStyle={COLS > 1 ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          showsVerticalScrollIndicator={false}
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
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    listContent: {
      paddingHorizontal: H_PAD,
      paddingBottom: 32,
    },
    row: {
      justifyContent: 'flex-start',
      gap: GAP,
      marginBottom: GAP,
    },
    cell: {
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.inputBackground,
      marginRight: 0,
    },
    cellImage: {
      width: '100%',
      height: '100%',
    },
    footerLoad: {
      paddingVertical: 20,
      alignItems: 'center',
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
      marginTop: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 12,
    },
    emptyCta: {
      marginTop: 20,
      backgroundColor: colors.navBackground,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
    },
    emptyCtaText: {
      color: colors.textWhite,
      fontWeight: '600',
      fontSize: 15,
    },
  });

export default MyPublicProfilePhotosScreen;
