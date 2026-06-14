-- Referidos: Samuel Morales (referidor) → Andrea Morales (invitada)
-- OPCIONAL — reparación manual. El flujo normal es automático vía app + cadena-sistema.sql
-- Ejecutar solo si hace falta corregir un caso puntual.

CREATE OR REPLACE FUNCTION public.codigo_referido_from_user_id(p_uid uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'ANDREAS-' || upper(
    substring(r from 1 for 6) || substring(r from greatest(1, length(r) - 5) for 6)
  )
  FROM (SELECT replace(p_uid::text, '-', '') AS r) s
  WHERE p_uid IS NOT NULL;
$$;

-- ─── 1) Diagnóstico ─────────────────────────────────────────────────────────
SELECT 'referidor' AS rol, c.id, c.user_id, c.nombre, c.email,
       c.codigo_referido,
       public.codigo_referido_from_user_id(c.user_id) AS codigo_calculado,
       c.referido_por
FROM public.clientes c
WHERE c.nombre ILIKE '%Samuel%Morales%'
ORDER BY c.created_at DESC;

SELECT 'invitada' AS rol, c.id, c.user_id, c.nombre, c.email,
       c.referido_por, c.referido_codigo_pendiente, c.referido_beneficio_registrado,
       c.codigo_referido AS su_propio_codigo_para_compartir
FROM public.clientes c
WHERE lower(trim(c.email)) = 'andreassalon1998@gmail.com'
   OR c.nombre ILIKE '%Andrea Morales%';

-- ─── 2) user_id en Auth si falta ────────────────────────────────────────────
UPDATE public.clientes c
SET user_id = u.id
FROM auth.users u
WHERE c.user_id IS NULL
  AND lower(trim(c.email)) = lower(trim(u.email))
  AND (
    c.nombre ILIKE '%Samuel%Morales%'
    OR lower(trim(c.email)) = 'andreassalon1998@gmail.com'
  );

-- ─── 3) Código referidor en Samuel ───────────────────────────────────────────
UPDATE public.clientes c
SET codigo_referido = coalesce(
  nullif(trim(c.codigo_referido), ''),
  public.codigo_referido_from_user_id(c.user_id),
  'ANDREAS-9F014A9E4D9B'
)
WHERE c.user_id IS NOT NULL
  AND c.nombre ILIKE '%Samuel%Morales%'
  AND (
    public.codigo_referido_from_user_id(c.user_id) = 'ANDREAS-9F014A9E4D9B'
    OR upper(trim(coalesce(c.codigo_referido, ''))) = 'ANDREAS-9F014A9E4D9B'
    OR c.codigo_referido IS NULL
    OR trim(c.codigo_referido) = ''
  );

-- ─── 4) Vincular Andrea ← código de Samuel ───────────────────────────────────
DO $$
DECLARE
  v_cod text := 'ANDREAS-9F014A9E4D9B';
  v_referidor_user uuid;
  v_referidor_id uuid;
  v_invitado_id uuid;
  v_invitado_user uuid;
  v_ap jsonb;
  v_rpc jsonb;
