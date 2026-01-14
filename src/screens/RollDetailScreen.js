import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const GRID_PADDING = 20;
const IMAGE_SIZE =
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
  GRID_COLUMNS;

const RollDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { rollId, initialRoll } = route.params || {};

  const [roll, setRoll] = useState(initialRoll || null);
  const [images, setImages] = useState([]);
  const [contributorsCount, setContributorsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isLocked = useMemo(() => {
    if (!roll?.release_date) return false;
    const release = new Date(roll.release_date);
    return release > new Date();
  }, [roll]);

  useEffect(() => {
    const fetchData = async () => {
      if (!rollId) {
        setError('Missing roll id');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch roll details (if not provided)
        if (!roll) {
          const { data, error: rollError } = await supabase
            .from('rolls')
            .select('*')
            .eq('id', rollId)
            .single();
          if (rollError) throw rollError;
          setRoll(data);
        }

        // Fetch images
        const { data: imageData, error: imageError } = await supabase
          .from('roll_images')
          .select('*')
          .eq('roll_id', rollId)
          .order('created_at', { ascending: false });
        if (imageError) throw imageError;
        setImages(imageData || []);

        // Fetch contributors count (includes owner)
        const { count: contribCount, error: contribError } = await supabase
          .from('roll_contributors')
          .select('*', { count: 'exact', head: true })
          .eq('roll_id', rollId);
        if (contribError) throw contribError;
        setContributorsCount(contribCount || 0);
      } catch (err) {
        console.error('Error loading roll detail:', err);
        setError(err.message || 'Failed to load roll');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [rollId, roll]);

  const renderImageItem = ({ item, index }) => {
    const isLastInRow = (index + 1) % GRID_COLUMNS === 0;
    return (
      <View
        style={[
          styles.imageWrapper,
          {
            marginRight: isLastInRow ? 0 : GRID_GAP,
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
          },
        ]}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          resizeMode="cover"
        />
        {isLocked && (
          <>
            <View style={styles.lockOverlay} />
            <View style={styles.lockIconWrapper}>
              <Ionicons name="lock-closed" size={22} color={colors.background} />
            </View>
          </>
        )}
      </View>
    );
  };

  const Header = () => (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerIconContainer}>
        <Image 
          source={require('../assets/images/app_icon.png')} 
          style={styles.headerIcon}
          resizeMode="contain"
        />
      </View>
      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
        <Text style={styles.loadingText}>Loading roll...</Text>
      </View>
    );
  }

  if (error || !roll) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <Text style={styles.errorTitle}>Unable to load roll</Text>
        <Text style={styles.errorText}>{error || 'Roll not found'}</Text>
      </View>
    );
  }

  const submissionDate = roll.submission_deadline
    ? new Date(roll.submission_deadline).toLocaleDateString()
    : 'Not set';
  const releaseDate = roll.release_date
    ? new Date(roll.release_date).toLocaleDateString()
    : 'Not set';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {roll.title}
            </Text>
            {roll.is_public && (
              <View style={styles.publicBadge}>
                <Ionicons name="globe" size={14} color={colors.primary} />
                <Text style={styles.publicBadgeText}>Public</Text>
              </View>
            )}
          </View>
          {roll.description ? (
            <Text style={styles.description} numberOfLines={4} ellipsizeMode="tail">
              {roll.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="pulse" size={20} color={colors.primary} />
              <Text style={styles.metaValue} numberOfLines={1}>
                {roll.status}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={styles.metaValue} numberOfLines={1}>
                {images.length}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.metaValue} numberOfLines={1}>
                {contributorsCount}
              </Text>
            </View>
          </View>

          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <View style={styles.dateHeader}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaLabel}>Submission deadline</Text>
              </View>
              <Text style={styles.dateValue}>{submissionDate}</Text>
            </View>
            <View style={styles.dateItem}>
              <View style={styles.dateHeader}>
                <Ionicons name="film-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaLabel}>Development date</Text>
              </View>
              <Text style={styles.dateValue}>{releaseDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.galleryHeader}>
          <Text style={styles.galleryTitle}>Photos</Text>
          {isLocked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
              <Text style={styles.lockBadgeText}>Locked until release</Text>
            </View>
          )}
        </View>

        {images.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptyText}>Photos will appear here once submitted.</Text>
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderImageItem}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            scrollEnabled={false}
            contentContainerStyle={styles.grid}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    zIndex: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  content: {
    padding: GRID_PADDING,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  publicBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 10,
  },
  metaPill: {
    flexBasis: '31%',
    minWidth: 90,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 6,
  },
  pillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    flexShrink: 1,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'center',
  },
  datesRow: {
    marginTop: 4,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    gap: 8,
  },
  dateItem: {
    marginBottom: 6,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  grid: {
    paddingBottom: 12,
  },
  columnWrapper: {
    marginBottom: GRID_GAP,
  },
  imageWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  lockIconWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  emptyState: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default RollDetailScreen;

