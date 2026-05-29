/** Mensajes claros cuando falla RLS o faltan migraciones SQL en Supabase. */

export function formatSupabaseActionError(err, context = '') {
  const msg = String(err?.message || err || 'Error desconocido');
  const base = context ? `${context}: ${msg}` : msg;

  if (/row-level security|permission denied|42501/i.test(msg)) {
    return `${base}\n\n• App Salón: tu usuario debe tener profiles.role = admin.\n• Ejecutá en Supabase → SQL Editor:\n  supabase-aura-line-client.sql\n  supabase-fix-mensajes-facturas.sql\n  supabase-client-notifications.sql`;
  }

  if (/client_aura|client_mis_facturas|client_send_aura|notify_client_from_mdm|ensure_cliente_for_auth/i.test(msg)) {
    return `${base}\n\nFalta un RPC en Supabase. Ejecutá supabase-fix-mensajes-facturas.sql y supabase-aura-line-client.sql.`;
  }

  return base;
}
