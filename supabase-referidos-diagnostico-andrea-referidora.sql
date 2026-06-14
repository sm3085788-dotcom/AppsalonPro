-- Referidos: Andrea Morales ES la referidora (dueña del código ANDREAS-36A3A4E15B92)
-- El invitado es OTRA cuenta (otro email). Ejecutar en Supabase → SQL Editor.

-- ID referidor Andrea
-- user_id: 36a3a468-c748-433d-a45e-bb47fae15b92

-- 1) ¿Quién invitó Andrea? (debe estar vacío — ella no es invitada)
SELECT nombre, email, referido_por, referido_codigo_pendiente
FROM public.clientes
WHERE user_id = '36a3a468-c748-433d-a45e-bb47fae15b92'::uuid;

-- 2) Invitados vinculados a Andrea (referido_por = su user_id)
SELECT
  c.nombre,
  c.email,
  c.user_id,
  c.referido_por,
  c.referido_codigo_pendiente,
  c.referido_beneficio_registrado,
  v.tipo,
  v.validado_en
FROM public.clientes c
LEFT JOIN public.andreas_referido_validaciones v ON v.referido_user_id = c.user_id
WHERE c.referido_por = '36a3a468-c748-433d-a45e-bb47fae15b92'::uuid
ORDER BY c.created_at DESC;

-- 3) Contador Premios de Andrea (referidos en ciclo actual)
SELECT
  c.nombre,
  c.andreas_premios->>'referidos_en_ciclo' AS referidos_en_ciclo,
  c.andreas_premios->>'referidos_ciclo' AS ciclo_premio,
  (SELECT count(*) FROM public.andreas_referido_validaciones v
   WHERE v.referidor_user_id = c.user_id) AS total_validados_historico
FROM public.clientes c
WHERE c.user_id = '36a3a468-c748-433d-a45e-bb47fae15b92'::uuid;

-- 4) Vincular manualmente al INVITADO (cambiar email del invitado, NO el de Andrea)
/*
DO $$
DECLARE
  v_referidor uuid := '36a3a468-c748-433d-a45e-bb47fae15b92';
  v_invitado_email text := 'correo-del-invitado@ejemplo.com';  -- ← otro email
  v_invitado_user uuid;
BEGIN
  SELECT user_id INTO v_invitado_user
  FROM public.clientes
  WHERE lower(trim(email)) = lower(trim(v_invitado_email))
  LIMIT 1;

  IF v_invitado_user IS NULL OR v_invitado_user = v_referidor THEN
    RAISE EXCEPTION 'Invitado no encontrado o es la misma cuenta que Andrea';
  END IF;

  UPDATE public.clientes
  SET
    referido_por = v_referidor,
    referido_codigo_pendiente = 'ANDREAS-36A3A4E15B92',
    andreas_premios = coalesce(andreas_premios, '{}'::jsonb) || jsonb_build_object(
      'referido_invitado', true,
      'referido_invitado_en', now()
    )
  WHERE user_id = v_invitado_user
    AND referido_beneficio_registrado = false;

  RAISE NOTICE 'Invitado vinculado: %', v_invitado_email;
END $$;
*/
