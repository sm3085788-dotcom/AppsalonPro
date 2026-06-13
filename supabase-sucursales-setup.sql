-- AppSalon Pro — multi-sucursal (matriz + admin_sucursal)
-- Ejecutar en Supabase SQL Editor. Luego Settings → API → Reload schema.

-- ─── 1. Sucursales ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  es_matriz boolean NOT NULL DEFAULT false,
  activa boolean NOT NULL DEFAULT true,
  direccion text,
  telefono text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sucursales_activa_idx ON public.sucursales (activa);

-- ─── 2. Stock por sucursal (catálogo maestro sigue en inventario) ───────────
CREATE TABLE IF NOT EXISTS public.inventario_stock_sucursal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  inventario_id uuid NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
  stock_actual integer NOT NULL DEFAULT 0,
  stock_minimo integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sucursal_id, inventario_id)
);

CREATE INDEX IF NOT EXISTS inv_stock_suc_sucursal_idx ON public.inventario_stock_sucursal (sucursal_id);
CREATE INDEX IF NOT EXISTS inv_stock_suc_inventario_idx ON public.inventario_stock_sucursal (inventario_id);

-- ─── 3. Columnas nuevas ────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS creado_en_sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sucursal_preferida_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

ALTER TABLE public.cajas
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

ALTER TABLE public.citas
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

ALTER TABLE public.metas
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

ALTER TABLE public.ecommerce_orders
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

ALTER TABLE public.inventario_lotes
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

-- Roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_rol_types;
ALTER TABLE public.profiles
  ADD CONSTRAINT check_rol_types
  CHECK (role IN ('admin', 'admin_global', 'admin_sucursal', 'staff', 'client'));

-- Un solo admin_sucursal por sucursal
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_admin_sucursal_per_branch
  ON public.profiles (sucursal_id)
  WHERE lower(role) = 'admin_sucursal' AND sucursal_id IS NOT NULL;

-- ─── 4. Sucursal matriz + migración de datos existentes ────────────────────
INSERT INTO public.sucursales (codigo, nombre, es_matriz, activa)
VALUES ('MATRIZ', 'Sucursal principal', true, true)
ON CONFLICT (codigo) DO NOTHING;

DO $$
DECLARE
  v_matriz uuid;
BEGIN
  SELECT id INTO v_matriz FROM public.sucursales WHERE es_matriz = true ORDER BY created_at LIMIT 1;
  IF v_matriz IS NULL THEN
    SELECT id INTO v_matriz FROM public.sucursales ORDER BY created_at LIMIT 1;
  END IF;

  UPDATE public.ventas SET sucursal_id = v_matriz WHERE sucursal_id IS NULL;
  UPDATE public.cajas SET sucursal_id = v_matriz WHERE sucursal_id IS NULL;
  UPDATE public.citas SET sucursal_id = v_matriz WHERE sucursal_id IS NULL;
  UPDATE public.metas SET sucursal_id = v_matriz WHERE sucursal_id IS NULL AND lower(COALESCE(alcance, '')) <> 'global';
  UPDATE public.ecommerce_orders SET sucursal_id = v_matriz WHERE sucursal_id IS NULL;

  INSERT INTO public.inventario_stock_sucursal (sucursal_id, inventario_id, stock_actual, stock_minimo)
  SELECT v_matriz, i.id, COALESCE(i.stock_actual, 0), COALESCE(i.stock_minimo, 5)
  FROM public.inventario i
  ON CONFLICT (sucursal_id, inventario_id) DO UPDATE
    SET stock_actual = EXCLUDED.stock_actual,
        stock_minimo = EXCLUDED.stock_minimo,
        updated_at = now();
END $$;

