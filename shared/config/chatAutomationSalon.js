import { supabase } from './supabaseClient.js';

/** Config global bot Andreas Pro ↔ n8n (solo matriz). */
export async function getChatAutomationSettings() {
  const { data, error } = await supabase
    .from('chat_automation_settings')
    .select('enabled, debounce_seconds, human_takeover_minutes, bot_display_name, updated_at')
    .eq('id', 1)
    .maybeSingle();
  return { data, error };
}

export async function setChatAutomationEnabled(enabled) {
  const { data, error } = await supabase.rpc('salon_set_chat_automation_enabled', {
    p_enabled: Boolean(enabled),
  });
  return { data, error };
}
