import { db, supabase } from '@appsalon/shared-config';
import { getBasureroEntries, deleteBasureroEntryById } from './salonBasurero';
import { loadReportes, deleteReporteById } from './salonReportesStorage';

function mapRows(rows, labelKey, subKeys = []) {
  return (rows || []).slice(0, 15).map((r) => ({
    id: r.id,
    label: String(r[labelKey] || r.nombre || r.id || '—').slice(0, 120),
    sub: subKeys.map((k) => r[k]).filter(Boolean).join(' · ').slice(0, 160) || String(r.id || '').slice(0, 8),
  }));
}

export async function listModuleItems(actionId, query = '') {
  const q = String(query || '').trim();
  const ql = q.toLowerCase();

  if (actionId === 'reportes_local') {
    let list = await loadReportes();
    if (q.length >= 2) {
      list = list.filter((r) => [r.typeLabel, r.summary, r.id].join(' ').toLowerCase().includes(ql));
    }
    return list.slice(0, 20).map((r) => ({
      id: r.id,
      label: r.typeLabel || 'Reporte',
      sub: r.summary || new Date(r.generatedAt || '').toLocaleString('es-GT'),
    }));
  }

  if (actionId === 'basurero_local') {
    let list = await getBasureroEntries();
    if (q.length >= 2) {
      list = list.filter((e) => [e.title, e.source, e.summary].join(' ').toLowerCase().includes(ql));
    }
    return list.slice(0, 20).map((e) => ({
      id: e.id,
      label: e.title || e.source || 'Copia local',
      sub: e.summary || e.deletedAt || '',
    }));
  }

  if (q.length < 2) return [];
  return searchModuleItems(actionId, q);
}

export async function searchModuleItems(actionId, query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  switch (actionId) {
    case 'clientes': {
      const { data, error } = await db.clientes.search(q);
      if (error) throw new Error(error.message);
      return mapRows(data, 'nombre', ['telefono', 'email']);
    }
    case 'empleados': {
      const { data, error } = await db.empleados.search(q);
      if (error) throw new Error(error.message);
      return mapRows(data, 'nombre', ['rol', 'telefono']);
    }
    case 'inventario': {
      const { data, error } = await db.inventario.search(q);
      if (error) throw new Error(error.message);
      return mapRows(data, 'nombre', ['categoria', 'barcode']);
    }
    case 'ventas_chain': {
      const { data, error } = await supabase
        .from('ventas')
        .select('id, no_factura, cliente_nombre, total, fecha')
        .or(`no_factura.ilike.%${q}%,cliente_nombre.ilike.%${q}%`)
        .order('fecha', { ascending: false })
        .limit(15);
      if (error) throw new Error(error.message);
      return (data || []).map((r) => ({
        id: r.id,
        label: r.no_factura || `Venta ${String(r.id).slice(0, 8)}`,
        sub: [r.cliente_nombre, r.total != null ? `Q${Number(r.total).toFixed(2)}` : null].filter(Boolean).join(' · '),
      }));
    }
    case 'citas': {
      const { data, error } = await db.citas.getAll();
      if (error) throw new Error(error.message);
      const ql = q.toLowerCase();
      return (data || [])
        .filter((r) => {
          const blob = [r.cliente?.nombre, r.cliente_nombre, r.servicio, r.estado, r.notas]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return blob.includes(ql);
        })
        .slice(0, 15)
        .map((r) => ({
          id: r.id,
          label: `${r.cliente?.nombre || r.cliente_nombre || 'Cliente'} · ${r.servicio || 'Cita'}`,
          sub: r.fecha_hora || r.estado || '',
        }));
    }
    case 'incidentes': {
      const { data, error } = await db.incidentes.search(q);
      if (error) throw new Error(error.message);
      return mapRows(data, 'folio', ['tipo_incidente', 'estado']);
    }
    case 'proveedores': {
      const { data, error } = await db.proveedores.getAll();
      if (error) throw new Error(error.message);
      const ql = q.toLowerCase();
      return (data || [])
        .filter((r) =>
          [r.nombre_compania, r.telefono, r.email, r.nombre_agente].filter(Boolean).join(' ').toLowerCase().includes(ql),
        )
        .slice(0, 15)
        .map((r) => ({
          id: r.id,
          label: r.nombre_compania || 'Proveedor',
          sub: [r.telefono, r.email].filter(Boolean).join(' · '),
        }));
    }
    case 'metas': {
      const { data, error } = await db.metas.getAll();
      if (error) throw new Error(error.message);
      const ql = q.toLowerCase();
      return (data || [])
        .filter((r) => String(r.titulo || r.nombre || r.descripcion || '').toLowerCase().includes(ql))
        .slice(0, 15)
        .map((r) => ({
          id: r.id,
          label: r.titulo || r.nombre || 'Meta',
          sub: r.descripcion || '',
        }));
    }
    case 'caja_chain': {
      const { data, error } = await db.cajas.getAll();
      if (error) throw new Error(error.message);
      const ql = q.toLowerCase();
      return (data || [])
        .filter((r) =>
          [r.responsable, r.responsable_apertura, r.responsable_cierre, r.estado]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(ql),
        )
        .slice(0, 15)
        .map((r) => ({
          id: r.id,
          label: `Caja · ${r.responsable_apertura || r.responsable || '—'}`,
          sub: `${r.estado || '—'} · ${r.fecha_apertura || ''}`,
        }));
    }
    case 'reportes_local': {
      return listModuleItems('reportes_local', q);
    }
    case 'basurero_local': {
      return listModuleItems('basurero_local', q);
    }
    default:
      return [];
  }
}

export async function deleteModuleItem(actionId, id) {
  switch (actionId) {
    case 'clientes':
      return (await db.clientes.delete(id)).error;
    case 'empleados':
      return (await db.empleados.delete(id)).error;
    case 'inventario':
      return (await db.inventario.delete(id)).error;
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
    case 'reportes_local': {
      const n = await deleteReporteById(id);
      return n > 0 ? null : { message: 'Reporte no encontrado en este dispositivo.' };
    }
    case 'basurero_local': {
      const n = await deleteBasureroEntryById(id);
      return n > 0 ? null : { message: 'Entrada no encontrada.' };
    }
    default:
      return { message: 'Este módulo no admite borrado puntual desde el panel.' };
  }
}

export function moduleSupportsSearch(actionId) {
  return [
    'clientes',
    'empleados',
    'inventario',
    'ventas_chain',
    'citas',
    'incidentes',
    'proveedores',
    'metas',
    'caja_chain',
    'reportes_local',
    'basurero_local',
  ].includes(actionId);
}

export function moduleListsOnExpand(actionId) {
  return actionId === 'reportes_local' || actionId === 'basurero_local';
}
