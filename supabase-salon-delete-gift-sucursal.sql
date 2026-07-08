-- App Salón — borrado staff: tarjetas regalo, códigos ACT pendientes, desactivar sucursales
-- Ejecutar en Supabase → SQL Editor

CREATE OR REPLACE FUNCTION public.delete_gift_card_staff(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Id inválido.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gift_cards WHERE id = p_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta no encontrada.');
  END IF;
  DELETE FROM public.gift_cards WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_gift_card_activation_code_staff(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Id inválido.');
  END IF;
  SELECT status INTO v_status
  FROM public.gift_card_activation_codes
  WHERE id = p_id;
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código no encontrado.');
  END IF;
  IF v_status = 'redeemed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No se puede eliminar un código ya canjeado.');
  END IF;
  DELETE FROM public.gift_card_activation_codes WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.desactivar_sucursal_staff(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sucursales%ROWTYPE;
BEGIN
  IF NOT public.is_admin_global() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo la matriz puede desactivar sucursales.');
  END IF;
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Id inválido.');
  END IF;
  SELECT * INTO v_row FROM public.sucursales WHERE id = p_id;
  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sucursal no encontrada.');
  END IF;
  IF v_row.es_matriz THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No se puede desactivar la sucursal matriz.');
  END IF;
  IF v_row.activa = false THEN
    RETURN jsonb_build_object('ok', true, 'already_inactive', true);
  END IF;
  UPDATE public.sucursales SET activa = false WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'nombre', v_row.nombre, 'codigo', v_row.codigo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_gift_card_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_gift_card_activation_code_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desactivar_sucursal_staff(uuid) TO authenticated;
