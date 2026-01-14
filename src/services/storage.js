import { supabase } from '../lib/supabase';

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
      console.log('⚠️ No base64 data provided, will try to read from URI');
      // Handle file path - remove file:// prefix if present, or add it if missing
      let fileUri = imagePath;
      if (!imagePath.startsWith('file://') && !imagePath.startsWith('content://')) {
        fileUri = `file://${imagePath}`;
      } else if (imagePath.startsWith('file://')) {
        fileUri = imagePath;
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
      
      console.log('File converted successfully, size:', uint8Array.length, 'bytes');
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
    const timestamp = Date.now();
    const fileName = `title_${timestamp}.jpg`;
    const storagePath = `${rollId}/title/${fileName}`;

    let uint8Array;

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
      // Fallback to reading from file URI
      let fileUri = imagePath;
      if (!imagePath.startsWith('file://') && !imagePath.startsWith('content://')) {
        fileUri = `file://${imagePath}`;
      }

      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
    }

    // Upload to Supabase Storage
    console.log('📤 Uploading title image to path:', storagePath);
    const { data, error } = await supabase.storage
      .from('roll-images')
      .upload(storagePath, uint8Array, {
        contentType: 'image/jpeg',
        upsert: true, // Allow overwriting existing title images
      });

    if (error) {
      console.error('❌ Title image upload error:', error);
      throw new Error(`Failed to upload title image: ${error.message}`);
    }

    console.log('✅ Title image uploaded successfully. Upload response path:', data.path);
    console.log('📁 Storage path used:', storagePath);
    console.log('📁 Data.path returned:', data.path);

    // Get public URL - use the path returned from upload (should match storagePath)
    const { data: urlData } = supabase.storage
      .from('roll-images')
      .getPublicUrl(data.path);

    console.log('🔗 Generated public URL:', urlData.publicUrl);
    console.log('🔗 URL path component:', urlData.publicUrl.split('/storage/v1/object/public/roll-images/')[1]);

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
 * Delete an image from Supabase Storage
 * @param {string} imageUrl - Full URL or path to the image
 */
export const deleteRollImage = async (imageUrl) => {
  try {
    // Extract path from URL
    const path = imageUrl.split('/storage/v1/object/public/roll-images/')[1];
    
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

