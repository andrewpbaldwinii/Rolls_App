import { supabase } from '../lib/supabase';
import { clearProfileCache } from './publicProfile';

const DEFAULTS = {
  message_allow_from: 'anyone',
  public_roll_join_policy: 'invite_only',
};

export async function fetchPrivacySettings() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('users')
    .select('message_allow_from, public_roll_join_policy')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('fetchPrivacySettings:', error.message);
    return { ...DEFAULTS };
  }

  return {
    message_allow_from: data?.message_allow_from ?? DEFAULTS.message_allow_from,
    public_roll_join_policy:
      data?.public_roll_join_policy ?? DEFAULTS.public_roll_join_policy,
  };
}

export async function updatePrivacySettings({ messageAllowFrom, publicRollJoinPolicy }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const patch = {};
  if (messageAllowFrom != null) patch.message_allow_from = messageAllowFrom;
  if (publicRollJoinPolicy != null) patch.public_roll_join_policy = publicRollJoinPolicy;

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from('users').update(patch).eq('id', user.id);
  if (error) throw error;
}

export async function blockUserByUsername(rawUsername) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const username = (rawUsername || '').trim().replace(/^@/, '');
  if (!username) throw new Error('Enter a username');

  const { data: matches, error: findError } = await supabase
    .from('users')
    .select('id, username')
    .ilike('username', username)
    .limit(5);

  if (findError) throw findError;

  const exact =
    matches?.find((r) => r.username?.toLowerCase() === username.toLowerCase()) ||
    (matches?.length === 1 ? matches[0] : null);

  if (!exact) {
    if (matches?.length > 1) {
      throw new Error('Several usernames match. Try the exact username.');
    }
    throw new Error('User not found');
  }

  if (exact.id === user.id) throw new Error('You cannot block yourself');

  const { error: insertError } = await supabase.from('user_blocks').insert({
    blocker_id: user.id,
    blocked_id: exact.id,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      throw new Error('You already blocked this user');
    }
    throw insertError;
  }

  clearProfileCache(user.id);
  clearProfileCache(exact.id);
}

export async function listBlockedUsers() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: blocks, error } = await supabase
    .from('user_blocks')
    .select('id, blocked_id, created_at')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!blocks?.length) return [];

  const ids = blocks.map((b) => b.blocked_id);
  const { data: usersRows, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name')
    .in('id', ids);

  if (usersError) throw usersError;

  const byId = new Map((usersRows || []).map((u) => [u.id, u]));

  return blocks.map((b) => ({
    blockId: b.id,
    blockedId: b.blocked_id,
    username: byId.get(b.blocked_id)?.username ?? null,
    displayName: byId.get(b.blocked_id)?.display_name ?? null,
  }));
}

export async function unblockUser(blockedId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  if (error) throw error;

  clearProfileCache(user.id);
  clearProfileCache(blockedId);
}
