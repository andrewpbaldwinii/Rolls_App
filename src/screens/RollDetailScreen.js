import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  Alert,
  Platform,
  Switch,
  PermissionsAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useRolls } from '../contexts/RollsContext';
import { setRollPublic } from '../services/publicProfile';
import { uploadRollTitleImage } from '../services/storage';
import { acceptRollInvite, getPendingInvites } from '../services/rollInvites';
import { supabase } from '../lib/supabase';
import colors from '../constants/colors';
import OptimizedImage from '../components/OptimizedImage';

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
  const { user } = useAuth();
  const { updateRoll, fetchRolls } = useRolls();

  const [roll, setRoll] = useState(initialRoll || null);
  const [images, setImages] = useState([]);
  const [contributorsCount, setContributorsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingTitleImage, setUploadingTitleImage] = useState(false);
  const [updatingPublic, setUpdatingPublic] = useState(false);
  const [titleImageUrl, setTitleImageUrl] = useState(null);
  const [isContributor, setIsContributor] = useState(false);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [visibleImageIndices, setVisibleImageIndices] = useState(new Set([0, 1, 2, 3, 4, 5])); // Only load first 6 images initially

  const isOwner = useMemo(() => {
    return roll && user && roll.creator_id === user.id;
  }, [roll, user]);

  const isLocked = useMemo(() => {
    if (!roll?.release_date) return false;
    const release = new Date(roll.release_date);
    return release > new Date();
  }, [roll]);

  // View permissions:
  // - Owners and contributors can always see images (even if locked)
  // - Public rolls: Anyone can view all photos (regardless of release_date)
  // - Private rolls: Only owner/contributors can view (release_date still applies)
  const canViewImages = useMemo(() => {
    if (isOwner || isContributor) return true; // Owner/contributors always see
    
    // If roll is public, anyone can view (regardless of release_date)
    if (roll?.is_public) return true;
    
    // Private rolls: only owner/contributors can view
    return false;
  }, [isOwner, isContributor, roll?.is_public]);

  const fetchData = useCallback(async () => {
    if (!rollId) {
      setError('Missing roll id');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch roll details (if not provided)
      // Make sure to include is_public field
      if (!roll) {
        const { data, error: rollError } = await supabase
          .from('rolls')
          .select('*')
          .eq('id', rollId)
          .single();
        if (rollError) throw rollError;
        setRoll(data);
      } else if (!roll.hasOwnProperty('is_public')) {
        // If initialRoll was passed but doesn't have is_public, fetch it
        const { data, error: rollError } = await supabase
          .from('rolls')
          .select('is_public')
          .eq('id', rollId)
          .single();
        if (!rollError && data) {
          setRoll({ ...roll, is_public: data.is_public });
        }
      }

      // Process title image URL - ensure it uses roll-title-images bucket (public)
      if (roll?.title_image_url) {
        try {
          const { getRollImageUrlAsync } = await import('../services/storage');
          const processedTitleUrl = await getRollImageUrlAsync(roll.title_image_url, 'title');
          setTitleImageUrl(processedTitleUrl || roll.title_image_url);
        } catch (err) {
          console.warn('⚠️ Error processing title image URL:', err);
          setTitleImageUrl(roll.title_image_url); // Fallback to original
        }
      } else {
        setTitleImageUrl(null);
      }


      // Fetch roll images (exclude title images - they're separate and stored in rolls.title_image_url)
      // Title images are public and always visible, roll images are locked until release date
      let { data: imageData, error: imageError } = await supabase
        .from('roll_images')
        .select('*')
        .eq('roll_id', rollId)
        .order('created_at', { ascending: false });
      
      if (imageError) {
        console.error('❌ Error fetching roll images:', imageError);
        console.error('Error code:', imageError.code);
        console.error('Error message:', imageError.message);
        throw imageError;
      }
      
      // Filter out title images manually (more reliable than .neq() with nulls)
      if (imageData && imageData.length > 0) {
        imageData = imageData.filter(img => img.caption !== '__title_image__');
        
        // Ensure URLs are valid - generate signed URLs for roll-images bucket (private)
        const { getRollImageUrlAsync } = await import('../services/storage');
        const processedImages = await Promise.all(
          imageData.map(async (img) => {
            try {
              // Roll images are in roll-images bucket (private) - need signed URLs
              const validUrl = await getRollImageUrlAsync(img.image_url, 'roll');
              return {
                ...img,
                image_url: validUrl || img.image_url
              };
            } catch (err) {
              console.error(`❌ Error processing roll image URL for ${img.id}:`, err);
              return img; // Return original on error
            }
          })
        );
        imageData = processedImages;
      }
      
      // Set images (empty array is fine - roll might not have images yet)
      setImages(imageData || []);
      // Reset visible images to first 6 when images change
      setVisibleImageIndices(new Set([0, 1, 2, 3, 4, 5]));

      // Fetch contributors count
      // Count = 1 (owner from creator_id) + number of additional contributors in roll_contributors
      // Both owner and contributors should see the same count
      const currentRoll = roll || (await supabase.from('rolls').select('creator_id').eq('id', rollId).single()).data;
      const ownerId = currentRoll?.creator_id;
      
      // Get all contributor user_ids from roll_contributors table
      const { data: contributorsData, error: contribError } = await supabase
        .from('roll_contributors')
        .select('user_id')
        .eq('roll_id', rollId);
      if (contribError) throw contribError;
      
      // Count unique contributors: owner (1) + contributors in table (excluding owner if somehow present)
      const contributorUserIds = new Set(contributorsData?.map(c => c.user_id) || []);
      // Remove owner from contributors set if they're in there (they shouldn't be, but handle it)
      if (ownerId) {
        contributorUserIds.delete(ownerId);
      }
      
      // Total = 1 (owner) + additional contributors
      const totalCount = 1 + contributorUserIds.size;
      setContributorsCount(totalCount);

      // Check if current user is a contributor
      if (user?.id && !isOwner) {
        const { data: contributorData } = await supabase
          .from('roll_contributors')
          .select('id')
          .eq('roll_id', rollId)
          .eq('user_id', user.id)
          .single();
        setIsContributor(!!contributorData);
        
        // Check for pending invite if not a contributor
        if (!contributorData) {
          try {
            const pendingInvites = await getPendingInvites();
            const inviteForThisRoll = pendingInvites.find(invite => invite.roll_id === rollId);
            setPendingInvite(inviteForThisRoll || null);
          } catch (err) {
            console.error('Error checking pending invites:', err);
            setPendingInvite(null);
          }
        } else {
          setPendingInvite(null);
        }
      } else {
        setIsContributor(false);
        setPendingInvite(null);
      }
    } catch (err) {
      console.error('Error loading roll detail:', err);
      setError(err.message || 'Failed to load roll');
    } finally {
      setLoading(false);
    }
  }, [rollId, roll]);

  useEffect(() => {
    fetchData();
  }, [rollId, roll]);

  // Refetch data when screen comes into focus (e.g., after taking a photo)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleTitleImagePicker = async () => {
    if (!isOwner) return;

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

    launchImageLibrary(options, async (response) => {
      if (response.didCancel || response.errorCode) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.base64) {
          setUploadingTitleImage(true);
          try {
            const titleImageUrl = await uploadRollTitleImage(rollId, asset.uri, asset.base64);
            
            // Update roll with title image URL
            // Title images are public and separate from roll images (which are locked until release date)
            try {
              await updateRoll(rollId, { title_image_url: titleImageUrl });
            } catch (updateError) {
              // If update fails (e.g., column doesn't exist), try direct update
              console.warn('updateRoll failed, trying direct update:', updateError);
              const { error: directError } = await supabase
                .from('rolls')
                .update({ title_image_url: titleImageUrl })
                .eq('id', rollId);
              if (directError) throw directError;
            }
            
            // Title images are NOT stored in roll_images - they're separate and always public
            // No need to call upsertTitleImageAsRollImage
            
            // Force refresh roll data by fetching fresh from DB
            // Add a small delay to ensure DB commit is complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { data: updatedRoll, error: fetchError } = await supabase
              .from('rolls')
              .select('*')
              .eq('id', rollId)
              .single();
            
            if (fetchError) {
              console.error('Error fetching updated roll:', fetchError);
            } else if (updatedRoll) {
              console.log('✅ Fetched updated roll:', {
                id: updatedRoll.id,
                title_image_url: updatedRoll.title_image_url,
                hasUrl: !!updatedRoll.title_image_url
              });
              setRoll(updatedRoll);
              
              // Force a re-render by updating a dummy state if needed
              if (!updatedRoll.title_image_url) {
                console.warn('⚠️ Warning: title_image_url is null/undefined after update');
              }
            } else {
              console.warn('⚠️ No roll data returned from fetch');
            }
            
            Alert.alert('Success', 'Title image updated!');
          } catch (uploadError) {
            console.error('Error uploading title image:', uploadError);
            Alert.alert('Error', uploadError.message || 'Failed to upload title image. Please try again.');
          } finally {
            setUploadingTitleImage(false);
          }
        }
      }
    });
  };

  const handleTogglePublic = async (value) => {
    if (!isOwner) return;
    
    setUpdatingPublic(true);
    try {
      await setRollPublic(rollId, value);
      // Refresh roll data
      const { data: updatedRoll } = await supabase
        .from('rolls')
        .select('*')
        .eq('id', rollId)
        .single();
      if (updatedRoll) setRoll(updatedRoll);
      await fetchRolls(); // Refresh rolls list
    } catch (error) {
      console.error('Error toggling roll public status:', error);
      Alert.alert('Error', 'Failed to update roll visibility');
    } finally {
      setUpdatingPublic(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!pendingInvite) return;
    
    setAcceptingInvite(true);
    try {
      console.log('📥 Accepting roll invite:', pendingInvite.id);
      await acceptRollInvite(pendingInvite.id);
      
      // Refresh everything
      await fetchData();
      await fetchRolls(); // Refresh rolls list so it appears in RollsScreen
      
      Alert.alert('Success', 'You have been added as a contributor to this roll!');
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', error.message || 'Failed to accept invite. Please try again.');
    } finally {
      setAcceptingInvite(false);
    }
  };

  const renderImageItem = ({ item, index }) => {
    const isLastInRow = (index + 1) % GRID_COLUMNS === 0;
    const shouldShowLocked = isLocked && !canViewImages; // Only show locked for non-owners before release
    const shouldLoadImage = visibleImageIndices.has(index); // Only load visible images to prevent memory issues
    
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
        {shouldShowLocked ? (
          // Show locked placeholder for non-owners before release date
          <View style={styles.lockedImagePlaceholder}>
            <Ionicons name="lock-closed" size={32} color={colors.textSecondary} />
          </View>
        ) : shouldLoadImage ? (
          // Show image (owners/contributors can always see, others after release)
          // Only load if in visible set to prevent memory pool violations
          <View style={styles.imageContainer}>
            <OptimizedImage
              source={{ 
                uri: item.image_url,
                // Limit image size to prevent memory issues
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
              }}
              style={[
                styles.image,
                isLocked && styles.lockedImage // Blur/lock overlay for owners before release
              ]}
              resizeMethod="resize" // Use resize instead of scale
              resizeMode="cover"
              onError={(error) => {
                const errorDetails = error.nativeEvent || error;
                console.error('❌ Image load error for roll image:', {
                  imageId: item.id,
                  imageUrl: item.image_url,
                  error: errorDetails?.error || errorDetails?.message || errorDetails,
                });
                // Remove from visible set on error to prevent retry loops
                setVisibleImageIndices(prev => {
                  const next = new Set(prev);
                  next.delete(index);
                  return next;
                });
              }}
              onLoad={() => {
                console.log('✅ Roll image loaded successfully:', item.id);
                // Progressive loading: Load next batch after successful load
                // Only load next image when current one is the last visible
                const visibleArray = Array.from(visibleImageIndices);
                if (visibleArray.length > 0) {
                  const maxVisible = Math.max(...visibleArray);
                  if (index === maxVisible && index < images.length - 1) {
                    // Add next 3 images (one row) after a short delay to prevent memory spikes
                    setTimeout(() => {
                      setVisibleImageIndices(prev => {
                        const next = new Set(prev);
                        // Add next 3 images (next row) - load one row at a time
                        const nextBatchSize = Math.min(3, images.length - index - 1);
                        for (let i = 1; i <= nextBatchSize; i++) {
                          next.add(index + i);
                        }
                        return next;
                      });
                    }, 500); // 500ms delay between batches
                  }
                }
              }}
            />
            {isLocked && canViewImages && (
              // Lock overlay for owners/contributors before release
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={24} color={colors.background} />
              </View>
            )}
          </View>
        ) : (
          // Show placeholder for images not yet loaded (progressive loading)
          <View style={styles.lockedImagePlaceholder}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
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
        {/* Title Image - from roll-title-images bucket (public) */}
        {titleImageUrl ? (
          <View style={styles.titleImageContainer}>
            <OptimizedImage 
              source={{ uri: titleImageUrl }}
              style={styles.titleImage}
              resizeMode="cover"
              onError={(error) => {
                console.error('Title image load error:', error.nativeEvent?.error || error);
                console.log('Attempted URL:', titleImageUrl);
              }}
              onLoad={() => {
                console.log('✅ Title image loaded successfully');
              }}
            />
          {isOwner && (
            <TouchableOpacity
              style={styles.editTitleImageButton}
              onPress={handleTitleImagePicker}
              disabled={uploadingTitleImage}
            >
              {uploadingTitleImage ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Ionicons name="camera" size={20} color={colors.background} />
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : isOwner ? (
        <TouchableOpacity
          style={styles.addTitleImageButton}
          onPress={handleTitleImagePicker}
          disabled={uploadingTitleImage}
        >
          {uploadingTitleImage ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.addTitleImageText}>Add Title Image</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

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

        {/* Public/Private Toggle (Owner Only) */}
        {isOwner && (
          <View style={styles.publicToggleContainer}>
            <View style={styles.publicToggleRow}>
              <View style={styles.publicToggleLabelContainer}>
                <Ionicons 
                  name={roll.is_public ? 'globe' : 'lock-closed'} 
                  size={20} 
                  color={roll.is_public ? colors.primary : colors.textSecondary} 
                />
                <Text style={styles.publicToggleLabel}>
                  {roll.is_public ? 'Public' : 'Private'}
                </Text>
              </View>
              <Switch
                value={roll.is_public || false}
                onValueChange={handleTogglePublic}
                disabled={updatingPublic}
                trackColor={{ false: colors.inputBorder, true: colors.primary + '80' }}
                thumbColor={roll.is_public ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={styles.publicToggleHelper}>
              {roll.is_public 
                ? 'This roll will appear on your public profile after the release date'
                : 'This roll is private and only visible to contributors'}
            </Text>
          </View>
        )}

        {/* Accept Invite Button (If there's a pending invite) */}
        {pendingInvite && !isContributor && !isOwner && (
          <View style={styles.inviteActionsContainer}>
            <TouchableOpacity
              style={[styles.acceptInviteButton, acceptingInvite && styles.acceptInviteButtonDisabled]}
              onPress={handleAcceptInvite}
              disabled={acceptingInvite}
            >
              {acceptingInvite ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.buttonText} />
                  <Text style={styles.acceptInviteButtonText}>Accept Invite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Invite Contributors Button (Owner Only) */}
        {isOwner && (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('InviteToRoll', { 
              rollId: roll.id, 
              rollName: roll.title 
            })}
          >
            <Ionicons name="person-add" size={20} color={colors.buttonPrimary} />
            <Text style={styles.inviteButtonText}>Invite Contributors</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.galleryHeader}>
        <Text style={styles.galleryTitle}>Photos</Text>
        {isLocked && !roll?.is_public ? (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            <Text style={styles.lockBadgeText}>
              {images.length} {images.length === 1 ? 'photo' : 'photos'} locked until release
            </Text>
          </View>
        ) : (
          <Text style={styles.photoCountText}>{images.length} {images.length === 1 ? 'photo' : 'photos'}</Text>
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
            // Aggressive memory optimization for large images
            removeClippedSubviews={true}
            maxToRenderPerBatch={3} // Only render 3 at a time
            updateCellsBatchingPeriod={200}
            initialNumToRender={6} // Start with 6
            windowSize={2} // Very small window
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
  titleImageContainer: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    position: 'relative',
  },
  titleImage: {
    width: '100%',
    height: '100%',
  },
  editTitleImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.primary + 'CC',
    padding: 10,
    borderRadius: 20,
  },
  addTitleImageButton: {
    width: '100%',
    height: 150,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addTitleImageText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  publicToggleContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  publicToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    fontWeight: '500',
  },
  publicToggleHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
  },
  inviteButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  inviteActionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  acceptInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  acceptInviteButtonDisabled: {
    opacity: 0.6,
  },
  acceptInviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonText,
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
  photoCountText: {
    fontSize: 14,
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
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  lockedImage: {
    opacity: 0.5,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderStyle: 'dashed',
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