BEGIN
  SELECT c.id, c.user_id INTO v_referidor_id, v_referidor_user
  FROM public.clientes c
  WHERE c.user_id IS NOT NULL
    AND c.nombre ILIKE '%Samuel%Morales%'
    AND (
      upper(trim(coalesce(c.codigo_referido, ''))) = v_cod
      OR public.codigo_referido_from_user_id(c.user_id) = v_cod
    )
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_referidor_user IS NULL THEN
    SELECT c.id, c.user_id INTO v_referidor_id, v_referidor_user
    FROM public.clientes c
    WHERE c.user_id IS NOT NULL
      AND (
        upper(trim(coalesce(c.codigo_referido, ''))) = v_cod
        OR public.codigo_referido_from_user_id(c.user_id) = v_cod
      )
    LIMIT 1;
  END IF;

  IF v_referidor_user IS NULL THEN
    RAISE EXCEPTION 'No se encontró referidor Samuel con código %. Abrí Premios en la cuenta de Samuel.', v_cod;
  END IF;

  SELECT c.id, c.user_id INTO v_invitado_id, v_invitado_user
  FROM public.clientes c
  WHERE lower(trim(c.email)) = 'andreassalon1998@gmail.com'
  LIMIT 1;

  IF v_invitado_id IS NULL THEN
    SELECT c.id, c.user_id INTO v_invitado_id, v_invitado_user
    FROM public.clientes c
    WHERE c.nombre ILIKE '%Andrea Morales%' AND c.user_id IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 1;
  END IF;

  IF v_invitado_id IS NULL THEN
    RAISE EXCEPTION 'No existe ficha de Andrea Morales (andreassalon1998@gmail.com)';
  END IF;

  IF v_invitado_user IS NULL THEN
    SELECT u.id INTO v_invitado_user
    FROM auth.users u
    WHERE lower(trim(u.email)) = 'andreassalon1998@gmail.com'
    LIMIT 1;
    IF v_invitado_user IS NOT NULL THEN
      UPDATE public.clientes SET user_id = v_invitado_user WHERE id = v_invitado_id;
    ELSE
      RAISE EXCEPTION 'Andrea sin user_id: debe iniciar sesión al menos una vez en App Clientes';
    END IF;
  END IF;

  IF v_referidor_user = v_invitado_user THEN
    RAISE EXCEPTION 'Referidor e invitada son la misma cuenta';
  END IF;

  -- Preferir RPC si existe (marca andreas_premios vía referido_registrar_invitacion)
  BEGIN
    SELECT public.cliente_aplicar_codigo_referido(v_invitado_user, v_cod) INTO v_rpc;
    IF coalesce(v_rpc->>'ok', 'false') = 'true' THEN
      RAISE NOTICE 'RPC ok: %', v_rpc;
      RETURN;
    END IF;
    RAISE NOTICE 'RPC no aplicó (continúa update directo): %', v_rpc;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'RPC cliente_aplicar_codigo_referido no existe; update directo';
  END;

  UPDATE public.clientes
  SET
    referido_por = v_referidor_user,
    referido_codigo_pendiente = v_cod
  WHERE id = v_invitado_id
    AND coalesce(referido_beneficio_registrado, false) = false;

  BEGIN
    PERFORM public.referido_registrar_invitacion(v_invitado_id);
  EXCEPTION WHEN undefined_function THEN
    v_ap := coalesce(
      (SELECT andreas_premios FROM public.clientes WHERE id = v_invitado_id),
      '{}'::jsonb
    );
    IF NOT coalesce((v_ap->>'referido_invitado')::boolean, false) THEN
      UPDATE public.clientes
      SET andreas_premios = v_ap || jsonb_build_object(
        'referido_invitado', true,
        'referido_invitado_en', now()
      )
      WHERE id = v_invitado_id;
    END IF;
  END;

  RAISE NOTICE 'OK: Andrea (invitada) user_id=% ← Samuel (referidor) user_id=%', v_invitado_user, v_referidor_user;
END $$;

-- ─── 5) Verificar ───────────────────────────────────────────────────────────
SELECT
  inv.nombre AS invitada,
  inv.email AS invitada_email,
  inv.referido_por,
  inv.referido_codigo_pendiente,
  inv.andreas_premios->>'referido_invitado' AS andrea_invitada_premios,
  ref.nombre AS referidor,
  ref.email AS referidor_email,
  ref.codigo_referido AS codigo_samuel
FROM public.clientes inv
LEFT JOIN public.clientes ref ON ref.user_id = inv.referido_por
WHERE lower(trim(inv.email)) = 'andreassalon1998@gmail.com';

-- Invitados de Samuel (debe listar a Andrea)
SELECT inv.nombre, inv.email, inv.referido_codigo_pendiente, inv.referido_beneficio_registrado
FROM public.clientes ref
JOIN public.clientes inv ON inv.referido_por = ref.user_id
WHERE ref.nombre ILIKE '%Samuel%Morales%';

-- Contador Premios de Samuel (referidos validados en ciclo)
SELECT ref.nombre, p.referidos_en_ciclo, p.ciclo_actual
FROM public.clientes ref
LEFT JOIN public.andreas_premios p ON p.user_id = ref.user_id
WHERE ref.nombre ILIKE '%Samuel%Morales%';
