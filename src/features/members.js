import { supabase } from '../lib/supabaseClient.js';

export async function fetchMyMemberships() {
  const { data, error } = await supabase.from('event_members').select('event_id');
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.event_id));
}

export async function joinEvent(eventId, userId) {
  const { error } = await supabase
    .from('event_members')
    .insert({ event_id: eventId, user_id: userId });
  if (error) throw error;
}

export async function leaveEvent(eventId, userId) {
  const { error } = await supabase
    .from('event_members')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw error;
}
