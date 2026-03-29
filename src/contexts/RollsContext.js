import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const RollsContext = createContext({});

/**
 * Calculate roll status based on dates
 * @param {Object} roll - Roll object with submission_deadline and release_date
 * @returns {string} - 'active', 'developing', or 'developed'
 */
export const calculateRollStatus = (roll) => {
  const now = new Date();
  const submissionDeadline = roll.submission_deadline ? new Date(roll.submission_deadline) : null;
  const releaseDate = roll.release_date ? new Date(roll.release_date) : null;

  // If no submission deadline, default to active
  if (!submissionDeadline) {
    return 'active';
  }

  // Active: Users can contribute because deadline hasn't been reached
  if (now < submissionDeadline) {
    return 'active';
  }

  // If no release date, stay in developing status
  if (!releaseDate) {
    return 'developing';
  }

  // Developing: Deadline is over but development date hasn't been met yet
  if (now < releaseDate) {
    return 'developing';
  }

  // Developed: Development date has been met and images are viewable
  return 'developed';
};

export const RollsProvider = ({ children }) => {
  const { user } = useAuth();
  const [rolls, setRolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all Rolls the user has access to
  const fetchRolls = useCallback(async () => {
    if (!user) {
      setRolls([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch rolls where user is creator/owner
      // Exclude "Profile Photos" rolls - these are system rolls that shouldn't appear
      const { data: ownedRollsData, error: ownedError } = await supabase
        .from('rolls')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Filter out "Profile Photos" rolls (case-insensitive)
      const ownedRolls = (ownedRollsData || []).filter(
        roll => roll.title?.toLowerCase() !== 'profile photos'
      );

      // Fetch rolls where user is contributor (only if roll_contributors table exists)
      let contributedRolls = [];
      try {
        console.log('🔍 Fetching contributor rolls for user:', user.id);
        
        // First, check if user has any contributor records at all
        const { data: contributorCheck, error: checkError } = await supabase
          .from('roll_contributors')
          .select('roll_id')
          .eq('user_id', user.id);
        
        if (checkError) {
          console.error('❌ Error checking contributors:', checkError);
        } else {
          console.log('📊 Contributor check result:', contributorCheck?.length || 0, 'contributor records found');
          if (contributorCheck && contributorCheck.length > 0) {
            contributorCheck.forEach(item => {
              console.log('  - Roll ID user is contributor to:', item.roll_id);
            });
          }
        }
        
        // Now fetch the full roll data with join
        const { data: contributorData, error: contribError } = await supabase
          .from('roll_contributors')
          .select(`
            roll_id,
            rolls (*)
          `)
          .eq('user_id', user.id);

        if (contribError) {
          // If table doesn't exist, just log and continue with owned rolls only
          if (contribError.code === 'PGRST116' || contribError.message?.includes('does not exist') || contribError.message?.includes('schema cache')) {
            console.warn('⚠️ roll_contributors table does not exist yet. Skipping contributor rolls.');
          } else {
            // For other errors, log but don't throw - continue with owned rolls only
            console.error('❌ Error fetching contributor rolls:', contribError);
            console.error('Error code:', contribError.code);
            console.error('Error message:', contribError.message);
            console.error('Error details:', JSON.stringify(contribError, null, 2));
          }
        } else if (contributorData) {
          console.log('✅ Found contributor data:', contributorData.length, 'contributor records');
          console.log('📋 Raw contributor data:', JSON.stringify(contributorData, null, 2));
          
          // Extract roll objects from contributorData
          // Filter out "Profile Photos" rolls (case-insensitive)
          contributedRolls = contributorData
            .map(item => item.rolls)
            .filter(Boolean)
            .filter(roll => roll && roll.title && roll.title.toLowerCase() !== 'profile photos');
          
          console.log('📦 Extracted contributed rolls:', contributedRolls.length, 'rolls');
          if (contributedRolls.length > 0) {
            contributedRolls.forEach(roll => {
              console.log('  ✅', roll.title, '(ID:', roll.id, ', Creator:', roll.creator_id, ')');
            });
          } else if (contributorData.length > 0) {
            console.warn('⚠️ Contributor data found but no rolls extracted. Data:', contributorData);
          }
        } else {
          console.log('ℹ️ No contributor data found (user may not be a contributor to any rolls)');
        }
      } catch (contribErr) {
        // If table doesn't exist, just log and continue with owned rolls only
        if (contribErr.code === 'PGRST116' || contribErr.message?.includes('does not exist') || contribErr.message?.includes('schema cache')) {
          console.warn('⚠️ roll_contributors table does not exist yet. Skipping contributor rolls.');
        } else {
          // For other errors, log but don't throw - continue with owned rolls only
          console.error('❌ Error fetching contributor rolls (exception):', contribErr);
        }
      }

      // Merge and deduplicate
      // Note: ownedRolls and contributedRolls are already filtered to exclude "Profile Photos"
      const allRolls = [...(ownedRolls || []), ...contributedRolls];
      const uniqueRolls = Array.from(
        new Map(allRolls.map(roll => [roll.id, roll])).values()
      );

      // Final safety check: filter out any "Profile Photos" rolls that might have slipped through
      const filteredRolls = uniqueRolls.filter(
        roll => roll.title?.toLowerCase() !== 'profile photos'
      );

      // Calculate and update status for all rolls based on dates
      const rollsWithUpdatedStatus = filteredRolls.map(roll => {
        const calculatedStatus = calculateRollStatus(roll);
        
        // If status differs from stored status, update it in the database
        // Do this asynchronously to avoid blocking the UI
        if (roll.status !== calculatedStatus) {
          // Update status in database (fire and forget)
          supabase
            .from('rolls')
            .update({ status: calculatedStatus })
            .eq('id', roll.id)
            .then(({ error }) => {
              if (error) {
                // If it's a constraint violation, it means the database needs the UPDATE_ROLL_STATUS_CONSTRAINT.sql script
                if (error.code === '23514' && error.message?.includes('rolls_status_check')) {
                  console.warn(
                    `Database constraint doesn't allow status '${calculatedStatus}'. ` +
                    `Run UPDATE_ROLL_STATUS_CONSTRAINT.sql in Supabase to enable 'developing' and 'developed' statuses.`
                  );
                } else {
                  console.warn(`Failed to update status for roll ${roll.id}:`, error);
                }
              }
            });
          
          // Return roll with updated status (even if DB update fails, show correct status in UI)
          return { ...roll, status: calculatedStatus };
        }
        
        return roll;
      });

      setRolls(rollsWithUpdatedStatus);
    } catch (err) {
      console.error('Error fetching rolls:', err);
      // Provide more detailed error information
      const errorMessage = err.message || 'Failed to fetch rolls';
      setError(errorMessage);
      
      // Log detailed error for debugging
      if (err.code === 'PGRST116' || err.message?.includes('does not exist')) {
        console.error('Tables may not exist. Please create the database tables first.');
        console.error('See DATABASE_SCHEMA.md for SQL scripts to run in Supabase.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create a new Roll
  const createRoll = useCallback(async (rollData) => {
    if (!user) {
      throw new Error('User must be authenticated to create a roll');
    }

    try {
      // Calculate initial status based on dates (will default to 'active' if dates are in future)
      const calculatedStatus = rollData.submission_deadline 
        ? calculateRollStatus({ 
            submission_deadline: rollData.submission_deadline, 
            release_date: rollData.release_date 
          })
        : 'active';

      const insertPayload = {
        title: rollData.name, // Using rollData.name for consistency with UI, maps to 'title' in DB
        description: rollData.description || null,
        submission_deadline: rollData.submission_deadline || null,
        release_date: rollData.release_date || null, // Can be null - photos visible immediately if not set
        creator_id: user.id,
        status: calculatedStatus, // Use calculated status instead of default
        is_public: rollData.is_public || false,
        title_image_url: rollData.title_image_url || null,
        contributor_photo_limit:
          rollData.contributor_photo_limit != null ? rollData.contributor_photo_limit : null,
      };

      let roll;
      let createError;

      // Attempt insert with newest schema fields
      ({ data: roll, error: createError } = await supabase
        .from('rolls')
        .insert([insertPayload])
        .select()
        .single());

      // If schema cache/column missing, retry without new columns so the app still works
      if (
        createError &&
        (createError.message?.includes('is_public') ||
          createError.message?.includes('title_image_url') ||
          createError.message?.includes('contributor_photo_limit') ||
          createError.message?.toLowerCase()?.includes('schema cache'))
      ) {
        console.warn(
          'Rolls table is missing optional columns. Retrying without them. Run ROLLS_PUBLIC_AND_TITLE_IMAGE_MIGRATION.sql / ADD_CONTRIBUTOR_PHOTO_LIMIT.sql in Supabase.'
        );
        const { is_public, title_image_url, contributor_photo_limit, ...fallbackPayload } =
          insertPayload;
        ({ data: roll, error: createError } = await supabase
          .from('rolls')
          .insert([fallbackPayload])
          .select()
          .single());
      }

      // Handle release_date NOT NULL constraint error
      if (
        createError &&
        (createError.code === '23502' && createError.message?.includes('release_date'))
      ) {
        console.warn(
          'Rolls table has release_date as NOT NULL. The database schema needs to be updated to allow null values.'
        );
        throw new Error(
          'Database configuration error: release_date cannot be null. Please run this SQL in Supabase:\n\n' +
          'ALTER TABLE rolls ALTER COLUMN release_date DROP NOT NULL;\n\n' +
          'Or run COMPLETE_DATABASE_SETUP.sql which includes this fix.'
        );
      }

      if (createError) throw createError;

      // Add owner as contributor
      const { error: contributorError } = await supabase
        .from('roll_contributors')
        .insert([
          {
            roll_id: roll.id,
            user_id: user.id,
            role: 'owner',
          },
        ]);

      if (contributorError) throw contributorError;

      // Refresh rolls list
      await fetchRolls();

      return roll;
    } catch (err) {
      console.error('Error creating roll:', err);
      throw err;
    }
  }, [user, fetchRolls]);

  // Update a Roll
  const updateRoll = useCallback(async (rollId, updates) => {
    if (!user) {
      throw new Error('User must be authenticated to update a roll');
    }

    try {
      // If dates are being updated, recalculate status
      if (updates.submission_deadline || updates.release_date) {
        // First fetch current roll to get existing dates if not all dates are being updated
        const { data: currentRoll } = await supabase
          .from('rolls')
          .select('submission_deadline, release_date')
          .eq('id', rollId)
          .single();
        
        const submissionDeadline = updates.submission_deadline || currentRoll?.submission_deadline;
        const releaseDate = updates.release_date !== undefined ? updates.release_date : currentRoll?.release_date;
        
        // Calculate new status based on updated dates
        const calculatedStatus = calculateRollStatus({
          submission_deadline: submissionDeadline,
          release_date: releaseDate,
        });
        
        // Add calculated status to updates
        updates.status = calculatedStatus;
      }

      const { data, error: updateError } = await supabase
        .from('rolls')
        .update(updates)
        .eq('id', rollId)
        .eq('creator_id', user.id) // Only creator can update
        .select()
        .single();

      if (updateError) {
        // PostgREST schema cache / missing column errors
        if (
          updateError.code === 'PGRST204' &&
          (updateError.message?.includes('title_image_url') ||
            updateError.message?.includes('is_public') ||
            updateError.message?.includes('contributor_photo_limit') ||
            updateError.message?.toLowerCase()?.includes('schema cache'))
        ) {
          throw new Error(
            'Your Supabase database is missing new Roll columns (or the API schema cache has not refreshed).\n\n' +
              'In Supabase Dashboard → SQL Editor, run:\n' +
              '- ROLLS_PUBLIC_AND_TITLE_IMAGE_MIGRATION.sql\n' +
              '- ADD_CONTRIBUTOR_PHOTO_LIMIT.sql\n\n' +
              'Then retry. If it still fails, wait 1–2 minutes or restart the Supabase API/project to refresh the schema cache.'
          );
        }
        throw updateError;
      }

      await fetchRolls();
      return data;
    } catch (err) {
      console.error('Error updating roll:', err);
      throw err;
    }
  }, [user, fetchRolls]);

  // Delete a Roll
  const deleteRoll = useCallback(async (rollId) => {
    if (!user) {
      throw new Error('User must be authenticated to delete a roll');
    }

    try {
      const { error: deleteError } = await supabase
        .from('rolls')
        .delete()
        .eq('id', rollId)
        .eq('creator_id', user.id); // Only creator can delete

      if (deleteError) throw deleteError;

      await fetchRolls();
    } catch (err) {
      console.error('Error deleting roll:', err);
      throw err;
    }
  }, [user, fetchRolls]);

  // Add an image to a Roll
  const addImageToRoll = useCallback(async (rollId, imageUrl, caption = null) => {
    if (!user) {
      throw new Error('User must be authenticated to add images');
    }

    if (!rollId) {
      throw new Error('Roll ID is required to add an image');
    }

    if (!imageUrl) {
      throw new Error('Image URL is required to add an image');
    }

    try {
      let { data: rollRow, error: rollFetchError } = await supabase
        .from('rolls')
        .select('creator_id, contributor_photo_limit')
        .eq('id', rollId)
        .single();

      if (
        rollFetchError &&
        (rollFetchError.message?.includes('contributor_photo_limit') ||
          rollFetchError.message?.toLowerCase()?.includes('schema cache'))
      ) {
        const retry = await supabase
          .from('rolls')
          .select('creator_id')
          .eq('id', rollId)
          .single();
        if (retry.error) {
          throw new Error(retry.error.message || 'Could not load roll');
        }
        rollRow = { ...retry.data, contributor_photo_limit: null };
      } else if (rollFetchError) {
        throw new Error(rollFetchError.message || 'Could not load roll');
      }

      const isOwner = rollRow?.creator_id === user.id;
      const limit = rollRow?.contributor_photo_limit;

      if (!isOwner && limit != null && limit >= 1) {
        const { count, error: countError } = await supabase
          .from('roll_images')
          .select('*', { count: 'exact', head: true })
          .eq('roll_id', rollId)
          .eq('contributor_id', user.id)
          .neq('caption', '__title_image__');

        if (countError) {
          throw new Error(countError.message || 'Could not check photo count');
        }
        const current = count ?? 0;
        if (current >= limit) {
          throw new Error(
            `You have reached the maximum of ${limit} photo${limit === 1 ? '' : 's'} for this roll (contributor limit set by the owner).`
          );
        }
      }

      console.log('📝 Adding image to roll_images table...', { 
        rollId, 
        rollIdType: typeof rollId,
        imageUrl: imageUrl.substring(0, 50) + '...', 
        contributorId: user.id,
        contributorIdType: typeof user.id,
      });
      
      const { data, error: insertError } = await supabase
        .from('roll_images')
        .insert([
          {
            roll_id: rollId,
            image_url: imageUrl,
            contributor_id: user.id,
            caption: caption || null,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        console.error('Error code:', insertError.code);
        console.error('Error message:', insertError.message);
        console.error('Error details:', JSON.stringify(insertError, null, 2));
        console.error('Insert attempted:', {
          roll_id: rollId,
          image_url: imageUrl.substring(0, 50) + '...',
          contributor_id: user.id,
        });
        
        // Provide helpful error messages
        if (insertError.code === '23503') {
          throw new Error(`Foreign key constraint failed. The roll ID "${rollId}" may not exist or you may not have permission to add images to it.`);
        } else if (insertError.code === '23505') {
          throw new Error('This image already exists in the database.');
        } else if (insertError.message?.includes('row-level security')) {
          throw new Error('Permission denied. You may not have permission to add images to this roll.');
        }
        
        throw insertError;
      }

      console.log('✅ Image successfully added to roll:', data);
      return data;
    } catch (err) {
      console.error('❌ Error adding image to roll:', err);
      throw err;
    }
  }, [user]);

  // Get Rolls by status
  const getRollsByStatus = useCallback((status) => {
    return rolls.filter(roll => roll.status === status);
  }, [rolls]);

  // Get Rolls by ownership
  const getOwnedRolls = useCallback(() => {
    return rolls.filter(roll => roll.creator_id === user?.id);
  }, [rolls, user]);

  // Get Rolls user is contributor to (but not creator/owner)
  const getContributedRolls = useCallback(() => {
    return rolls.filter(roll => roll.creator_id !== user?.id);
  }, [rolls, user]);

  // Get image count for a roll
  const getRollImageCount = useCallback(async (rollId) => {
    try {
      const { count, error } = await supabase
        .from('roll_images')
        .select('*', { count: 'exact', head: true })
        .eq('roll_id', rollId)
        .neq('caption', '__title_image__'); // Exclude title images (they're separate)

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Error getting roll image count:', err);
      return 0;
    }
  }, []);

  // Initialize: Fetch rolls when user changes
  useEffect(() => {
    fetchRolls();
  }, [fetchRolls]);

  // Subscribe to real-time updates for rolls
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('rolls_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rolls',
          filter: `creator_id=eq.${user.id}`,
        },
        () => {
          fetchRolls();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchRolls]);

  // Subscribe to real-time updates for roll_contributors to refresh when user is added/removed
  // This will trigger when a user accepts an invite and gets added to roll_contributors
  useEffect(() => {
    if (!user) return;

    // Debounce to prevent rapid-fire refreshes
    let refreshTimeout = null;
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log('🔔 Roll contributor changed, refreshing rolls...');
        fetchRolls();
      }, 500); // Wait 500ms before refreshing
    };

    const subscription = supabase
      .channel('roll_contributors_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roll_contributors',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      subscription.unsubscribe();
    };
  }, [user, fetchRolls]);

  // Subscribe to real-time updates for roll_images to refresh image counts
  // This will trigger when images are added/removed from any roll
  useEffect(() => {
    if (!user) return;

    // Debounce to prevent rapid-fire refreshes
    let refreshTimeout = null;
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log('Roll image changed, refreshing rolls...');
        fetchRolls();
      }, 500); // Wait 500ms before refreshing
    };

    const subscription = supabase
      .channel('roll_images_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roll_images',
        },
        (payload) => {
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      subscription.unsubscribe();
    };
  }, [user, fetchRolls]);

  const value = {
    rolls,
    loading,
    error,
    createRoll,
    updateRoll,
    deleteRoll,
    addImageToRoll,
    fetchRolls,
    getRollsByStatus,
    getOwnedRolls,
    getContributedRolls,
    getRollImageCount,
  };

  return <RollsContext.Provider value={value}>{children}</RollsContext.Provider>;
};

export const useRolls = () => {
  const context = useContext(RollsContext);
  if (context === undefined) {
    throw new Error('useRolls must be used within a RollsProvider');
  }
  return context;
};

