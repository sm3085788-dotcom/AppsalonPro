import { db, supabase, listGiftCardsStaff, listGiftCardActivationCodesStaff, searchGiftCardsStaff } from '@appsalon/shared-config';
import { getBasureroEntries, deleteBasureroEntryById } from './salonBasurero';
import { loadReportes, deleteReporteById } from './salonReportesStorage';
import { deleteModuleItemWithBasurero } from './salonDeleteFlow';
import { scopePanelRows, basureroEntryMatchesScope } from './controlPanelScope';

function mapRows(rows, labelKey, subKeys = []) {
  return (rows || []).slice(0, 15).map((r) => ({
    id: r.id,
    label: String(r[labelKey] || r.nombre || r.id || '—').slice(0, 120),
    sub: subKeys.map((k) => r[k]).filter(Boolean).join(' · ').slice(0, 160) || String(r.id || '').slice(0, 8),
  }));
}

function mapVentasRows(rows, limit = 25) {
  return (rows || []).slice(0, limit).map((r) => ({
    id: r.id,
    label: r.no_factura || `Venta ${String(r.id).slice(0, 8)}`,
    sub: [
      r.cliente_nombre || r.cliente?.nombre,
      r.total != null ? `Q${Number(r.total).toFixed(2)}` : null,
      r.fecha ? new Date(r.fecha).toLocaleString('es-GT', { day: '2-digit', month: 'numeric' }) : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
}

async function listVentasForPanel(query = '', scope = {}) {
  const q = String(query || '').trim();
  const ql = q.toLowerCase();
  if (q.length >= 2) {
    const { data, error } = await supabase
      .from('ventas')
      .select('id, no_factura, cliente_nombre, total, fecha')
      .or(`no_factura.ilike.%${q}%,cliente_nombre.ilike.%${q}%`)
      .order('fecha', { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return mapVentasRows(scopePanelRows(data, 'papeleria', scope));
  }
  const { data, error } = await db.ventas.getAll();
  if (error) throw new Error(error.message);
  let list = data || [];
  if (q.length >= 1) {
    list = list.filter((r) => {
      const blob = [r.no_factura, r.cliente_nombre, r.cliente?.nombre, r.profesional]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(ql);
    });
  }
  list = scopePanelRows(list, 'papeleria', scope);
  return mapVentasRows(list, 30);
}

function mapGiftCardRows(cards = [], codes = []) {
  const cardRows = cards.slice(0, 20).map((r) => ({
    id: `card:${r.id}`,
    label: r.codigo || 'Tarjeta regalo',
    sub: [r.para_nombre, r.estado, r.saldo_actual != null ? `Q${Number(r.saldo_actual).toFixed(2)}` : null]
      .filter(Boolean)
      .join(' · '),
  }));
  const codeRows = codes.slice(0, 15).map((r) => ({
    id: `code:${r.id}`,
    label: r.codigo_activacion || 'Código ACT',
    sub: [r.para_nombre, r.status, r.monto != null ? `Q${Number(r.monto).toFixed(2)}` : null]
      .filter(Boolean)
      .join(' · '),
  }));
  return [...cardRows, ...codeRows];
}

async function listTarjetasRegaloItems(query = '', scope = {}) {
  const q = String(query || '').trim();
  if (q.length >= 3) {
    const res = await searchGiftCardsStaff(q, 20);
    if (!res.ok) throw new Error(res.error || 'Error al buscar tarjetas.');
    return mapGiftCardRows(res.results || [], []);
  }
  const [cardsRes, codesRes] = await Promise.all([
    listGiftCardsStaff(30),
    listGiftCardActivationCodesStaff(15),
  ]);
  if (!cardsRes.ok && !codesRes.ok) {
    throw new Error(cardsRes.error || codesRes.error || 'Error al listar tarjetas.');
  }
  let cards = cardsRes.ok ? cardsRes.cards || [] : [];
  if (q.length >= 1) {
    const ql = q.toLowerCase();
    cards = cards.filter((r) =>
      [r.codigo, r.para_nombre, r.de_nombre, r.estado].filter(Boolean).join(' ').toLowerCase().includes(ql),
    );
  }
  cards = scopePanelRows(cards, 'tarjetas_regalo', scope);
  const codes = codesRes.ok ? codesRes.codes || [] : [];
  return mapGiftCardRows(cards, codes);
}

export async function listModuleItems(actionId, query = '', scope = {}) {
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
    list = list.filter((e) => basureroEntryMatchesScope(e, scope));
    if (q.length >= 2) {
      list = list.filter((e) => [e.title, e.source, e.summary].join(' ').toLowerCase().includes(ql));
    }
    return list.slice(0, 20).map((e) => ({
      id: e.id,
      label: e.title || e.source || 'Copia local',
      sub: e.summary || e.deletedAt || '',
    }));
  }

  if (actionId === 'papeleria') {
    return listVentasForPanel(q, scope);
  }

  if (actionId === 'tarjetas_regalo') {
    return listTarjetasRegaloItems(q, scope);
  }

  if (moduleListsOnExpand(actionId) && q.length < 2) {
    return listModuleItemsExpanded(actionId, scope);
  }

  if (q.length < 2) return [];
  return searchModuleItems(actionId, q, scope);
}

async function listModuleItemsExpanded(actionId, scope = {}) {
  switch (actionId) {
    case 'papeleria':
      return listVentasForPanel('', scope);
    case 'clientes': {
      const { data, error } = await db.clientes.getAll();
      if (error) throw new Error(error.message);
      return mapRows(data, 'nombre', ['telefono', 'email']).slice(0, 25);
    }
    case 'empleados': {
      const { data, error } = await db.empleados.getAll();
      if (error) throw new Error(error.message);
      return mapRows(data, 'nombre', ['rol', 'telefono']).slice(0, 25);
    }
    case 'inventario': {
      const { data, error } = await db.inventario.getAll();
      if (error) throw new Error(error.message);
      return mapRows(data, 'nombre', ['categoria', 'barcode']).slice(0, 25);
    }
    case 'incidentes': {
      const { data, error } = await db.incidentes.getAll();
      if (error) throw new Error(error.message);
      return mapRows(data, 'folio', ['tipo_incidente', 'estado']).slice(0, 25);
    }
    case 'citas': {
      const { data, error } = await db.citas.getAll();
      if (error) throw new Error(error.message);
      return scopePanelRows(data || [], 'citas', scope).slice(0, 25).map((r) => ({
        id: r.id,
        label: `${r.cliente?.nombre || r.cliente_nombre || 'Cliente'} · ${r.servicio || 'Cita'}`,
        sub: r.fecha_hora || r.estado || '',
      }));
    }
    case 'proveedores': {
      const { data, error } = await db.proveedores.getAll();
      if (error) throw new Error(error.message);
      return (data || []).slice(0, 25).map((r) => ({
        id: r.id,
        label: r.nombre_compania || 'Proveedor',
        sub: [r.telefono, r.email].filter(Boolean).join(' · '),
      }));
    }
    case 'tarjetas_regalo': {
      return listTarjetasRegaloItems('', scope);
    }
    case 'sucursales': {
      const { data, error } = await db.sucursales.listActivas();
      if (error) throw new Error(error.message);
      let rows = data || [];
      if (scope?.sucursalId) {
        rows = rows.filter((r) => String(r.id) === String(scope.sucursalId));
      }
      return rows.slice(0, 25).map((r) => ({
        id: r.id,
        label: r.nombre || r.codigo || 'Sucursal',
        sub: [r.codigo, r.direccion].filter(Boolean).join(' · '),
      }));
    }
    case 'unete_equipo': {
      const { data, error } = await db.uneteEquipo.listSolicitudes(null);
      if (error) throw new Error(error.message);
      return (data || []).slice(0, 25).map((r) => ({
        id: r.id,
        label: r.cliente?.nombre || 'Solicitud',
        sub: [r.estado, r.rama_destacada, r.created_at ? new Date(r.created_at).toLocaleDateString('es-GT') : null]
          .filter(Boolean)
          .join(' · '),
      }));
    }
    default:
      return [];
  }
}

export async function searchModuleItems(actionId, query, scope = {}) {
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
    case 'papeleria':
    case 'ventas_chain':
      return listVentasForPanel(q, scope);
    case 'citas': {
      const { data, error } = await db.citas.getAll();
      if (error) throw new Error(error.message);
      const ql = q.toLowerCase();
      return scopePanelRows(data || [], 'citas', scope)
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
    case 'tarjetas_regalo':
      return listTarjetasRegaloItems(q, scope);
    case 'sucursales': {
      const { data, error } = await db.sucursales.listActivas();
      if (error) throw new Error(error.message);
      const ql = q.toLowerCase();
      let rows = data || [];
      if (scope?.sucursalId) {
        rows = rows.filter((r) => String(r.id) === String(scope.sucursalId));
      }
      return rows
        .filter((r) =>
          [r.nombre, r.codigo, r.direccion, r.telefono].filter(Boolean).join(' ').toLowerCase().includes(ql),
        )
        .slice(0, 15)
        .map((r) => ({
          id: r.id,
          label: r.nombre || r.codigo || 'Sucursal',
          sub: [r.codigo, r.direccion].filter(Boolean).join(' · '),
        }));
    }
    case 'unete_equipo': {
      const { data, error } = await db.uneteEquipo.listSolicitudes(null);
      if (error) throw new Error(error.message);
      const ql = q.toLowerCase();
      return (data || [])
        .filter((r) => {
          const blob = [
            r.cliente?.nombre,
            r.estado,
            r.rama_destacada,
            ...(Array.isArray(r.experiencia_ramas) ? r.experiencia_ramas : []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return blob.includes(ql);
        })
        .slice(0, 15)
        .map((r) => ({
          id: r.id,
          label: r.cliente?.nombre || 'Solicitud',
          sub: [r.estado, r.rama_destacada].filter(Boolean).join(' · '),
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
    case 'reportes_local':
      return listModuleItems('reportes_local', q, scope);
    case 'basurero_local':
      return listModuleItems('basurero_local', q, scope);
    default:
      return [];
  }
}

export async function deleteModuleItem(actionId, id) {
  if (actionId === 'reportes_local') {
    const n = await deleteReporteById(id);
    return n > 0 ? null : { message: 'Reporte no encontrado en este dispositivo.' };
  }
  if (actionId === 'basurero_local') {
    const n = await deleteBasureroEntryById(id);
    return n > 0 ? null : { message: 'Entrada no encontrada.' };
  }
  return deleteModuleItemWithBasurero(actionId, id);
}

export function moduleSupportsSearch(actionId) {
  return [
    'clientes',
    'empleados',
    'inventario',
    'papeleria',
    'ventas_chain',
    'citas',
    'incidentes',
    'proveedores',
    'metas',
    'caja_chain',
    'reportes_local',
    'basurero_local',
    'tarjetas_regalo',
    'sucursales',
    'unete_equipo',
  ].includes(actionId);
}

export function moduleListsOnExpand(actionId) {
  return [
    'reportes_local',
    'basurero_local',
    'papeleria',
    'clientes',
    'empleados',
    'inventario',
    'incidentes',
    'citas',
    'proveedores',
    'tarjetas_regalo',
    'sucursales',
    'unete_equipo',
  ].includes(actionId);
}
