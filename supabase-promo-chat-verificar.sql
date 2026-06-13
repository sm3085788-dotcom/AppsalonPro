-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN promos en chat — NO crea tablas nuevas
-- Ejecutá TODO (Ctrl+A → Run) y leé el resultado de cada SELECT.
--
-- NO existe una tabla "promos_mini". El sistema usa tablas que ya tenés:
--   1) inventario          → promos activas (meta JSON en columna notas)
--   2) marketing_direct_messages → mensajes chat (content_type = promo_inventario)
-- Los archivos .sql del repo crean FUNCIONES (RPC), no tablas nuevas.
-- ═══════════════════════════════════════════════════════════════════════════

-- A) ¿Existen las tablas base?
SELECT 'tablas_base' AS check_id, jsonb_build_object(
  'inventario', EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inventario'
  ),
  'marketing_direct_messages', EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'marketing_direct_messages'
  ),
  'chat_automation_queue', EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_automation_queue'
  )
) AS resultado;

-- B) ¿Hay promos activas en inventario? (catálogo matriz)
SELECT 'promos_inventario' AS check_id, public.debug_promos_chat_estado() AS resultado;

-- C) ¿Hay mensajes promo_inventario en el chat? (tarjetas con foto)
SELECT 'mensajes_promo_chat' AS check_id, jsonb_build_object(
  'total_promo_inventario', (
    SELECT count(*)::int FROM public.marketing_direct_messages
    WHERE content_type = 'promo_inventario'
  ),
  'ultimos_5', (
    SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
    FROM (
      SELECT id, content_type, left(content, 40) AS preview,
             media_url IS NOT NULL AS tiene_foto, created_at
      FROM public.marketing_direct_messages
      WHERE content_type = 'promo_inventario'
      ORDER BY id DESC
      LIMIT 5
    ) x
  )
) AS resultado;

-- D) ¿Están instaladas las funciones del mini hotfix?
SELECT 'funciones_sql' AS check_id, jsonb_build_object(
  'n8n_send_promos_chat_reply', EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'n8n_send_promos_chat_reply'
  ),
  'promo_chat_emit_inventario_cards', EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'promo_chat_emit_inventario_cards'
  ),
  'debug_emitir_promos_chat', EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'debug_emitir_promos_chat'
  ),
  'trigger_autofill', EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'marketing_direct_messages'
      AND t.tgname = 'mdm_promo_intro_autofill_trg'
  )
) AS resultado;

-- E) Ver en Table Editor (manual):
--    Supabase → Table Editor → marketing_direct_messages
--    Filtrar: content_type = promo_inventario