-- ─── 5. Triggers: stock 0 al crear sucursal / producto ───────────────────────
CREATE OR REPLACE FUNCTION public.seed_inventario_stock_for_sucursal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventario_stock_sucursal (sucursal_id, inventario_id, stock_actual, stock_minimo)
  SELECT NEW.id, i.id, 0, COALESCE(i.stock_minimo, 5)
  FROM public.inventario i
  ON CONFLICT (sucursal_id, inventario_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_stock_new_sucursal ON public.sucursales;
CREATE TRIGGER trg_seed_stock_new_sucursal
  AFTER INSERT ON public.sucursales
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_inventario_stock_for_sucursal();

CREATE OR REPLACE FUNCTION public.seed_inventario_stock_for_producto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventario_stock_sucursal (sucursal_id, inventario_id, stock_actual, stock_minimo)
  SELECT s.id, NEW.id, 0, COALESCE(NEW.stock_minimo, 5)
  FROM public.sucursales s
  WHERE s.activa = true
  ON CONFLICT (sucursal_id, inventario_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_stock_new_producto ON public.inventario;
CREATE TRIGGER trg_seed_stock_new_producto
  AFTER INSERT ON public.inventario
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_inventario_stock_for_producto();

-- ─── 6. Helpers de sesión ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_global()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) IN ('admin', 'admin_global')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_sucursal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role)) = 'admin_sucursal'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_sucursal_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.sucursal_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_sucursal(p_sucursal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_global()
    OR (
      p_sucursal_id IS NOT NULL
      AND public.current_sucursal_id() IS NOT NULL
      AND public.current_sucursal_id() = p_sucursal_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_global() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_sucursal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_sucursal_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_sucursal(uuid) TO authenticated;

-- Crear sucursal (solo matriz) + filas stock en 0
CREATE OR REPLACE FUNCTION public.crear_sucursal(p_codigo text, p_nombre text, p_direccion text DEFAULT NULL, p_telefono text DEFAULT NULL)
RETURNS public.sucursales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.sucursales;
BEGIN
  IF NOT public.is_admin_global() THEN
    RAISE EXCEPTION 'Solo admin global puede crear sucursales';
  END IF;
  INSERT INTO public.sucursales (codigo, nombre, direccion, telefono, es_matriz, activa)
  VALUES (
    upper(trim(p_codigo)),
    trim(p_nombre),
    nullif(trim(COALESCE(p_direccion, '')), ''),
    nullif(trim(COALESCE(p_telefono, '')), ''),
    false,
    true
  )
  RETURNING * INTO row;
  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_sucursal(text, text, text, text) TO authenticated;

-- Listar sucursales activas (app clientes + salón)
CREATE OR REPLACE FUNCTION public.list_sucursales_activas()
RETURNS SETOF public.sucursales
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.sucursales WHERE activa = true ORDER BY es_matriz DESC, nombre;
$$;

GRANT EXECUTE ON FUNCTION public.list_sucursales_activas() TO authenticated, anon;

-- ─── 7. RLS sucursales + stock ───────────────────────────────────────────────
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_stock_sucursal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sucursales_read_activas ON public.sucursales;
CREATE POLICY sucursales_read_activas ON public.sucursales
  FOR SELECT TO authenticated, anon
  USING (activa = true OR public.is_admin_global());

DROP POLICY IF EXISTS sucursales_insert_global ON public.sucursales;
CREATE POLICY sucursales_insert_global ON public.sucursales
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_global());

DROP POLICY IF EXISTS sucursales_update_global ON public.sucursales;
CREATE POLICY sucursales_update_global ON public.sucursales
  FOR UPDATE TO authenticated
  USING (public.is_admin_global())
  WITH CHECK (public.is_admin_global());

DROP POLICY IF EXISTS inv_stock_suc_select ON public.inventario_stock_sucursal;
CREATE POLICY inv_stock_suc_select ON public.inventario_stock_sucursal
  FOR SELECT TO authenticated, anon
  USING (
    public.is_admin_global()
    OR (
      public.is_admin_sucursal()
      AND public.current_sucursal_id() IS NOT NULL
      AND sucursal_id = public.current_sucursal_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.sucursales s
      WHERE s.id = inventario_stock_sucursal.sucursal_id
        AND s.activa = true
    )
  );

DROP POLICY IF EXISTS inv_stock_suc_update_branch ON public.inventario_stock_sucursal;
CREATE POLICY inv_stock_suc_update_branch ON public.inventario_stock_sucursal
  FOR UPDATE TO authenticated
  USING (public.is_admin_global() OR sucursal_id = public.current_sucursal_id())
  WITH CHECK (public.is_admin_global() OR sucursal_id = public.current_sucursal_id());

DROP POLICY IF EXISTS inv_stock_suc_insert ON public.inventario_stock_sucursal;
CREATE POLICY inv_stock_suc_insert ON public.inventario_stock_sucursal
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_global() OR sucursal_id = public.current_sucursal_id());

GRANT SELECT ON public.sucursales TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.inventario_stock_sucursal TO authenticated;
GRANT SELECT ON public.inventario_stock_sucursal TO anon;

-- Clientes: sucursal ve catálogo completo (solo lectura en app; CRUD vía is_staff_or_admin)
DROP POLICY IF EXISTS clientes_sucursal_select_own ON public.clientes;
CREATE POLICY clientes_sucursal_select_own ON public.clientes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_global()
    OR public.is_staff_or_admin() AND NOT public.is_admin_sucursal()
    OR public.is_admin_sucursal()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS empleados_sucursal_select ON public.empleados;
CREATE POLICY empleados_sucursal_select ON public.empleados
  FOR SELECT TO authenticated
  USING (public.is_admin_sucursal());

-- Sucursal: crear y editar solo clientes de su local
CREATE OR REPLACE FUNCTION public.tg_set_creado_en_sucursal_on_branch_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_sucursal() AND public.current_sucursal_id() IS NOT NULL THEN
    IF NEW.creado_en_sucursal_id IS NULL THEN
      NEW.creado_en_sucursal_id := public.current_sucursal_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_set_sucursal ON public.clientes;
CREATE TRIGGER trg_clientes_set_sucursal
  BEFORE INSERT ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_creado_en_sucursal_on_branch_insert();

GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;

