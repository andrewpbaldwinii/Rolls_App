import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
  Image,
  Dimensions,
  Switch,
  PermissionsAndroid,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRolls } from '../contexts/RollsContext';
import { setRollPublic } from '../services/publicProfile';
import { uploadRollTitleImage } from '../services/storage';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

/** @returns {number|null} null = no limit */
function parseContributorPhotoLimitInput(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  if (Number.isNaN(n) || n < 1) {
    throw new Error('Photo limit must be a whole number of 1 or more, or leave blank for no limit.');
  }
  return n;
}

const RollsScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { rolls, loading, error, createRoll, updateRoll, deleteRoll, fetchRolls, getOwnedRolls, getContributedRolls } = useRolls();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoll, setEditingRoll] = useState(null);
  const [rollName, setRollName] = useState('');
  const [rollDescription, setRollDescription] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState(new Date());
  const [releaseDate, setReleaseDate] = useState(null);
  const [showSubmissionDatePicker, setShowSubmissionDatePicker] = useState(false);
  const [showReleaseDatePicker, setShowReleaseDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [titleImageUri, setTitleImageUri] = useState(null);
  const [titleImageBase64, setTitleImageBase64] = useState(null);
  const [uploadingTitleImage, setUploadingTitleImage] = useState(false);
  const [contributorPhotoLimitText, setContributorPhotoLimitText] = useState('');

  const ownedRolls = getOwnedRolls().filter(
    roll => roll.title?.toLowerCase() !== 'profile photos'
  );
  const contributedRolls = getContributedRolls().filter(
    roll => roll.title?.toLowerCase() !== 'profile photos'
  );
  
  // Debug logging
  useEffect(() => {
    console.log('📊 RollsScreen - Roll counts:', {
      totalRolls: rolls.length,
      ownedRolls: ownedRolls.length,
      contributedRolls: contributedRolls.length,
      ownedRollTitles: ownedRolls.map(r => r.title),
      contributedRollTitles: contributedRolls.map(r => r.title),
    });
  }, [rolls, ownedRolls, contributedRolls]);
  const activeRolls = rolls.filter(
    roll => roll.status === 'active' && roll.title?.toLowerCase() !== 'profile photos'
  );
  const archivedRolls = rolls.filter(
    roll => roll.status === 'archived' && roll.title?.toLowerCase() !== 'profile photos'
  );
  const [imageCounts, setImageCounts] = useState({});
  const [titleImageUrls, setTitleImageUrls] = useState({}); // Cache for processed title image URLs
  const hasRefreshedRef = useRef(false);
  const lastFocusTimeRef = useRef(0);

  // Batch process title image URLs for better performance
  const processTitleImages = useCallback(async (rollsToProcess) => {
    if (!rollsToProcess || rollsToProcess.length === 0) return;
    
    // Filter rolls that need processing (have title_image_url but not in cache)
    const rollsToProcessList = rollsToProcess.filter(
      roll => roll.title_image_url && !titleImageUrls[roll.id]
    );
    
    if (rollsToProcessList.length === 0) return; // Nothing to process
    
    try {
      const { getRollImageUrlAsync } = await import('../services/storage');
      
      // Process all title images in parallel (batch API calls for efficiency)
      const imagePromises = rollsToProcessList.map(async (roll) => {
        try {
          const processedUrl = await getRollImageUrlAsync(roll.title_image_url, 'title');
          return { rollId: roll.id, url: processedUrl || roll.title_image_url };
        } catch (err) {
          console.warn(`Error processing title image for roll ${roll.id}:`, err);
          return { rollId: roll.id, url: roll.title_image_url }; // Fallback to original
        }
      });
      
      const results = await Promise.all(imagePromises);
      
      // Update cache in one batch to avoid multiple re-renders
      setTitleImageUrls(prev => {
        const newUrls = { ...prev };
        results.forEach(({ rollId, url }) => {
          if (url) {
            newUrls[rollId] = url;
          }
        });
        return newUrls;
      });
    } catch (err) {
      console.error('Error batch processing title images:', err);
    }
  }, [titleImageUrls]);

  // Fetch image counts for all rolls
  const fetchImageCounts = useCallback(async () => {
    if (rolls.length === 0) return;
    
    const counts = {};
    for (const roll of rolls) {
      try {
        // Fetch all images first, then filter (more reliable with RLS)
        const { data, error } = await supabase
          .from('roll_images')
          .select('id, caption')
          .eq('roll_id', roll.id);
        
        if (!error && data) {
          // Filter out title images manually
          const filteredImages = data.filter(img => img.caption !== '__title_image__');
          counts[roll.id] = filteredImages.length;
        } else {
          console.error(`Error fetching count for roll ${roll.id}:`, error);
          counts[roll.id] = 0;
        }
      } catch (err) {
        console.error(`Error fetching count for roll ${roll.id}:`, err);
        counts[roll.id] = 0;
      }
    }
    setImageCounts(counts);
  }, [rolls]);

  useEffect(() => {
    fetchImageCounts();
  }, [fetchImageCounts]);

  // Refetch image counts when screen comes into focus (e.g., after taking a photo)
  // Also refresh rolls when screen comes into focus (e.g., after accepting an invite)
  // Use time-based guard to prevent infinite loops
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Only refresh if it's been more than 2 seconds since last refresh
      // This prevents rapid-fire refreshes while still allowing manual refresh
      if (now - lastFocusTimeRef.current > 2000) {
        fetchRolls();
        fetchImageCounts();
        lastFocusTimeRef.current = now;
      }
    }, [fetchRolls, fetchImageCounts]) // Include deps but use time-based guard
  );

  // Open create-roll modal when navigated from Camera (or elsewhere) with this param
  useFocusEffect(
    useCallback(() => {
      if (route.params?.openCreateRoll) {
        setShowCreateModal(true);
        navigation.setParams({ openCreateRoll: undefined });
      }
    }, [navigation, route.params?.openCreateRoll])
  );

  // Process title images when rolls change
  useEffect(() => {
    if (rolls.length > 0) {
      processTitleImages(rolls);
    }
  }, [rolls, processTitleImages]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRolls();
      // Image counts will be updated via the useEffect when rolls update
    } catch (error) {
      console.error('Error refreshing rolls:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTitleImagePicker = async () => {
    // Request permissions on Android
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Photo Access',
            message: 'Rolls needs access to your photos to set a title image.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Photo access is required to set a title image.');
          return;
        }
      } catch (err) {
        console.warn('Permission error:', err);
      }
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: true,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorCode) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setTitleImageUri(asset.uri);
        if (asset.base64) {
          setTitleImageBase64(asset.base64);
        }
      }
    });
  };

  const handleCreateRoll = async () => {
    if (!rollName.trim()) {
      Alert.alert('Error', 'Please enter a roll name');
      return;
    }

    // Validate submission deadline is in the future
    const now = new Date();
    if (submissionDeadline <= now) {
      Alert.alert('Error', 'Submission deadline must be in the future');
      return;
    }

    // Validate release date (Develop) is after submission deadline
    if (releaseDate && releaseDate <= submissionDeadline) {
      Alert.alert('Error', 'Develop date must be after the submission deadline');
      return;
    }

    let contributorPhotoLimit;
    try {
      contributorPhotoLimit = parseContributorPhotoLimitInput(contributorPhotoLimitText);
    } catch (e) {
      Alert.alert('Error', e.message || 'Invalid photo limit');
      return;
    }

    setCreating(true);
    try {
      // Create roll first to get the roll ID
      const roll = await createRoll({
        name: rollName.trim(),
        description: rollDescription.trim() || null,
        submission_deadline: submissionDeadline.toISOString(),
        release_date: releaseDate ? releaseDate.toISOString() : null,
        status: 'active',
        is_public: isPublic,
        contributor_photo_limit: contributorPhotoLimit,
      });

      // Upload title image if selected (optimize with optimistic update)
      let finalTitleImageUrl = null;
      if (titleImageUri && titleImageBase64) {
        setUploadingTitleImage(true);
        try {
          // Optimistic: Add the local URI to cache immediately for instant feedback
          const tempUrl = titleImageUri;
          setTitleImageUrls(prev => ({ ...prev, [roll.id]: tempUrl }));
          
          const titleImageUrl = await uploadRollTitleImage(roll.id, titleImageUri, titleImageBase64);
          finalTitleImageUrl = titleImageUrl;
          
          // Update roll with title image URL
          // Title images are public and separate from roll images (which are locked until release date)
          await updateRoll(roll.id, { title_image_url: titleImageUrl });
          
          // Update cache with final URL
          setTitleImageUrls(prev => ({ ...prev, [roll.id]: titleImageUrl }));
          // Title images are NOT stored in roll_images - they're separate and always public
        } catch (uploadError) {
          console.error('Error uploading title image:', uploadError);
          // Remove optimistic update on error
          setTitleImageUrls(prev => {
            const newUrls = { ...prev };
            delete newUrls[roll.id];
            return newUrls;
          });
          // Don't fail the roll creation if image upload fails
          Alert.alert('Warning', 'Roll created but title image upload failed. You can add it later.');
        } finally {
          setUploadingTitleImage(false);
        }
      }
      
      setRollName('');
      setRollDescription('');
      setSubmissionDeadline(new Date());
      setReleaseDate(null);
      setIsPublic(false);
      setContributorPhotoLimitText('');
      setTitleImageUri(null);
      setTitleImageBase64(null);
      setShowCreateModal(false);
      
      // Refresh rolls to show the new roll with title image immediately
      await fetchRolls();
      
      Alert.alert('Success', 'Roll created successfully!');
    } catch (error) {
      console.error('Error creating roll:', error);
      Alert.alert('Error', error.message || 'Failed to create roll');
    } finally {
      setCreating(false);
      setUploadingTitleImage(false);
    }
  };

  const handleTogglePublic = async (rollId, currentPublicStatus) => {
    try {
      await setRollPublic(rollId, !currentPublicStatus);
      await fetchRolls(); // Refresh rolls list
      Alert.alert('Success', `Roll ${!currentPublicStatus ? 'made public' : 'made private'}`);
    } catch (error) {
      console.error('Error toggling roll public status:', error);
      Alert.alert('Error', 'Failed to update roll visibility');
    }
  };

  const handleDeleteRoll = (roll) => {
    // Only allow deletion for owned rolls
    const isOwned = ownedRolls.some(r => r.id === roll.id);
    if (!isOwned) {
      return;
    }

    Alert.alert(
      'Delete Roll',
      `Are you sure you want to delete "${roll.title}"? This will also delete all photos in this roll. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoll(roll.id);
              Alert.alert('Success', 'Roll deleted successfully');
            } catch (error) {
              console.error('Error deleting roll:', error);
              Alert.alert('Error', error.message || 'Failed to delete roll');
            }
          },
        },
      ]
    );
  };

  const handleEditRoll = (roll) => {
    setEditingRoll(roll);
    setRollName(roll.title);
    setRollDescription(roll.description || '');
    setSubmissionDeadline(roll.submission_deadline ? new Date(roll.submission_deadline) : new Date());
    setReleaseDate(roll.release_date ? new Date(roll.release_date) : null);
    setContributorPhotoLimitText(
      roll.contributor_photo_limit != null ? String(roll.contributor_photo_limit) : '',
    );
    setShowEditModal(true);
  };

  const handleUpdateRoll = async () => {
    if (!rollName.trim()) {
      Alert.alert('Error', 'Please enter a roll name');
      return;
    }

    if (!editingRoll) return;

    // Validate submission deadline is in the future (if changed)
    const now = new Date();
    if (submissionDeadline <= now) {
      Alert.alert('Error', 'Submission deadline must be in the future');
      return;
    }

    // Validate release date (if set) is after submission deadline
    if (releaseDate && releaseDate <= submissionDeadline) {
      Alert.alert('Error', 'Develop date must be after the submission deadline');
      return;
    }

    let contributorPhotoLimit;
    try {
      contributorPhotoLimit = parseContributorPhotoLimitInput(contributorPhotoLimitText);
    } catch (e) {
      Alert.alert('Error', e.message || 'Invalid photo limit');
      return;
    }

    setUpdating(true);
    try {
      // Update roll data first (faster, doesn't require image upload)
      await updateRoll(editingRoll.id, {
        title: rollName.trim(),
        description: rollDescription.trim() || null,
        submission_deadline: submissionDeadline.toISOString(),
        release_date: releaseDate ? releaseDate.toISOString() : null,
        contributor_photo_limit: contributorPhotoLimit,
      });
      
      // Handle title image upload separately (can be slow)
      if (titleImageUri && titleImageBase64) {
        setUploadingTitleImage(true);
        try {
          // Optimistic: Update cache immediately with local URI for instant feedback
          const tempUrl = titleImageUri;
          setTitleImageUrls(prev => ({ ...prev, [editingRoll.id]: tempUrl }));
          
          const titleImageUrl = await uploadRollTitleImage(editingRoll.id, titleImageUri, titleImageBase64);
          
          // Update roll with title image URL
          await updateRoll(editingRoll.id, { title_image_url: titleImageUrl });
          
          // Update cache with final URL
          setTitleImageUrls(prev => ({ ...prev, [editingRoll.id]: titleImageUrl }));
        } catch (uploadError) {
          console.error('Error uploading title image:', uploadError);
          // Remove optimistic update on error
          setTitleImageUrls(prev => {
            const newUrls = { ...prev };
            delete newUrls[editingRoll.id];
            return newUrls;
          });
          Alert.alert('Warning', 'Roll updated but title image upload failed. You can try again later.');
        } finally {
          setUploadingTitleImage(false);
        }
      }
      
      // Explicitly refresh rolls to ensure UI updates
      await fetchRolls();
      
      setRollName('');
      setRollDescription('');
      setSubmissionDeadline(new Date());
      setReleaseDate(null);
      setContributorPhotoLimitText('');
      setTitleImageUri(null);
      setTitleImageBase64(null);
      setEditingRoll(null);
      setShowEditModal(false);
      Alert.alert('Success', 'Roll updated successfully!');
    } catch (error) {
      console.error('Error updating roll:', error);
      Alert.alert('Error', error.message || 'Failed to update roll');
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingRoll(null);
    setRollName('');
    setRollDescription('');
    setSubmissionDeadline(new Date());
    setReleaseDate(null);
    setContributorPhotoLimitText('');
    setShowSubmissionDatePicker(false);
    setShowReleaseDatePicker(false);
  };

  // RollCard component - optimized to use pre-processed title image URLs
  const RollCard = React.memo(({ roll, isOwned, photoCount, titleImageUrl, onPress, onLongPress, onEdit, onTogglePublic }) => {
    
    return (
      <TouchableOpacity
        style={styles.rollCard}
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        {/* Title Image */}
        {titleImageUrl ? (
          <View style={styles.rollCardImageContainer}>
            <Image 
              source={{ uri: titleImageUrl }} 
              style={styles.rollCardImage}
              resizeMode="cover"
            />
          </View>
        ) : null}
        <View style={styles.rollCardHeader}>
          <View style={styles.rollCardInfo}>
            <View style={styles.rollCardHeaderTopRow}>
              <View style={styles.rollCardTitleMain}>
                <Text style={styles.rollCardName} numberOfLines={2}>
                  {roll.title}
                </Text>
                {isOwned && roll.is_public && (
                  <Ionicons name="globe" size={16} color={colors.primary} style={styles.publicIcon} />
                )}
              </View>
              <View style={styles.rollCardHeaderRight}>
                {isOwned && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={onEdit}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.buttonPrimary} />
                  </TouchableOpacity>
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </View>
            <View style={styles.rollMetaLine}>
              <View style={styles.rollStatusChip}>
                <Text style={styles.rollStatusChipText} numberOfLines={1}>
                  {roll.status}
                </Text>
              </View>
              {isOwned && (
                <TouchableOpacity
                  style={[
                    styles.rollVisibilityChip,
                    roll.is_public && styles.rollVisibilityChipPublic,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onTogglePublic(roll.id, roll.is_public);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={roll.is_public ? 'globe-outline' : 'lock-closed-outline'}
                    size={13}
                    color={roll.is_public ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.rollVisibilityChipText,
                      roll.is_public && styles.rollVisibilityChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {roll.is_public ? 'Public' : 'Private'}
                  </Text>
                </TouchableOpacity>
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
            {roll.description && (
              <Text style={styles.rollCardDescription} numberOfLines={2}>
                {roll.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.rollCardFooter}>
          <View style={styles.rollCardFooterPhotoRow}>
            <Ionicons name="images" size={14} color={colors.textSecondary} />
            <Text style={styles.photoCountText} numberOfLines={1}>
              {photoCount} photo{photoCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  const renderRollCard = (roll, isOwned = false) => {
    const photoCount = imageCounts[roll.id] || 0;
    const titleImageUrl = titleImageUrls[roll.id] || roll.title_image_url || null;
    
    return (
      <RollCard
        key={roll.id}
        roll={roll}
        isOwned={isOwned}
        photoCount={photoCount}
        titleImageUrl={titleImageUrl}
        onPress={() => {
          navigation.navigate('RollDetail', { rollId: roll.id, initialRoll: roll });
        }}
        onLongPress={() => {
          if (isOwned) {
            handleDeleteRoll(roll);
          }
        }}
        onEdit={(e) => {
          e.stopPropagation();
          handleEditRoll(roll);
        }}
        onTogglePublic={handleTogglePublic}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>My Rolls</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={colors.buttonText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.buttonPrimary}
            colors={[colors.buttonPrimary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonPrimary} />
            <Text style={styles.loadingText}>Loading rolls...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
            <Text style={styles.errorTitle}>Error Loading Rolls</Text>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes('does not exist') || error.includes('PGRST116') ? (
              <View style={styles.errorHelp}>
                <Text style={styles.errorHelpText}>
                  The database tables don't exist yet.{'\n'}
                  Please create them using the SQL scripts in DATABASE_SCHEMA.md
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchRolls}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Active Rolls - Owned - Always show even if empty */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Rolls</Text>
              {(() => {
                // Show all active rolls (filter out archived, but show active, developing, and developed)
                const activeOwnedRolls = ownedRolls.filter(r => r.status !== 'archived');
                const displayedRolls = activeOwnedRolls.slice(0, 3);
                const hasMore = activeOwnedRolls.length > 3;
                
                return activeOwnedRolls.length > 0 ? (
                  <>
                    {displayedRolls.map(roll => renderRollCard(roll, true))}
                    {hasMore && (
                      <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('AllRolls', { sectionType: 'owned' })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.viewAllButtonText}>View All ({activeOwnedRolls.length})</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.buttonPrimary} />
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptySection}>
                    <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                    <Text style={styles.emptySectionText}>No rolls yet. Create your first roll to get started!</Text>
                  </View>
                );
              })()}
            </View>

            {/* Active Rolls - Contributed (Invited Rolls) - Always show even if empty */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invited Rolls</Text>
              {(() => {
                // Show all active rolls (filter out archived, but show active, developing, and developed)
                const activeContributedRolls = contributedRolls.filter(r => r.status !== 'archived');
                const displayedRolls = activeContributedRolls.slice(0, 3);
                const hasMore = activeContributedRolls.length > 3;
                
                return activeContributedRolls.length > 0 ? (
                  <>
                    {displayedRolls.map(roll => renderRollCard(roll, false))}
                    {hasMore && (
                      <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('AllRolls', { sectionType: 'contributed' })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.viewAllButtonText}>View All ({activeContributedRolls.length})</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.buttonPrimary} />
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptySection}>
                    <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
                    <Text style={styles.emptySectionText}>No invites yet. Others can invite you to contribute to their rolls.</Text>
                  </View>
                );
              })()}
            </View>

            {/* Archived Rolls */}
            {archivedRolls.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Archived</Text>
                {archivedRolls.map(roll => renderRollCard(roll, ownedRolls.some(r => r.id === roll.id)))}
              </View>
            )}

            {/* Empty State */}
            {rolls.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No Rolls Yet</Text>
                <Text style={styles.emptyText}>
                  Create your first roll to start sharing photos
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.emptyButtonText}>Create Roll</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Roll Modal */}
      {showEditModal && editingRoll && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Roll</Text>
              <TouchableOpacity
                onPress={handleCloseEditModal}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>Roll Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter roll name"
                placeholderTextColor={colors.inputPlaceholder}
                value={rollName}
                onChangeText={setRollName}
                autoFocus
              />

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe this roll"
                placeholderTextColor={colors.inputPlaceholder}
                value={rollDescription}
                onChangeText={setRollDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Contributor photo limit (Optional)</Text>
              <Text style={styles.inputHelperText}>
                Max photos each invited contributor may add. Leave blank for no limit. You (the owner) are not limited.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10"
                placeholderTextColor={colors.inputPlaceholder}
                value={contributorPhotoLimitText}
                onChangeText={setContributorPhotoLimitText}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Submission Deadline *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowSubmissionDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} style={styles.datePickerIcon} />
                <Text style={styles.datePickerText}>
                  {submissionDeadline.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showSubmissionDatePicker && (
                <>
                  {Platform.OS === 'ios' ? (
                    <View style={styles.iosPickerContainer}>
                      <View style={styles.iosPickerHeader}>
                        <TouchableOpacity
                          onPress={() => setShowSubmissionDatePicker(false)}
                          style={styles.iosPickerButton}
                        >
                          <Text style={styles.iosPickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.iosPickerTitle}>Submission Deadline</Text>
                        <TouchableOpacity
                          onPress={() => {
                            // Date is already set in state via onChange
                            setShowSubmissionDatePicker(false);
                          }}
                          style={styles.iosPickerButton}
                        >
                          <Text style={styles.iosPickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={submissionDeadline}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            // Set time to end of day (23:59:59)
                            const date = new Date(selectedDate);
                            date.setHours(23, 59, 59, 999);
                            setSubmissionDeadline(date);
                            // If release date is before new submission deadline, clear it
                            if (releaseDate && releaseDate <= date) {
                              setReleaseDate(null);
                            }
                          }
                        }}
                        minimumDate={new Date()}
                      />
                    </View>
                  ) : (
                    <DateTimePicker
                      value={submissionDeadline}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        // On Android, hide picker immediately after it's shown
                        setShowSubmissionDatePicker(false);
                        
                        // Handle date selection
                        if (event.type === 'set' && selectedDate) {
                          // Set time to end of day (23:59:59)
                          const date = new Date(selectedDate);
                          date.setHours(23, 59, 59, 999);
                          setSubmissionDeadline(date);
                          // If release date is before new submission deadline, clear it
                          if (releaseDate && releaseDate <= date) {
                            setReleaseDate(null);
                          }
                        }
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Develop Date (Optional)</Text>
              <Text style={styles.inputHelperText}>
                Photos will be hidden until this date. Must be after submission deadline.
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowReleaseDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="film-outline" size={20} color={colors.textPrimary} style={styles.datePickerIcon} />
                <Text style={styles.datePickerText}>
                  {releaseDate
                    ? releaseDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Not set (photos visible immediately)'}
                </Text>
              </TouchableOpacity>
              {showReleaseDatePicker && (
                <>
                  {Platform.OS === 'ios' ? (
                    <View style={styles.iosPickerContainer}>
                      <View style={styles.iosPickerHeader}>
                        <TouchableOpacity
                          onPress={() => {
                            // Cancel - don't change the date
                            setShowReleaseDatePicker(false);
                          }}
                          style={styles.iosPickerButton}
                        >
                          <Text style={styles.iosPickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.iosPickerTitle}>Develop Date</Text>
                        <TouchableOpacity
                          onPress={() => {
                            // Done - date is already set in state via onChange
                            setShowReleaseDatePicker(false);
                          }}
                          style={styles.iosPickerButton}
                        >
                          <Text style={styles.iosPickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={releaseDate || new Date(submissionDeadline.getTime() + 24 * 60 * 60 * 1000)}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            // Set time to end of day (23:59:59)
                            const date = new Date(selectedDate);
                            date.setHours(23, 59, 59, 999);
                            setReleaseDate(date);
                          }
                        }}
                        minimumDate={new Date(submissionDeadline.getTime() + 24 * 60 * 60 * 1000)}
                      />
                    </View>
                  ) : (
                    <DateTimePicker
                      value={releaseDate || new Date(submissionDeadline.getTime() + 24 * 60 * 60 * 1000)}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        // On Android, hide picker immediately after it's shown
                        setShowReleaseDatePicker(false);
                        
                        // Handle date selection
                        if (event.type === 'set' && selectedDate) {
                          // Set time to end of day (23:59:59)
                          const date = new Date(selectedDate);
                          date.setHours(23, 59, 59, 999);
                          setReleaseDate(date);
                        } else if (event.type === 'dismissed') {
                          // User cancelled - don't set date
                          setReleaseDate(null);
                        }
                      }}
                      minimumDate={new Date(submissionDeadline.getTime() + 24 * 60 * 60 * 1000)}
                    />
                  )}
                </>
              )}

              <TouchableOpacity
                style={[styles.createRollButton, updating && styles.createRollButtonDisabled]}
                onPress={handleUpdateRoll}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <Text style={styles.createRollButtonText}>Update Roll</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Create Roll Modal */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Roll</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setRollName('');
                  setRollDescription('');
                  setSubmissionDeadline(new Date());
                  setReleaseDate(null);
                  setIsPublic(false);
                  setContributorPhotoLimitText('');
                  setTitleImageUri(null);
                  setTitleImageBase64(null);
                  setShowSubmissionDatePicker(false);
                  setShowReleaseDatePicker(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>Roll Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter roll name"
                placeholderTextColor={colors.inputPlaceholder}
                value={rollName}
                onChangeText={setRollName}
                autoFocus
              />

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe this roll"
                placeholderTextColor={colors.inputPlaceholder}
                value={rollDescription}
                onChangeText={setRollDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Contributor photo limit (Optional)</Text>
              <Text style={styles.inputHelperText}>
                Max photos each invited contributor may add. Leave blank for no limit. You (the owner) are not limited.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10"
                placeholderTextColor={colors.inputPlaceholder}
                value={contributorPhotoLimitText}
                onChangeText={setContributorPhotoLimitText}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Submission Deadline *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowSubmissionDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} style={styles.datePickerIcon} />
                <Text style={styles.datePickerText}>
                  {submissionDeadline.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showSubmissionDatePicker && (
                <>
                  {Platform.OS === 'ios' ? (
                    <View style={styles.iosPickerContainer}>
                      <View style={styles.iosPickerHeader}>
                        <TouchableOpacity
                          onPress={() => setShowSubmissionDatePicker(false)}
                          style={styles.iosPickerButton}
                        >
                          <Text style={styles.iosPickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.iosPickerTitle}>Submission Deadline</Text>
                        <TouchableOpacity
                          onPress={() => {
                            // Date is already set in state via onChange
                            setShowSubmissionDatePicker(false);
                          }}
                          style={styles.iosPickerButton}
                        >
                          <Text style={styles.iosPickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={submissionDeadline}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            // Set time to end of day (23:59:59)
                            const date = new Date(selectedDate);
                            date.setHours(23, 59, 59, 999);
                            setSubmissionDeadline(date);
                            // If release date is before new submission deadline, clear it
                            if (releaseDate && releaseDate <= date) {
                              setReleaseDate(null);
                            }
                          }
                        }}
                        minimumDate={new Date()}
                      />
                    </View>
                  ) : (
                    <DateTimePicker
                      value={submissionDeadline}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        // On Android, hide picker immediately after it's shown
                        setShowSubmissionDatePicker(false);
                        
                        // Handle date selection
                        if (event.type === 'set' && selectedDate) {
                          // Set time to end of day (23:59:59)
                          const date = new Date(selectedDate);
                          date.setHours(23, 59, 59, 999);
                          setSubmissionDeadline(date);
                          // If release date is before new submission deadline, clear it
                          if (releaseDate && releaseDate <= date) {
                            setReleaseDate(null);
                          }
                        }
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Develop Date (Optional)</Text>
              <Text style={styles.inputHelperText}>
                Photos will be hidden until this date. Must be after submission deadline.
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowReleaseDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="film-outline" size={20} color={colors.textPrimary} style={styles.datePickerIcon} />
                <Text style={styles.datePickerText}>
                  {releaseDate
                    ? releaseDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Not set (photos visible immediately)'}
                </Text>
              </TouchableOpacity>
              {showReleaseDatePicker && (
                <>
                  {Platform.OS === 'ios' ? (
                    <View style={styles.iosPickerContainer}>
                      <View style={styles.iosPickerHeader}>
                        <TouchableOpacity
                          onPress={() => {
                            // Cancel - don't change the date
                            setShowReleaseDatePicker(false);
                          }}
                          style={styles.iosPickerButton}
                        >
                          <Text style={styles.iosPickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.iosPickerTitle}>Develop Date</Text>
                        <TouchableOpacity
                          onPress={() => {
                            // Done - date is already set in state via onChange
                            setShowReleaseDatePicker(false);
                          }}
                          style={styles.iosPickerButton}
                        >
                          <Text style={styles.iosPickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={releaseDate || new Date(submissionDeadline.getTime() + 24 * 60 * 60 * 1000)}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            // Set time to end of day (23:59:59)
                            const date = new Date(selectedDate);
                            date.setHours(23, 59, 59, 999);
                            setReleaseDate(date);
                          }
                        }}
                        minimumDate={new Date(submissionDeadline.getTime() + 24 * 60 * 60 * 1000)}
                      />
                    </View>
                  ) : (
                    <DateTimePicker
                      value={releaseDate || new Date(submissionDeadline.getTime() + 24 * 60 * 60 * 1000)}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        // On Android, hide picker immediately after it's shown
                        setShowReleaseDatePicker(false);
                        
                        // Handle date selection
                        if (event.type === 'set' && selectedDate) {
                          // Set time to end of day (23:59:59)
                          const date = new Date(selectedDate);
                          date.setHours(23, 59, 59, 999);
                          setReleaseDate(date);
                        } else if (event.type === 'dismissed') {
                          // User cancelled - don't set date
                          setReleaseDate(null);
                        }
                      }}
                      minimumDate={new Date(submissionDeadline.getTime() + 24 * 60 * 60 * 1000)}
                    />
                  )}
                </>
              )}

              <Text style={[styles.inputLabel, styles.inputLabelMargin]}>Title Image (Optional)</Text>
              <Text style={styles.inputHelperText}>
                Upload an image to appear at the top of this roll
              </Text>
              <TouchableOpacity
                style={styles.titleImageButton}
                onPress={handleTitleImagePicker}
                activeOpacity={0.7}
                disabled={uploadingTitleImage}
              >
                {titleImageUri ? (
                  <Image source={{ uri: titleImageUri }} style={styles.titleImagePreview} />
                ) : (
                  <View style={styles.titleImagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                    <Text style={styles.titleImagePlaceholderText}>Select Title Image</Text>
                  </View>
                )}
              </TouchableOpacity>
              {titleImageUri && (
                <TouchableOpacity
                  style={styles.removeTitleImageButton}
                  onPress={() => {
                    setTitleImageUri(null);
                    setTitleImageBase64(null);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                  <Text style={styles.removeTitleImageText}>Remove</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.inputLabelMargin, styles.publicToggleContainer]}>
                <View style={styles.publicToggleRow}>
                  <View style={styles.publicToggleLabelContainer}>
                    <Ionicons 
                      name={isPublic ? 'globe' : 'lock-closed'} 
                      size={20} 
                      color={isPublic ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={styles.publicToggleLabel}>Make this roll public</Text>
                  </View>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{ false: colors.inputBorder, true: colors.primary + '80' }}
                    thumbColor={isPublic ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text style={styles.inputHelperText}>
                  Public rolls will appear on your profile after the release date
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.createRollButton, (creating || uploadingTitleImage) && styles.createRollButtonDisabled]}
                onPress={handleCreateRoll}
                disabled={creating || uploadingTitleImage}
              >
                {(creating || uploadingTitleImage) ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <Text style={styles.createRollButtonText}>Create Roll</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorHelp: {
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    maxWidth: '100%',
  },
  errorHelpText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginLeft: 8,
    marginBottom: 12,
  },
  rollCard: {
    backgroundColor: colors.background,
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
    marginBottom: 12,
  },
  rollCardHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
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
  rollStatusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(94, 200, 191, 0.16)' : 'rgba(59, 184, 173, 0.14)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(94, 200, 191, 0.28)' : 'rgba(59, 184, 173, 0.22)',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rollStatusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  rollVisibilityChip: {
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
  rollVisibilityChipPublic: {
    borderColor: isDark ? 'rgba(94, 200, 191, 0.35)' : 'rgba(59, 184, 173, 0.35)',
    backgroundColor: isDark ? 'rgba(94, 200, 191, 0.08)' : 'rgba(59, 184, 173, 0.06)',
  },
  rollVisibilityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rollVisibilityChipTextActive: {
    color: colors.primary,
  },
  rollCardInfo: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  rollCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  editButton: {
    padding: 4,
  },
  rollCardTitleMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  rollCardName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
  },
  publicIcon: {
    marginLeft: 8,
    marginTop: 2,
  },
  rollCardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  rollCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  rollCardFooterPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicToggleContainer: {
    marginTop: 8,
  },
  publicToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  publicToggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  publicToggleLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  titleImageButton: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  titleImagePreview: {
    width: '100%',
    height: '100%',
  },
  titleImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleImagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  removeTitleImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  removeTitleImageText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.error,
  },
  photoCountText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  rollCardDateInline: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 0,
    fontWeight: '500',
  },
  rollCardImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: colors.inputBackground,
  },
  rollCardImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptySection: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
    marginRight: 8,
  },
  emptyButton: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  iosPickerContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
  },
  iosPickerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 60,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  iosPickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
    textAlign: 'right',
  },
  iosPickerCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'left',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    // Only constrains on small screens; doesn't change the "look" unless content overflows.
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalBodyContent: {
    paddingTop: 20,
    paddingBottom: 28,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputLabelMargin: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.inputBackground,
  },
  datePickerIcon: {
    marginRight: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  inputHelperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  createRollButton: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createRollButtonDisabled: {
    backgroundColor: colors.buttonPrimaryDisabled,
  },
  createRollButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
});



export default RollsScreen;
