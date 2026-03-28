import { supabase } from '../lib/supabase';

let hasLoggedRollInvitesTableMissing = false;

/** True only for "relation/table does not exist" — not embed/RLS/FK errors (those also mention "roll_invites"). */
function isRollInvitesTableMissingError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = String(error.code || '');
  if (code === 'PGRST205' || code === 'PGRST116') return true;
  if (msg.includes('does not exist') && (msg.includes('relation') || msg.includes('table'))) return true;
  if (msg.includes('could not find the table')) return true;
  return false;
}

function warnRollInvitesTableMissingOnce() {
  if (hasLoggedRollInvitesTableMissing) return;
  hasLoggedRollInvitesTableMissing = true;
  console.warn(
    'roll_invites table does not exist. Run CREATE_ROLL_INVITES_TABLE.sql in Supabase SQL Editor.'
  );
}

/**
 * Generate or get invite link token for a roll
 * @param {string} rollId - Roll ID
 * @returns {Promise<string>} Invite token
 */
export const getRollInviteToken = async (rollId) => {
  try {
    const { data, error } = await supabase.rpc('get_or_create_roll_invite_token', {
      p_roll_id: rollId,
      p_inviter_id: (await supabase.auth.getUser()).data.user.id,
    });

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('get_or_create_roll_invite_token')) {
        throw new Error(
          'Roll invites feature is not set up yet. Please run CREATE_ROLL_INVITES_TABLE.sql in Supabase SQL Editor.'
        );
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error generating invite token:', error);
    throw error;
  }
};

/**
 * Get invite link URL for a roll
 * @param {string} rollId - Roll ID
 * @returns {Promise<string>} Full invite URL
 */
export const getRollInviteLink = async (rollId) => {
  try {
    const token = await getRollInviteToken(rollId);
    // Use the app's deep link scheme
    return `rollsapp://roll/invite/${token}`;
  } catch (error) {
    console.error('Error getting invite link:', error);
    throw error;
  }
};

/**
 * Invite preview for a link token (bypasses RLS for contributors). Works for anon + authenticated.
 * @param {string} token
 * @returns {Promise<{ invite_id: string, roll_id: string, roll: object, inviter: object }>}
 */
export const getRollInvitePreviewByToken = async (token) => {
  const { data, error } = await supabase.rpc('get_roll_invite_preview_by_token', {
    p_token: token,
  });
  if (error) throw error;
  return data;
};

/**
 * Decline a link-based invite by token.
 * @param {string} token
 */
export const declineRollInviteByToken = async (token) => {
  const { data, error } = await supabase.rpc('decline_roll_invite_by_token', {
    p_token: token,
  });
  if (error) throw error;
  return data;
};

/**
 * Invite a user by their user ID (for existing app users)
 * @param {string} rollId - Roll ID
 * @param {string} inviteeUserId - User ID to invite
 * @returns {Promise<Object>} Invite record
 */
export const inviteUserToRoll = async (rollId, inviteeUserId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    // Check if roll_invites table exists
    const { error: tableCheckError } = await supabase
      .from('roll_invites')
      .select('id')
      .limit(0);

    if (tableCheckError && isRollInvitesTableMissingError(tableCheckError)) {
      throw new Error(
        'Roll invites feature is not set up yet. Please run CREATE_ROLL_INVITES_TABLE.sql in Supabase SQL Editor to enable this feature.'
      );
    }

    // Check if user is already a contributor
    const { data: existingContributor } = await supabase
      .from('roll_contributors')
      .select('id')
      .eq('roll_id', rollId)
      .eq('user_id', inviteeUserId)
      .single();

    if (existingContributor) {
      throw new Error('User is already a contributor to this roll');
    }

    // Check if pending invite exists
    const { data: existingInvite } = await supabase
      .from('roll_invites')
      .select('id')
      .eq('roll_id', rollId)
      .eq('invitee_user_id', inviteeUserId)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      throw new Error('Invite already sent to this user');
    }

    // Create invite
    const { data, error } = await supabase
      .from('roll_invites')
      .insert([
        {
          roll_id: rollId,
          inviter_id: user.id,
          invitee_user_id: inviteeUserId,
          method: 'user',
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inviting user to roll:', error);
    throw error;
  }
};

/**
 * Invite a user by email address
 * @param {string} rollId - Roll ID
 * @param {string} email - Email address
 * @returns {Promise<Object>} Invite record
 */
export const inviteEmailToRoll = async (rollId, email) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    // Generate invite token
    const token = await getRollInviteToken(rollId);

    // Create invite
    const { data, error } = await supabase
      .from('roll_invites')
      .insert([
        {
          roll_id: rollId,
          inviter_id: user.id,
          invitee_email: email.toLowerCase().trim(),
          method: 'email',
          invite_token: token,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      if (isRollInvitesTableMissingError(error)) {
        throw new Error(
          'Roll invites feature is not set up yet. Please run CREATE_ROLL_INVITES_TABLE.sql in Supabase SQL Editor.'
        );
      }
      throw error;
    }

    // TODO: Send email via Supabase Edge Function or external service
    // For now, return the invite link
    const inviteLink = `rollsapp://roll/invite/${token}`;
    
    return { ...data, invite_link: inviteLink };
  } catch (error) {
    console.error('Error inviting email to roll:', error);
    throw error;
  }
};

/**
 * Accept a roll invite by invite ID
 * @param {string} inviteId - Invite ID
 * @returns {Promise<Object>} Updated invite record
 */
export const acceptRollInvite = async (inviteId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { data, error } = await supabase.rpc('accept_roll_invite', {
      p_invite_id: inviteId,
      p_user_id: user.id,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error accepting roll invite:', error);
    throw error;
  }
};

/**
 * Accept a roll invite by token (for deep link invites)
 * @param {string} token - Invite token
 * @returns {Promise<string>} Roll ID
 */
export const acceptRollInviteByToken = async (token) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { data, error } = await supabase.rpc('accept_roll_invite_by_token', {
      p_token: token,
      p_user_id: user.id,
    });

    if (error) throw error;
    return data; // Returns roll_id
  } catch (error) {
    console.error('Error accepting roll invite by token:', error);
    throw error;
  }
};

