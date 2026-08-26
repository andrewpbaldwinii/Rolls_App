import { supabase } from '../lib/supabase';
import ImageResizer from 'react-native-image-resizer';

// URL Cache to avoid regenerating signed URLs unnecessarily
// Format: { cacheKey: { url: string, expiresAt: number } }
const urlCache = new Map();
const CACHE_BUFFER_TIME = 5 * 60 * 1000; // 5 minutes before expiry to regenerate
const MAX_CACHE_SIZE = 500; // Limit cache size to prevent memory issues

/**
 * Extract expiry timestamp from a signed URL
 * Supabase signed URLs have format: ...?token=...&expiresAt=1234567890
 */
const getExpiryFromSignedUrl = (signedUrl) => {
  try {
    const url = new URL(signedUrl);
    const expiresAt = url.searchParams.get('expiresAt');
    return expiresAt ? parseInt(expiresAt, 10) * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
};

/**
 * Check if a signed URL is still valid (not expired or about to expire)
 */
const isSignedUrlValid = (signedUrl) => {
  if (!signedUrl || !signedUrl.includes('/storage/v1/object/sign/')) {
    return false;
  }
  
  const expiresAt = getExpiryFromSignedUrl(signedUrl);
  if (!expiresAt) {
    return false; // Can't determine expiry, assume invalid
  }
  
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  
  // Valid if not expired and has more than 5 minutes left
  return timeUntilExpiry > CACHE_BUFFER_TIME;
};

/**
 * Get cache key from image URL and bucket type
 */
const getCacheKey = (imageUrl, bucketType) => {
  // Extract path from URL for consistent caching
  let path = null;
  
  if (imageUrl.includes('roll-images/')) {
    if (imageUrl.includes('/storage/v1/object/public/roll-images/')) {
      path = imageUrl.split('/storage/v1/object/public/roll-images/')[1]?.split('?')[0];
    } else if (imageUrl.includes('/storage/v1/object/sign/roll-images/')) {
      const match = imageUrl.match(/\/storage\/v1\/object\/sign\/roll-images\/(.+?)(\?|$)/);
      path = match ? decodeURIComponent(match[1]) : null;
    } else if (imageUrl.includes('roll-images/')) {
      path = imageUrl.split('roll-images/')[1]?.split('?')[0];
    }
  } else if (imageUrl.includes('roll-title-images/')) {
    if (imageUrl.includes('/storage/v1/object/public/roll-title-images/')) {
      path = imageUrl.split('/storage/v1/object/public/roll-title-images/')[1]?.split('?')[0];
    } else if (imageUrl.includes('roll-title-images/')) {
      path = imageUrl.split('roll-title-images/')[1]?.split('?')[0];
    }
  }
  
  return path ? `${bucketType || 'roll'}:${path}` : `${bucketType || 'roll'}:${imageUrl}`;
};

/**
 * Clean up old cache entries to prevent memory issues
 */
const cleanupCache = () => {
  if (urlCache.size <= MAX_CACHE_SIZE) return;
  
  const now = Date.now();
  const entriesToDelete = [];
  
  // Remove expired entries first
  for (const [key, value] of urlCache.entries()) {
    if (value.expiresAt && value.expiresAt < now) {
      entriesToDelete.push(key);
    }
  }
  
  entriesToDelete.forEach(key => urlCache.delete(key));
  
  // If still too large, remove oldest entries
  if (urlCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(urlCache.entries())
      .sort((a, b) => (a[1].expiresAt || 0) - (b[1].expiresAt || 0));
    
    const toRemove = sortedEntries.slice(0, urlCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => urlCache.delete(key));
  }
};

/**
 * Upload an image to Supabase Storage for a Roll
 * @param {string} rollId - The Roll ID
 * @param {string} imagePath - Local file path (from react-native-vision-camera or image picker)
 * @param {string} base64Data - Optional base64 data (preferred for Android content:// URIs)
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export const uploadRollImage = async (rollId, imagePath, base64Data = null) => {
  try {
    // Validate rollId
    if (!rollId) {
      throw new Error('Roll ID is required to upload an image');
    }

    // Validate rollId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rollId)) {
      console.warn('⚠️ Roll ID does not match UUID format:', rollId);
      // Still proceed, but log a warning
    }

    console.log('📤 Starting roll image upload...', { 
      rollId, 
      rollIdType: typeof rollId,
      rollIdLength: rollId?.length,
      imagePath: imagePath?.substring(0, 50) + '...', 
      hasBase64: !!base64Data 
    });
    
    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `photo_${timestamp}.jpg`;
    const storagePath = `${rollId}/${fileName}`;

    console.log('📁 Upload path:', storagePath);
    console.log('📁 Path segments:', storagePath.split('/'));
    console.log('📁 Expected format: {rollId}/filename.jpg');

    let uint8Array;
    let imageToProcess = imagePath;

    // Resize/compress image before upload to reduce memory usage and file size
    try {
      console.log('🔄 Resizing image to reduce memory usage...');
      // Remove file:// prefix if present for ImageResizer
      let cleanPath = imagePath;
      if (cleanPath.startsWith('file://')) {
        cleanPath = cleanPath.replace('file://', '');
      }
      
      // Resize image to max 1200px (maintains quality while reducing size)
      const resizedImage = await ImageResizer.createResizedImage(
        cleanPath,
        1200, // maxWidth
        1200, // maxHeight
        'JPEG',
        80,   // quality (80% - good balance)
        0,    // rotation
        undefined, // outputPath (use temp)
        false, // keepMeta
        { mode: 'contain', onlyScaleDown: true }
      );
      
      imageToProcess = resizedImage.uri;
      console.log('✅ Image resized:', {
        original: imagePath,
        resized: resizedImage.uri,
        width: resizedImage.width,
        height: resizedImage.height,
        size: resizedImage.size
      });
    } catch (resizeError) {
      console.warn('⚠️ Image resize failed, using original:', resizeError);
      // Continue with original image if resize fails
    }

    // If base64 data is provided, use it directly (avoids content:// URI security issues)
    if (base64Data && base64Data.length > 0) {
      console.log('✅ Using base64 data for upload, base64 length:', base64Data.length);
      try {
        // Convert base64 to Uint8Array
        // Remove data URL prefix if present (data:image/jpeg;base64,...)
        let base64String = base64Data;
        if (base64Data.includes(',')) {
          base64String = base64Data.split(',')[1];
        }
        
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        uint8Array = bytes;
        console.log('✅ Image converted from base64, size:', uint8Array.length, 'bytes');
      } catch (base64Error) {
        console.error('❌ Error converting base64:', base64Error);
        throw new Error('Failed to process image data. Please try selecting the image again.');
      }
    } else {
      console.log('📖 Reading resized image file...');
      // Handle file path - remove file:// prefix if present, or add it if missing
      let fileUri = imageToProcess;
      if (!imageToProcess.startsWith('file://') && !imageToProcess.startsWith('content://')) {
        fileUri = `file://${imageToProcess}`;
      } else if (imageToProcess.startsWith('file://')) {
        fileUri = imageToProcess;
      }

      console.log('Reading file from:', fileUri);

      // React Native compatible file reading
      // Use fetch to get the file, then convert to Uint8Array
      const response = await fetch(fileUri);
      
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
      }

      // In React Native, we can use response.arrayBuffer() directly
      // This is more reliable than blob.arrayBuffer()
      console.log('Converting response to ArrayBuffer...');
      const arrayBuffer = await response.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('✅ File converted successfully, size:', uint8Array.length, 'bytes');
    }

    console.log('📤 Uploading to Supabase Storage...', { 
      bucket: 'roll-images',
      path: storagePath,
      size: uint8Array.length, 
      unit: 'bytes',
      rollId: rollId,
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('roll-images')
      .upload(storagePath, uint8Array, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('❌ Storage upload error:', error);
      console.error('Error code:', error.error || error.statusCode);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      console.error('Upload attempted:', {
        bucket: 'roll-images',
        path: storagePath,
        rollId: rollId,
        pathFormat: 'Should be: {rollId}/filename.jpg (NOT profiles/{userId}/...)',
      });
      
      // Extract error message more reliably
      let errorMsg = 'Unknown error';
      const errorCode = error.error || error.statusCode || '';
      
      if (error.message) {
        errorMsg = error.message;
      } else if (error.error) {
        errorMsg = String(error.error);
      } else if (error.statusCode) {
        errorMsg = `Upload failed with status ${error.statusCode}`;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }

      // Provide helpful error messages
      if (errorMsg?.includes('security') || errorMsg?.includes('policy') || errorCode === '403') {
        throw new Error(
          `Storage permission error. The upload path "${storagePath}" was rejected.\n\n` +
          `Make sure:\n` +
          `1. The roll ID is correct: ${rollId}\n` +
          `2. You have permission to upload to this roll\n` +
          `3. The storage policy allows uploads to roll paths\n\n` +
          `Error: ${errorMsg}${errorCode ? ` (Code: ${errorCode})` : ''}`
        );
      }
      
      throw new Error(`Upload failed: ${errorMsg}${errorCode ? ` (Code: ${errorCode})` : ''}`);
    }

    console.log('Upload successful, path:', data.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('roll-images')
      .getPublicUrl(data.path);

    console.log('Public URL:', urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Upload a title image for a Roll
 * @param {string} rollId - The Roll ID
 * @param {string} imagePath - Local file path (from image picker)
 * @param {string} base64Data - Optional base64 data (preferred for Android content:// URIs)
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export const uploadRollTitleImage = async (rollId, imagePath, base64Data = null) => {
  try {
    // Validate rollId
    if (!rollId) {
      throw new Error('Roll ID is required to upload a title image');
    }

    // Create a unique filename
    // Using simpler path format: {rollId}/{filename}.jpg (no /title/ subdirectory)
    const timestamp = Date.now();
    const fileName = `title_${timestamp}.jpg`;
    const storagePath = `${rollId}/${fileName}`;

    let uint8Array;
    let imageToProcess = imagePath;

    // Resize/compress title image before upload to reduce memory usage
    try {
      console.log('🔄 Resizing title image to reduce memory usage...');
      // Remove file:// prefix if present for ImageResizer
      let cleanPath = imagePath;
      if (cleanPath.startsWith('file://')) {
        cleanPath = cleanPath.replace('file://', '');
      }
      
      // Resize title image to max 1200px (maintains quality while reducing size)
      const resizedImage = await ImageResizer.createResizedImage(
        cleanPath,
        1200, // maxWidth
        1200, // maxHeight
        'JPEG',
        80,   // quality (80% - good balance)
        0,    // rotation
        undefined, // outputPath (use temp)
        false, // keepMeta
        { mode: 'contain', onlyScaleDown: true }
      );
      
      imageToProcess = resizedImage.uri;
      console.log('✅ Title image resized:', {
        original: imagePath,
        resized: resizedImage.uri,
        width: resizedImage.width,
        height: resizedImage.height,
        size: resizedImage.size
      });
    } catch (resizeError) {
      console.warn('⚠️ Title image resize failed, using original:', resizeError);
      // Continue with original image if resize fails
    }

    // If base64 data is provided, use it directly
    if (base64Data && base64Data.length > 0) {
      console.log('✅ Using base64 data for title image upload');
      try {
        let base64String = base64Data;
        if (base64Data.includes(',')) {
          base64String = base64Data.split(',')[1];
        }
        
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        uint8Array = bytes;
      } catch (base64Error) {
        console.error('❌ Error converting base64:', base64Error);
        throw new Error('Failed to process image data. Please try selecting the image again.');
      }
    } else {
      // Fallback to reading from file URI (use resized image if available)
      let fileUri = imageToProcess;
      if (!imageToProcess.startsWith('file://') && !imageToProcess.startsWith('content://')) {
        fileUri = `file://${imageToProcess}`;
      }

      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
    }

    // Upload to Supabase Storage - using separate roll-title-images bucket
    console.log('📤 Uploading title image to bucket: roll-title-images, path:', storagePath);
    const { data, error } = await supabase.storage
      .from('roll-title-images')
      .upload(storagePath, uint8Array, {
        contentType: 'image/jpeg',
        upsert: true, // Allow overwriting existing title images
      });

    if (error) {
      console.error('❌ Title image upload error:', error);
      console.error('Error details:', {
        bucket: 'roll-title-images',
        path: storagePath,
        rollId: rollId,
        errorCode: error.error || error.statusCode,
        errorMessage: error.message,
      });
      
      // Provide helpful error message
      if (error.message?.includes('Bucket not found') || error.error === 'Bucket not found') {
        throw new Error(
          'Title images bucket not found. Please create the "roll-title-images" bucket in Supabase Storage.\n\n' +
          'See docs/database/sql/CREATE_ROLL_TITLE_IMAGES_BUCKET.sql for setup instructions.'
        );
      }
      
      throw new Error(`Failed to upload title image: ${error.message}`);
    }

    console.log('✅ Title image uploaded successfully. Upload response path:', data.path);
    console.log('📁 Storage path used:', storagePath);
    console.log('📁 Data.path returned:', data.path);

    // Get public URL - use the path returned from upload (should match storagePath)
    const { data: urlData } = supabase.storage
      .from('roll-title-images')
      .getPublicUrl(data.path);

    console.log('🔗 Generated public URL:', urlData.publicUrl);
    console.log('🔗 URL path component:', urlData.publicUrl.split('/storage/v1/object/public/roll-title-images/')[1]);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading title image:', error);
    throw error;
  }
};

/**
 * NOTE: Title images are NOT stored in roll_images table.
 * 
 * Title images are:
 * - Public and always visible (not locked by release date)
 * - Stored only in rolls.title_image_url
 * - Separate from roll images (photos taken from CameraScreen)
 * 
 * Roll images are:
 * - Locked until release_date is met
 * - Only actual photos taken/uploaded from CameraScreen
 * - Stored in roll_images table
 * 
 * This function is kept for backwards compatibility but does nothing.
 * Title images should only exist in rolls.title_image_url.
 * 
 * @param {string} rollId
 * @param {string} imageUrl
 * @param {string} contributorId
 */
export const upsertTitleImageAsRollImage = async (rollId, imageUrl, contributorId) => {
  // Title images are NOT stored in roll_images - they're separate and always public
  // This function is a no-op for backwards compatibility
  console.log('Title image stored in rolls.title_image_url only (not in roll_images)');
  return;
};

/**
 * Get a valid URL for a roll image (synchronous version)
 * Handles public URLs that are already valid
 * @param {string} imageUrl - Existing image URL
 * @returns {string} Valid URL or original if already valid
 */
export const getRollImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If it's already a valid URL (public or signed), return it
  if (imageUrl.includes('/storage/v1/object/')) {
    return imageUrl;
  }
  
  // If it's a full URL, return it
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Otherwise return as-is (will need async processing)
  return imageUrl;
};

