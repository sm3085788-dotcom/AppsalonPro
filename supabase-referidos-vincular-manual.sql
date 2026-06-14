-- Vincular referido manualmente (cuando el registro no guardó referido_por)
-- Ejecutar en Supabase → SQL Editor DESPUÉS de supabase-referidos-premios-fix.sql
--
-- PASO 1: Ver fichas y códigos (buscá al invitado y al referidor)
SELECT
  c.id AS cliente_id,
  c.user_id,
  c.nombre,
  c.email,
  c.referido_por,
  c.referido_codigo_pendiente,
  c.referido_beneficio_registrado,
  c.codigo_referido AS mi_codigo_para_invitar
FROM public.clientes c
WHERE c.user_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 30;

-- PASO 2: Aplicar código — cambiá SOLO estos dos valores:
--   p_email_invitado  → correo con el que se registró el invitado
--   p_codigo_referidor → código ANDREAS-… del referidor (Premios → compartir)

DO $$
DECLARE
  p_email_invitado text := 'invitado@ejemplo.com';   -- ← correo del invitado
  p_codigo_referidor text := 'ANDREAS-XXXXXXXX';     -- ← código del referidor
  v_user_id uuid;
  v_result jsonb;
BEGIN
  SELECT c.user_id INTO v_user_id
  FROM public.clientes c
  WHERE lower(trim(c.email)) = lower(trim(p_email_invitado))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay cliente con email «%». Revisá el PASO 1.', p_email_invitado;
  END IF;

  v_result := public.cliente_aplicar_codigo_referido(v_user_id, p_codigo_referidor);
  RAISE NOTICE 'Resultado: %', v_result;
END $$;

-- PASO 3: Verificar que quedó vinculado
-- (reemplazá el email)
SELECT
  c.nombre,
  c.email,
  c.referido_por,
  c.referido_codigo_pendiente,
  ref.nombre AS referidor_nombre,
  ref.codigo_referido AS codigo_referidor
FROM public.clientes c
LEFT JOIN public.clientes ref ON ref.user_id = c.referido_por
WHERE lower(trim(c.email)) = lower(trim('invitado@ejemplo.com'));

-- Alternativa: si ya conocés el user_id (UUID real de auth.users / clientes.user_id):
-- SELECT public.cliente_aplicar_codigo_referido(
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
--   'ANDREAS-ABC123'
-- );