/**
 * Decline a roll invite
 * @param {string} inviteId - Invite ID
 * @returns {Promise<void>}
 */
export const declineRollInvite = async (inviteId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { error } = await supabase
      .from('roll_invites')
      .update({ status: 'declined', declined_at: new Date().toISOString() })
      .eq('id', inviteId)
      .or(`invitee_user_id.eq.${user.id},invitee_email.eq.${user.email}`);

    if (error) throw error;
  } catch (error) {
    console.error('Error declining roll invite:', error);
    throw error;
  }
};

/**
 * Load public.users for inviter_id (PostgREST cannot embed: FKs reference auth.users, not public.users).
 */
async function attachInviterProfiles(invites) {
  if (!invites?.length) return invites || [];
  const ids = [...new Set(invites.map((r) => r.inviter_id).filter(Boolean))];
  if (ids.length === 0) return invites;

  const { data: profiles, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', ids);

  if (error) {
    console.warn('Could not load inviter profiles:', error.message);
    return invites;
  }

  const map = new Map((profiles || []).map((u) => [u.id, u]));
  return invites.map((row) => ({
    ...row,
    inviter: map.get(row.inviter_id) || null,
  }));
}

/**
 * Get pending invites for current user
 * @returns {Promise<Array>} Array of pending invites
 */
export const getPendingInvites = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('roll_invites')
      .select(
        `
        *,
        roll:rolls(*)
      `
      )
      .eq('status', 'pending')
      .or(`invitee_user_id.eq.${user.id},invitee_email.eq.${user.email || ''}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (isRollInvitesTableMissingError(error)) {
        warnRollInvitesTableMissingOnce();
        return [];
      }
      console.error(
        'Error getting pending invites:',
        error.code,
        error.message,
        error.details || ''
      );
      return [];
    }
    return attachInviterProfiles(data || []);
  } catch (error) {
    console.error('Error getting pending invites (exception):', error);
    return [];
  }
};

async function attachInviteeProfiles(invites) {
  if (!invites?.length) return invites || [];
  const ids = [...new Set(invites.map((r) => r.invitee_user_id).filter(Boolean))];
  if (ids.length === 0) return invites;

  const { data: profiles, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', ids);

  if (error) {
    console.warn('Could not load invitee profiles:', error.message);
    return invites;
  }

  const map = new Map((profiles || []).map((u) => [u.id, u]));
  return invites.map((row) => ({
    ...row,
    invitee: map.get(row.invitee_user_id) || null,
  }));
}

/**
 * Get invites for a specific roll (roll owner only)
 * @param {string} rollId - Roll ID
 * @returns {Promise<Array>} Array of invites
 */
export const getRollInvites = async (rollId) => {
  try {
    const { data, error } = await supabase
      .from('roll_invites')
      .select('*')
      .eq('roll_id', rollId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isRollInvitesTableMissingError(error)) {
        warnRollInvitesTableMissingOnce();
        return [];
      }
      console.error(
        'Error getting roll invites:',
        error.code,
        error.message,
        error.details || ''
      );
      throw error;
    }
    return attachInviteeProfiles(data || []);
  } catch (error) {
    console.error('Error getting roll invites:', error);
    return [];
  }
};

/**
 * Remove a contributor from a roll (roll owner only)
 * @param {string} rollId - Roll ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<void>}
 */
export const removeRollContributor = async (rollId, userId) => {
  try {
    const { error } = await supabase
      .from('roll_contributors')
      .delete()
      .eq('roll_id', rollId)
      .eq('user_id', userId)
      .neq('role', 'owner'); // Can't remove owner

    if (error) throw error;
  } catch (error) {
    console.error('Error removing contributor:', error);
    throw error;
  }
};

/**
 * Leave a roll (remove self as contributor)
 * @param {string} rollId - Roll ID
 * @returns {Promise<void>}
 */
export const leaveRoll = async (rollId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { error } = await supabase
      .from('roll_contributors')
      .delete()
      .eq('roll_id', rollId)
      .eq('user_id', user.id)
      .neq('role', 'owner'); // Can't leave if you're the owner

    if (error) throw error;
  } catch (error) {
    console.error('Error leaving roll:', error);
    throw error;
  }
};
