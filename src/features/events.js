import { supabase } from '../lib/supabaseClient.js';

export const CATEGORIES = [
  'Культура',
  'Спорт',
  'Хобби',
  'Волонтёрство',
  'Наука',
  'Игры',
];

export const COVER_STYLES = [
  { value: 'lavender', label: 'Лаванда' },
  { value: 'mint', label: 'Мята' },
  { value: 'coral', label: 'Коралл' },
  { value: 'sun', label: 'Солнце' },
];

export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEvent(input, userId) {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, creator_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, input) {
  const { data, error } = await supabase
    .from('events')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}