DROP POLICY IF EXISTS clientes_sucursal_insert ON public.clientes;
CREATE POLICY clientes_sucursal_insert ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(creado_en_sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS clientes_sucursal_update_own ON public.clientes;
CREATE POLICY clientes_sucursal_update_own ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND creado_en_sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND creado_en_sucursal_id = public.current_sucursal_id()
  );

-- Ventas + caja + inventario catálogo para admin_sucursal (Vender)
DROP POLICY IF EXISTS ventas_sucursal_select ON public.ventas;
CREATE POLICY ventas_sucursal_select ON public.ventas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS ventas_sucursal_insert ON public.ventas;
CREATE POLICY ventas_sucursal_insert ON public.ventas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
    AND (
      caja_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.cajas c
        WHERE c.id = caja_id
          AND c.sucursal_id = public.current_sucursal_id()
      )
    )
  );

DROP POLICY IF EXISTS ventas_sucursal_update ON public.ventas;
CREATE POLICY ventas_sucursal_update ON public.ventas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

-- Cajas: sucursal abre/cierra y consulta su caja
CREATE OR REPLACE FUNCTION public.tg_set_sucursal_id_on_branch_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_sucursal() AND public.current_sucursal_id() IS NOT NULL THEN
    IF NEW.sucursal_id IS NULL THEN
      NEW.sucursal_id := public.current_sucursal_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cajas_set_sucursal ON public.cajas;
CREATE TRIGGER trg_cajas_set_sucursal
  BEFORE INSERT ON public.cajas
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_sucursal_id_on_branch_insert();

DROP TRIGGER IF EXISTS trg_ventas_set_sucursal ON public.ventas;
CREATE TRIGGER trg_ventas_set_sucursal
  BEFORE INSERT ON public.ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_sucursal_id_on_branch_insert();

DROP POLICY IF EXISTS cajas_sucursal_select ON public.cajas;
CREATE POLICY cajas_sucursal_select ON public.cajas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS cajas_sucursal_insert ON public.cajas;
CREATE POLICY cajas_sucursal_insert ON public.cajas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS cajas_sucursal_update ON public.cajas;
CREATE POLICY cajas_sucursal_update ON public.cajas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS movimientos_caja_sucursal_select ON public.movimientos_caja;
CREATE POLICY movimientos_caja_sucursal_select ON public.movimientos_caja
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cajas c
      WHERE c.id = movimientos_caja.caja_id
        AND c.sucursal_id = public.current_sucursal_id()
    )
  );

DROP POLICY IF EXISTS movimientos_caja_sucursal_insert ON public.movimientos_caja;
CREATE POLICY movimientos_caja_sucursal_insert ON public.movimientos_caja
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cajas c
      WHERE c.id = caja_id
        AND c.sucursal_id = public.current_sucursal_id()
    )
  );

DROP POLICY IF EXISTS movimientos_caja_sucursal_update ON public.movimientos_caja;
CREATE POLICY movimientos_caja_sucursal_update ON public.movimientos_caja
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cajas c
      WHERE c.id = movimientos_caja.caja_id
        AND c.sucursal_id = public.current_sucursal_id()
    )
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cajas c
      WHERE c.id = caja_id
        AND c.sucursal_id = public.current_sucursal_id()
    )
  );

DROP POLICY IF EXISTS inventario_sucursal_select ON public.inventario;
CREATE POLICY inventario_sucursal_select ON public.inventario
  FOR SELECT TO authenticated
  USING (public.is_admin_sucursal());

-- Pedidos tienda: sucursal gestiona pedidos de su local
CREATE OR REPLACE FUNCTION public.salon_pedidos_inbox(p_limit integer DEFAULT 500)
RETURNS SETOF public.ecommerce_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.ecommerce_orders o
  WHERE
    public.is_admin_global()
    OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
    OR (
      public.is_admin_sucursal()
      AND public.current_sucursal_id() IS NOT NULL
      AND o.sucursal_id = public.current_sucursal_id()
    )
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 1000));
$$;

REVOKE ALL ON FUNCTION public.salon_pedidos_inbox(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_pedidos_inbox(integer) TO authenticated;

DROP POLICY IF EXISTS ecommerce_orders_sucursal_select ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_sucursal_select ON public.ecommerce_orders
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS ecommerce_orders_sucursal_update ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_sucursal_update ON public.ecommerce_orders
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS ecommerce_order_items_sucursal_select ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_sucursal_select ON public.ecommerce_order_items
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ecommerce_orders o
      WHERE o.id = ecommerce_order_items.order_id
        AND o.sucursal_id = public.current_sucursal_id()
    )
  );

DROP POLICY IF EXISTS ecommerce_order_items_sucursal_update ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_sucursal_update ON public.ecommerce_order_items
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ecommerce_orders o
      WHERE o.id = ecommerce_order_items.order_id
        AND o.sucursal_id = public.current_sucursal_id()
    )
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ecommerce_orders o
      WHERE o.id = order_id
        AND o.sucursal_id = public.current_sucursal_id()
    )
  );

-- Nota: is_staff_or_admin() debe seguir permitiendo admin global.
-- Si clientes_role_select choca, mantener ambas políticas PERMISSIVE (OR).
