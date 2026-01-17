import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const RollsContext = createContext({});

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
            console.warn('roll_contributors table does not exist yet. Skipping contributor rolls.');
          } else {
            // For other errors, log but don't throw - continue with owned rolls only
            console.warn('Error fetching contributor rolls:', contribError);
          }
        } else if (contributorData) {
          // Extract roll objects from contributorData
          // Filter out "Profile Photos" rolls (case-insensitive)
          contributedRolls = contributorData
            .map(item => item.rolls)
            .filter(Boolean)
            .filter(roll => roll.title?.toLowerCase() !== 'profile photos') || [];
        }
      } catch (contribErr) {
        // If table doesn't exist, just log and continue with owned rolls only
        if (contribErr.code === 'PGRST116' || contribErr.message?.includes('does not exist') || contribErr.message?.includes('schema cache')) {
          console.warn('roll_contributors table does not exist yet. Skipping contributor rolls.');
        } else {
          // For other errors, log but don't throw - continue with owned rolls only
          console.warn('Error fetching contributor rolls:', contribErr);
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

      setRolls(filteredRolls);
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
      const insertPayload = {
        title: rollData.name, // Using rollData.name for consistency with UI, maps to 'title' in DB
        description: rollData.description || null,
        submission_deadline: rollData.submission_deadline || null,
        release_date: rollData.release_date || null, // Can be null - photos visible immediately if not set
        creator_id: user.id,
        status: rollData.status || 'active',
        is_public: rollData.is_public || false,
        title_image_url: rollData.title_image_url || null,
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
          createError.message?.toLowerCase()?.includes('schema cache'))
      ) {
        console.warn(
          'Rolls table is missing is_public/title_image_url. Retrying without those fields. Run ROLLS_PUBLIC_AND_TITLE_IMAGE_MIGRATION.sql in Supabase.'
        );
        const { is_public, title_image_url, ...fallbackPayload } = insertPayload;
        ({ data: roll, error: createError } = await supabase
          .from('rolls')
          .insert([fallbackPayload])
          .select()
          .single());
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
            updateError.message?.toLowerCase()?.includes('schema cache'))
        ) {
          throw new Error(
            'Your Supabase database is missing new Roll columns (or the API schema cache has not refreshed).\n\n' +
              'In Supabase Dashboard → SQL Editor, run:\n' +
              '- ROLLS_PUBLIC_AND_TITLE_IMAGE_MIGRATION.sql\n\n' +
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

  // Subscribe to real-time updates for roll_images to refresh image counts
  // This will trigger when images are added/removed from any roll
  useEffect(() => {
    if (!user) return;

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
          // Refresh rolls to update image counts
          // The fetchImageCounts in RollsScreen will pick up the changes
          console.log('Roll image changed, refreshing rolls...', payload);
          fetchRolls();
        }
      )
      .subscribe();

    return () => {
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