/**
 * Get a valid URL for a roll image (async version)
 * - Title images (roll-title-images bucket, public): Use public URLs
 * - Roll images (roll-images bucket, private): Generate signed URLs
 * @param {string} imageUrl - Existing image URL or storage path
 * @param {string} bucketType - Optional: 'title' for title images, 'roll' for roll images
 * @returns {Promise<string>} Valid URL (public or signed)
 */
export const getRollImageUrlAsync = async (imageUrl, bucketType = null) => {
  if (!imageUrl) return null;
  
  // Determine bucket type if not explicitly provided
  const isTitleImage = bucketType === 'title' || 
                       imageUrl.includes('roll-title-images') || 
                       imageUrl.includes('/title/');
  
  // Title images (roll-title-images bucket - always public)
  if (isTitleImage) {
    // OPTIMIZED: Title images are public, so if already a valid URL, return immediately
    if (imageUrl.includes('/storage/v1/object/public/roll-title-images/')) {
      return imageUrl; // Already a valid public URL - no processing needed
    }
    
    // If it's already a full HTTPS URL, return it (likely already processed)
    if (imageUrl.startsWith('https://') && imageUrl.includes('roll-title-images')) {
      return imageUrl;
    }
    
    // Extract path and generate public URL
    let path = null;
    let bucket = 'roll-title-images';
    
    if (imageUrl.includes('/storage/v1/object/public/roll-title-images/')) {
      path = imageUrl.split('/storage/v1/object/public/roll-title-images/')[1]?.split('?')[0];
    } else if (imageUrl.includes('roll-title-images/')) {
      path = imageUrl.split('roll-title-images/')[1]?.split('?')[0];
    } else if (imageUrl.includes('/title/')) {
      // Old format - in roll-images bucket with /title/ path
      // These are in the private roll-images bucket, so we need signed URLs
      const match = imageUrl.match(/roll-images\/([^/]+)\/title\/(.+?)(\?|$)/);
      if (match) {
        const rollId = match[1];
        const filename = match[2];
        // Full path in old format: {rollId}/title/{filename}
        const oldPath = `${rollId}/title/${filename}`;
        // Old format detected - silently handle it (code is working correctly)
        // Only log in debug mode to reduce console noise
        if (__DEV__ && false) { // Disabled by default - enable for debugging
          console.debug('🔄 Old title image format detected in roll-images bucket:', {
            oldPath: imageUrl.substring(0, 100),
            path: oldPath
          });
        }
        
        // Try to generate signed URL from roll-images bucket (private)
        try {
          const cleanPath = oldPath.replace(/^\/+|\/+$/g, '');
          const { data, error } = await supabase.storage
            .from('roll-images')
            .createSignedUrl(cleanPath, 3600);
          
          if (!error && data?.signedUrl) {
            // Successfully handled old format - no need to log
            return data.signedUrl;
          }
        } catch (err) {
          console.warn('⚠️ Failed to generate signed URL for old title image:', err);
        }
        
        // Fallback: Try to migrate to roll-title-images bucket format
        // New format: {rollId}/{filename} (no /title/ subdirectory)
        path = `${rollId}/${filename}`;
        bucket = 'roll-title-images';
        // Only log in debug mode
        if (__DEV__ && false) {
          console.debug('🔄 Attempting to use new bucket format:', { bucket, path });
        }
      } else {
        // Try to extract from public URL format
        const publicMatch = imageUrl.match(/\/storage\/v1\/object\/public\/roll-images\/([^/]+)\/title\/(.+?)(\?|$)/);
        if (publicMatch) {
          const rollId = publicMatch[1];
          const filename = publicMatch[2];
          // Try signed URL first (since roll-images is private)
          const oldPath = `${rollId}/title/${filename}`;
          try {
            const { data, error } = await supabase.storage
              .from('roll-images')
              .createSignedUrl(oldPath.replace(/^\/+|\/+$/g, ''), 3600);
            
            if (!error && data?.signedUrl) {
              // Successfully handled old format - no need to log
              return data.signedUrl;
            }
          } catch (err) {
            console.warn('⚠️ Failed to generate signed URL:', err);
          }
          
          // Fallback to new bucket format
          path = `${rollId}/${filename}`;
          bucket = 'roll-title-images';
        }
      }
    }
    
    if (path) {
      path = path.replace(/^\/+|\/+$/g, '');
      console.log('🔗 Generating public URL for title image:', { bucket, path });
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      if (data?.publicUrl) {
        console.log('✅ Title image URL generated:', data.publicUrl.substring(0, 100));
        return data.publicUrl;
      } else {
        console.warn('⚠️ Failed to generate public URL for title image');
      }
    }
  }
  
  // Roll images (roll-images bucket - private, needs signed URLs)
  // Only process if bucketType is 'roll' or not explicitly 'title'
  if (bucketType === 'roll' || (!bucketType && !isTitleImage)) {
    // Check cache first
    const cacheKey = getCacheKey(imageUrl, bucketType || 'roll');
    const cached = urlCache.get(cacheKey);
    
    // If we have a cached signed URL that's still valid, use it
    if (cached && cached.url && isSignedUrlValid(cached.url)) {
      return cached.url;
    }
    
    // If it's already a signed URL, check if it's still valid
    if (imageUrl.includes('/storage/v1/object/sign/roll-images/')) {
      if (isSignedUrlValid(imageUrl)) {
        // Cache it for future use
        const expiresAt = getExpiryFromSignedUrl(imageUrl);
        urlCache.set(cacheKey, { url: imageUrl, expiresAt });
        cleanupCache();
        return imageUrl;
      }
      
      // Extract path and regenerate
      const signMatch = imageUrl.match(/\/storage\/v1\/object\/sign\/roll-images\/(.+?)(\?|$)/);
      if (signMatch) {
        const path = decodeURIComponent(signMatch[1]);
        const { data, error } = await supabase.storage
          .from('roll-images')
          .createSignedUrl(path, 3600);
        
        if (!error && data?.signedUrl) {
          const expiresAt = getExpiryFromSignedUrl(data.signedUrl);
          urlCache.set(cacheKey, { url: data.signedUrl, expiresAt });
          cleanupCache();
          return data.signedUrl;
        }
      }
    }
    
    // If it's a public URL for roll-images, we need to convert it to signed URL
    // (because roll-images bucket is private)
    if (imageUrl.includes('/storage/v1/object/public/roll-images/')) {
      // Extract path and generate signed URL instead
      const path = imageUrl.split('/storage/v1/object/public/roll-images/')[1]?.split('?')[0];
      if (path) {
        const cleanPath = path.replace(/^\/+|\/+$/g, '');
        const { data, error } = await supabase.storage
          .from('roll-images')
          .createSignedUrl(cleanPath, 3600);
        
        if (!error && data?.signedUrl) {
          const expiresAt = getExpiryFromSignedUrl(data.signedUrl);
          urlCache.set(cacheKey, { url: data.signedUrl, expiresAt });
          cleanupCache();
          return data.signedUrl;
        }
      }
    }
    
    // Fallback: Try to extract path from URL if we haven't handled it yet
    let path = null;
    
    // Check if it's a roll image (roll-images bucket - private, needs signed URL)
    if (imageUrl.includes('roll-images/') && !imageUrl.includes('/title/')) {
      if (imageUrl.includes('/storage/v1/object/public/roll-images/')) {
        path = imageUrl.split('/storage/v1/object/public/roll-images/')[1]?.split('?')[0];
      } else if (imageUrl.includes('roll-images/')) {
        path = imageUrl.split('roll-images/')[1]?.split('?')[0];
      }
      
      if (path) {
        path = path.replace(/^\/+|\/+$/g, '');
        
        try {
          const { data, error } = await supabase.storage
            .from('roll-images')
            .createSignedUrl(path, 3600); // 1 hour expiry
          
          if (!error && data?.signedUrl) {
            const expiresAt = getExpiryFromSignedUrl(data.signedUrl);
            urlCache.set(cacheKey, { url: data.signedUrl, expiresAt });
            cleanupCache();
            return data.signedUrl;
          }
          
          console.error('❌ Signed URL generation failed for roll image:', {
            error: error?.message || error,
            errorCode: error?.statusCode,
            path
          });
        } catch (err) {
          console.error('❌ Error generating signed URL for roll image:', err);
        }
      }
    }
  }
  
  // If we couldn't parse it, return original
  console.warn('⚠️ Could not extract path/bucket from image URL:', imageUrl);
  return imageUrl;
};

