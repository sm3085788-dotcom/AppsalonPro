import { db, inventarioSearchSubtitle, searchGiftCardsStaff, looksLikeGiftCardQuery, clienteOrigenLabel } from '@appsalon/shared-config';

export const SALON_SEARCH_MIN_LEN = 2;
const PER_SOURCE = 8;

/** Limpia texto para filtros ilike de PostgREST. */
export function sanitizeSalonSearchQuery(raw) {
  return String(raw || '')
    .trim()
    .replace(/[%(),]/g, '')
    .slice(0, 80);
}

function clip(s, max = 72) {
  const t = String(s || '').trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function push(rows, item) {
  if (!item?.title) return;
  rows.push(item);
}

function formatFecha(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function safeSearch(fn) {
  try {
    const { data, error } = await fn();
    if (error) return [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * @typedef {Object} SalonSearchHit
 * @property {string} id
 * @property {string} moduleId
 * @property {string} category
 * @property {string} title
 * @property {string} subtitle
 * @property {string} [giftCardCodigo]
 */

/**
 * Busca en todas las fuentes del salón y devuelve resultados unificados.
 * @param {string} rawQuery
 * @returns {Promise<{ hits: SalonSearchHit[], query: string }>}
 */
export async function runSalonGlobalSearch(rawQuery) {
  const query = sanitizeSalonSearchQuery(rawQuery);
  if (query.length < SALON_SEARCH_MIN_LEN) {
    return { hits: [], query };
  }

  const limit = PER_SOURCE;
  const giftCardSearchPromise = looksLikeGiftCardQuery(query)
    ? searchGiftCardsStaff(query, limit)
    : Promise.resolve({ ok: true, results: [] });

  const [
    clientes,
    empleados,
    ventas,
    inventario,
    incidentes,
    pedidos,
    mensajes,
    marketing,
    proveedores,
    citas,
    metas,
    cajas,
    servicios,
    devoluciones,
    giftCardRes,
  ] = await Promise.all([
    safeSearch(() => db.clientes.search(query)),
    safeSearch(() => db.empleados.search(query)),
    safeSearch(() => db.ventas.search(query, limit)),
    safeSearch(() => db.inventario.search(query)),
    safeSearch(() => db.incidentes.search(query)),
    safeSearch(() => db.orders.search(query)),
    safeSearch(() => db.marketingDirectMessages.search(query)),
    safeSearch(() => db.marketingPosts.search(query)),
    safeSearch(() => db.proveedores.search(query, limit)),
    safeSearch(() => db.citas.search(query, limit)),
    safeSearch(() => db.metas.search(query, limit)),
    safeSearch(() => db.cajas.search(query, limit)),
    safeSearch(() => db.servicios.search(query, limit)),
    safeSearch(() => db.devoluciones.search(query)),
    giftCardSearchPromise,
  ]);

  const giftCards = giftCardRes?.ok && Array.isArray(giftCardRes.results) ? giftCardRes.results : [];

  /** @type {SalonSearchHit[]} */
  const hits = [];

  for (const c of clientes.slice(0, limit)) {
    const origen = clienteOrigenLabel(c);
    const contact = [c.telefono, c.email, c.categoria].filter(Boolean).join(' · ');
    const subtitle = contact
      ? origen && origen !== 'Manual'
        ? `${contact} · ${origen}`
        : contact
      : origen || 'Sin contacto';
    push(hits, {
      id: `cliente-${c.id}`,
      moduleId: 'clients',
      category: 'Clientes',
      title: c.nombre || 'Cliente',
      subtitle,
    });
  }

  for (const gc of giftCards.slice(0, limit)) {
    const saldoTxt =
      gc.kind === 'activation'
        ? formatQ(gc.monto)
        : `${formatQ(gc.saldo)} saldo`;
    push(hits, {
      id: `gc-${gc.kind}-${gc.codigo}`,
      moduleId: 'tarjetas_regalo',
      category: 'Tarjetas regalo',
      title: gc.codigo,
      subtitle: [
        saldoTxt,
        gc.para_nombre,
        gc.cliente_vinculado_nombre ? `Vinculada: ${gc.cliente_vinculado_nombre}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      giftCardCodigo: gc.codigo,
    });
  }

  for (const e of empleados.slice(0, limit)) {
    push(hits, {
      id: `empleado-${e.id}`,
      moduleId: 'empleados',
      category: 'Empleados',
      title: e.nombre || 'Empleado',
      subtitle: [e.rol, e.telefono, e.email].filter(Boolean).join(' · '),
    });
  }

  for (const v of ventas.slice(0, limit)) {
    const folio = v.no_factura?.trim() || `Venta ${String(v.id || '').slice(0, 8)}`;
    push(hits, {
      id: `venta-${v.id}`,
      moduleId: 'papeleria',
      category: 'Facturas / ventas',
      title: folio,
      subtitle: [
        v.cliente?.nombre || v.cliente_nombre,
        v.vendedor?.nombre || v.profesional,
        formatQ(v.total ?? v.monto),
        v.metodo_pago,
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  for (const p of inventario.slice(0, limit)) {
    push(hits, {
      id: `inv-${p.id}`,
      moduleId: 'inventory',
      category: 'Inventario',
      title: p.nombre || 'Artículo',
      subtitle: inventarioSearchSubtitle(p) || p.categoria || '',
    });
  }

  for (const i of incidentes.slice(0, limit)) {
    push(hits, {
      id: `inc-${i.id}`,
      moduleId: 'incidentes',
      category: 'Incidentes',
      title: i.folio || `Reporte ${String(i.id || '').slice(0, 8)}`,
      subtitle: [i.tipo_incidente, i.cliente_nombre, i.empleado_nombre, i.estado]
        .filter(Boolean)
        .join(' · '),
    });
  }

  for (const o of pedidos.slice(0, limit)) {
    push(hits, {
      id: `pedido-${o.id}`,
      moduleId: 'pedidos',
      category: 'Pedidos',
      title: o.tracking_code || `Pedido ${String(o.id || '').slice(0, 8)}`,
      subtitle: [o.customer_name, o.customer_phone, o.status].filter(Boolean).join(' · '),
    });
  }

  for (const m of mensajes.slice(0, limit)) {
    push(hits, {
      id: `msg-${m.id}`,
      moduleId: 'mensajes',
      category: 'Mensajes',
      title: m.client_name || m.cliente?.nombre || 'Mensaje',
      subtitle: clip(m.content, 64) || m.client_phone || '',
    });
  }

  for (const post of marketing.slice(0, limit)) {
    push(hits, {
      id: `mkt-${post.id}`,
      moduleId: 'marketing',
      category: 'Marketing',
      title: post.title || 'Publicación',
      subtitle: [post.author_name, clip(post.body, 48)].filter(Boolean).join(' · '),
    });
  }

  for (const pr of proveedores.slice(0, limit)) {
    push(hits, {
      id: `prov-${pr.id}`,
      moduleId: 'proveedores',
      category: 'Proveedores',
      title: pr.nombre_compania || 'Proveedor',
      subtitle: [pr.nit, pr.nombre_agente, pr.telefono].filter(Boolean).join(' · '),
    });
  }

  for (const ci of citas.slice(0, limit)) {
    push(hits, {
      id: `cita-${ci.id}`,
      moduleId: 'agenda',
      category: 'Agenda / citas',
      title: ci.servicio || 'Cita',
      subtitle: [
        ci.cliente?.nombre,
        ci.empleado?.nombre,
        ci.estado,
        formatFecha(ci.fecha_hora),
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  for (const me of metas.slice(0, limit)) {
    push(hits, {
      id: `meta-${me.id}`,
      moduleId: 'goals',
      category: 'Metas',
      title: me.titulo || 'Meta',
      subtitle: [me.tipo, me.periodo, me.asignado_a?.nombre].filter(Boolean).join(' · '),
    });
  }

  for (const cj of cajas.slice(0, limit)) {
    push(hits, {
      id: `caja-${cj.id}`,
      moduleId: 'cajas',
      category: 'Caja',
      title: `Turno ${cj.estado || '—'}`,
      subtitle: [
        cj.responsable_apertura || cj.responsable,
        cj.responsable_cierre,
        formatFecha(cj.fecha_apertura),
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  for (const s of servicios.slice(0, limit)) {
    push(hits, {
      id: `svc-${s.id}`,
      moduleId: 'agenda',
      category: 'Servicios',
      title: s.nombre || 'Servicio',
      subtitle: [formatQ(s.precio), s.duracion_minutos ? `${s.duracion_minutos} min` : null]
        .filter(Boolean)
        .join(' · '),
    });
  }

  for (const d of devoluciones.slice(0, limit)) {
    push(hits, {
      id: `dev-${d.id}`,
      moduleId: 'papeleria',
      category: 'Devoluciones',
      title: d.no_factura || d.venta?.no_factura || 'Devolución',
      subtitle: [d.motivo, d.responsable, d.producto?.nombre].filter(Boolean).join(' · '),
    });
  }

  return { hits, query };
}
