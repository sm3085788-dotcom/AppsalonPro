import { db, supabase } from '@appsalon/shared-config';
import { recordSalonDeletion } from './salonBasurero';
import { controlPanelActionToSource } from './salonBasureroSources';

const RELATION_KEYS = ['cliente', 'vendedor', 'empleado', 'producto', 'venta', 'asignado_a', 'items_order'];

export function stripSnapshotRelations(row) {
  if (!row || typeof row !== 'object') return row;
  const s = { ...row };
  for (const k of RELATION_KEYS) delete s[k];
  return s;
}

export function buildDeletionMeta(source, row) {
  const snap = stripSnapshotRelations(row);
  const src = source === 'papeleria' ? 'ventas' : source;

  switch (src) {
    case 'ventas':
      return {
        source: 'ventas',
        title: snap.no_factura || `Venta ${String(snap.id || '').slice(0, 8)}`,
        summary: [snap.cliente_nombre, snap.total != null ? `Q${Number(snap.total).toFixed(2)}` : null]
          .filter(Boolean)
          .join(' · '),
        snapshot: snap,
      };
    case 'clientes':
      return {
        source: 'clientes',
        title: snap.nombre || 'Cliente',
        summary: [snap.telefono, snap.email, snap.categoria].filter(Boolean).join(' · '),
        snapshot: snap,
      };
    case 'empleados':
      return {
        source: 'empleados',
        title: snap.nombre || 'Empleado',
        summary: [snap.rol, snap.telefono, snap.email].filter(Boolean).join(' · '),
        snapshot: snap,
      };
    case 'inventario':
      return {
        source: 'inventario',
        title: snap.nombre || 'Artículo',
        summary: [snap.categoria, snap.barcode].filter(Boolean).join(' · '),
        snapshot: snap,
      };
    case 'proveedores':
      return {
        source: 'proveedores',
        title: snap.nombre_compania || 'Proveedor',
        summary: [snap.nombre_agente, snap.telefono, snap.email].filter(Boolean).join(' · '),
        snapshot: snap,
      };
    case 'marketing_posts': {
      const aud = String(snap.audience || '');
      const kind =
        aud === 'home_hero' ? 'Carrusel hero' : aud === 'home_carousel' ? 'Carrusel publicidad' : 'Tendencias';
      return {
        source: 'marketing_posts',
        title: snap.title || kind,
        summary: `${String(snap.content_type || 'media')} · ${kind}`,
        snapshot: snap,
      };
    }
    case 'incidentes':
      return {
        source: 'incidentes',
        title: snap.folio || snap.tipo_incidente || 'Incidente',
        summary: [snap.tipo_incidente, snap.estado].filter(Boolean).join(' · '),
        snapshot: snap,
      };
    case 'citas':
      return {
        source: 'citas',
        title: `${snap.cliente_nombre || snap.cliente?.nombre || 'Cliente'} · ${snap.servicio || 'Cita'}`,
        summary: [snap.fecha_hora, snap.estado].filter(Boolean).join(' · '),
        snapshot: snap,
      };
    default:
      return {
        source: src,
        title: snap.nombre || snap.titulo || snap.title || 'Registro',
        summary: String(snap.id || '').slice(0, 12),
        snapshot: snap,
      };
  }
}

/**
 * Borra en servidor y guarda copia en basurero local.
 */
export async function deleteWithBasurero({ source, title, summary, snapshot, deleteFn }) {
  const result = await deleteFn();
  const err = result?.error ?? (result && typeof result === 'object' && result.message ? result : null);
  if (err) {
    const msg = err.message || String(err);
    return { ok: false, error: msg };
  }
  await recordSalonDeletion({
    source: source === 'papeleria' ? 'ventas' : source,
    title,
    summary,
    snapshot: stripSnapshotRelations(snapshot),
  });
  return { ok: true, error: null };
}

export async function deleteRowWithBasurero(source, row, deleteFn) {
  const meta = buildDeletionMeta(source, row);
  return deleteWithBasurero({ ...meta, deleteFn });
}

export async function fetchModuleSnapshot(actionId, id) {
  switch (actionId) {
    case 'clientes': {
      const { data, error } = await db.clientes.getById(id);
      if (error) return null;
      return data;
    }
    case 'empleados': {
      const { data, error } = await db.empleados.getById(id);
      if (error) return null;
      return data;
    }
    case 'inventario': {
      const { data, error } = await db.inventario.getById(id);
      if (error) return null;
      return data;
    }
    case 'papeleria':
    case 'ventas_chain': {
      const { data, error } = await db.ventas.getById(id);
      if (error) return null;
      return data;
    }
    case 'citas': {
      const { data, error } = await supabase.from('citas').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    }
    case 'incidentes': {
      const { data, error } = await supabase.from('incidentes').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    }
    case 'proveedores': {
      const { data, error } = await db.proveedores.getById(id);
      if (error) return null;
      return data;
    }
    case 'metas': {
      const { data, error } = await supabase.from('metas').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    }
    case 'caja_chain': {
      const { data, error } = await supabase.from('cajas').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    }
    default:
      return null;
  }
}

export async function deleteModuleItemWithBasurero(actionId, id) {
  const snapshot = await fetchModuleSnapshot(actionId, id);
  const rawErr = await rawDeleteModuleItem(actionId, id);
  if (rawErr?.message) return rawErr;
  if (snapshot && !['basurero_local', 'reportes_local'].includes(actionId)) {
    const src = controlPanelActionToSource(actionId);
    const meta = buildDeletionMeta(src, snapshot);
    await recordSalonDeletion(meta);
  }
  return null;
}

async function rawDeleteModuleItem(actionId, id) {
  switch (actionId) {
    case 'clientes':
      return (await db.clientes.delete(id)).error;
    case 'empleados':
      return (await db.empleados.delete(id)).error;
    case 'inventario':
      return (await db.inventario.delete(id)).error;
    case 'papeleria':
    case 'ventas_chain':
      return (await db.ventas.delete(id)).error;
    case 'citas':
      return (await db.citas.delete(id)).error;
    case 'incidentes':
      return (await db.incidentes.delete(id)).error;
    case 'proveedores':
      return (await db.proveedores.delete(id)).error;
    case 'metas':
      return (await db.metas.delete(id)).error;
    case 'caja_chain':
      return (await db.cajas.delete(id)).error;
    default:
      return { message: 'Este módulo no admite borrado puntual desde el panel.' };
  }
}