/**
 * Delete an image from Supabase Storage
 * Handles both roll images and title images
 * @param {string} imageUrl - Full URL or path to the image
 */
export const deleteRollImage = async (imageUrl) => {
  try {
    // Check if it's a title image (roll-title-images bucket)
    if (imageUrl.includes('roll-title-images')) {
      const path = imageUrl.split('/storage/v1/object/public/roll-title-images/')[1] ||
                   imageUrl.split('/storage/v1/object/sign/roll-title-images/')[1];
      
      if (!path) {
        throw new Error('Invalid title image URL');
      }

      const { error } = await supabase.storage
        .from('roll-title-images')
        .remove([path]);

      if (error) throw error;
      return;
    }
    
    // Default to roll-images bucket for roll images
    const path = imageUrl.split('/storage/v1/object/public/roll-images/')[1] ||
                 imageUrl.split('/storage/v1/object/sign/roll-images/')[1];
    
    if (!path) {
      throw new Error('Invalid image URL');
    }

    const { error } = await supabase.storage
      .from('roll-images')
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Batch process multiple image URLs efficiently
 * @param {Array<{url: string, bucketType?: string}>} imageUrls - Array of image URL objects
 * @returns {Promise<Array<string>>} Array of processed URLs
 */
export const getRollImageUrlsBatch = async (imageUrls) => {
  const results = await Promise.all(
    imageUrls.map(({ url, bucketType }) => getRollImageUrlAsync(url, bucketType))
  );
  return results;
};
