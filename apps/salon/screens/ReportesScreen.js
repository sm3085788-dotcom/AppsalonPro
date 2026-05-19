import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, FileText, Printer, Search, X, ChevronRight } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, supabase } from '@appsalon/shared-config';
import { getArticuloTipo } from '../../../shared/config/inventarioMeta.js';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { addReporte, loadReportes, subscribeReportesStorage } from '../services/salonReportesStorage';

const REPORT_TYPES = [
  { id: 'caja', label: 'Caja' },
  { id: 'mensajes', label: 'Mensajes' },
  { id: 'metas', label: 'Metas' },
  { id: 'pedidos', label: 'Pedidos tienda' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'ventas_cliente', label: 'Ventas por cliente' },
  { id: 'empleado_ventas', label: 'Ventas por empleado' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'empleados', label: 'Empleados' },
];

function toStartIso(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function toEndIso(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

function filterByRange(rows, startIso, endIso) {
  const keys = ['created_at', 'creado_a', 'fecha', 'fecha_apertura', 'fecha_hora', 'updated_at'];
  return (rows || []).filter((row) => {
    const raw = keys.map((k) => row?.[k]).find(Boolean);
    if (!raw) return true;
    const t = new Date(raw).getTime();
    return t >= new Date(startIso).getTime() && t <= new Date(endIso).getTime();
  });
}

function sumBy(rows, keys) {
  return (rows || []).reduce((acc, r) => {
    const key = keys.map((k) => r?.[k]).find(Boolean) || 'Sin grupo';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function montoVenta(r) {
  return Number(r?.total ?? r?.monto ?? 0);
}

function enrichPedidoRow(r) {
  return {
    nombre: r?.customer_name || 'Cliente',
    descripcion: `${r?.tracking_code || '—'} · ${r?.payment_method || '—'} · ${r?.status || '—'}`,
    monto: Number(r?.total_amount || 0),
    montoFmt: formatQ(Number(r?.total_amount || 0)),
    fecha: r?.created_at || r?.confirmed_at,
  };
}

function enrichVentaRow(r) {
  const fact = r?.no_factura ?? r?.id ?? '-';
  const cliente = r?.cliente?.nombre || r?.cliente_nombre || 'Cliente';
  const vend = r?.vendedor?.nombre || 'Sin vendedor';
  return {
    ...r,
    nombre: `Fact. ${fact} · ${cliente}`,
    descripcion: `${vend} · Q${montoVenta(r).toFixed(2)}`,
  };
}

function enrichCitaRow(r) {
  const cli = r?.cliente?.nombre || r?.cliente_nombre || 'Cliente';
  const svc = r?.servicio || 'Cita';
  const prof = r?.empleado?.nombre || '—';
  const fh = r?.fecha_hora || r?.fecha || '-';
  return {
    ...r,
    nombre: `${cli} · ${svc}`,
    descripcion: `${r?.estado || '—'} · ${prof}`,
    fecha: fh,
  };
}

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function tipoMovLabel(tipo) {
  const t = String(tipo || '').toLowerCase();
  if (t === 'apertura') return 'Apertura';
  if (t === 'cierre') return 'Cierre';
  if (t === 'ingreso') return 'Ingreso';
  if (t === 'egreso') return 'Egreso';
  return tipo || 'Movimiento';
}

function ventaProductosNombres(v) {
  let items = v?.items;
  if (!items) return '—';
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      return '—';
    }
  }
  if (!Array.isArray(items) || items.length === 0) return '—';
  const nombres = items
    .map((it) => String(it?.nombre || it?.producto || it?.descripcion || '').trim())
    .filter(Boolean);
  return nombres.length ? nombres.join(', ') : '—';
}

async function fetchCajaReport(startIso, endIso) {
  const startDay = startIso.slice(0, 10);
  const endDay = endIso.slice(0, 10);
  const { data: cajas, error: cajasErr } = await db.cajas.getByDateRange(startDay, endDay);
  if (cajasErr) return { rows: [], cajaSessions: [], error: cajasErr, summary: '' };

  const inRange = (caja) => {
    const keys = [caja.creado_a, caja.fecha_cierre, caja.fecha_apertura];
    for (const raw of keys) {
      if (!raw) continue;
      const t = new Date(raw).getTime();
      if (t >= new Date(startIso).getTime() && t <= new Date(endIso).getTime()) return true;
    }
    const fa = caja.fecha_apertura;
    if (fa && fa >= startDay && fa <= endDay) return true;
    return false;
  };

  const cajasFiltradas = (cajas || []).filter(inRange);
  const cajaSessions = [];

  for (const caja of cajasFiltradas) {
    const [{ data: movimientos }, { data: ventas }, { data: cuadre }] = await Promise.all([
      db.cajas.getMovimientos(caja.id),
      db.cajas.getVentas(caja.id),
      db.cajas.calcularCuadre(caja.id),
    ]);
    cajaSessions.push({
      caja,
      movimientos: movimientos || [],
      ventas: ventas || [],
      cuadre: cuadre || null,
    });
  }

  const rows = [];
  let totalVentasMonto = 0;
  let totalMovs = 0;

  for (const session of cajaSessions) {
    const { caja, movimientos, ventas } = session;
    const responsable =
      caja.responsable_apertura || caja.responsable || caja.responsable_cierre || '—';
    rows.push({
      id: `turno-${caja.id}`,
      caja_id: caja.id,
      nombre: `Turno · ${responsable}`,
      descripcion: `Estado: ${caja.estado || '—'} · Apertura ${formatQ(caja.monto_apertura)}${
        caja.monto_cierre != null ? ` · Cierre ${formatQ(caja.monto_cierre)}` : ''
      }`,
      fecha: caja.creado_a || caja.fecha_apertura,
      _section: 'turno',
    });

    for (const m of movimientos) {
      totalMovs += 1;
      const sign = m.tipo === 'egreso' ? '−' : '+';
      rows.push({
        id: m.id,
        caja_id: caja.id,
        nombre: tipoMovLabel(m.tipo),
        descripcion: m.descripcion || '—',
        monto: m.monto,
        montoFmt: `${sign}${formatQ(m.monto)}`,
        fecha: m.fecha,
        _section: 'movimiento',
      });
    }

    for (const v of ventas) {
      totalMovs += 1;
      const monto = Number(v.total ?? v.monto ?? 0);
      totalVentasMonto += monto;
      rows.push({
        id: v.id,
        caja_id: caja.id,
        nombre: v.no_factura || 'Venta',
        descripcion: `${v.cliente_nombre || v.cliente?.nombre || 'Cliente'} · ${v.metodo_pago || '—'}`,
        monto,
        montoFmt: formatQ(monto),
        fecha: v.fecha,
        _section: 'venta',
      });
    }
  }

  const summary = `Turnos: ${cajaSessions.length} · Movimientos/ventas: ${totalMovs} · Total ventas: ${formatQ(
    totalVentasMonto,
  )}`;

  return { rows, cajaSessions, error: null, summary };
}

function enrichInventarioRow(r) {
  const nombre = String(r?.nombre || r?.producto || r?.servicio || '—').trim();
  const categoria = String(r?.categoria || '').trim();
  const barcode = String(r?.barcode || '').trim();
  const tipo = getArticuloTipo(r);
  const precioVenta = Number(r?.precio_venta ?? 0);
  const precioCosto = Number(r?.precio_costo ?? r?.costo ?? 0);
  const stock = Math.max(0, Math.floor(Number(r?.stock_actual ?? 0)));
  const stockMin = Math.max(0, Math.floor(Number(r?.stock_minimo ?? 0)));
  const partesDetalle = [
    tipo === 'servicio' ? 'Servicio' : 'Producto',
    categoria || null,
    barcode ? `Cód. ${barcode}` : null,
    Number.isFinite(precioCosto) && precioCosto > 0 ? `Costo ${formatQ(precioCosto)}` : null,
    stockMin > 0 ? `Mín. ${stockMin}` : null,
  ].filter(Boolean);

  return {
    ...r,
    nombre,
    descripcion: partesDetalle.join(' · ') || '—',
    monto: precioVenta,
    montoFmt: formatQ(precioVenta),
    stock_actual: stock,
    stockFmt: String(stock),
    fecha: r?.updated_at || r?.created_at || r?.creado_a || null,
  };
}

function buildInventarioReportHtml(item) {
  const rows = (item.rows || []).map(enrichInventarioRow);
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${escHtml(r.nombre)}</td>
        <td>${escHtml(r.descripcion)}</td>
        <td style="text-align:right">${escHtml(r.montoFmt || formatQ(r.monto))}</td>
        <td style="text-align:right">${escHtml(r.stockFmt ?? String(r.stock_actual ?? 0))}</td>
        <td>${escHtml(fmtFecha(r.fecha))}</td>
      </tr>`,
    )
    .join('');

  const totalStock = rows.reduce((s, r) => s + Number(r.stock_actual ?? 0), 0);

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:system-ui;padding:16px;color:#222;font-size:11px}
    h1{font-size:18px;margin:0 0 6px}
    .meta{font-size:10px;color:#555;margin:2px 0}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-top:8px}
    th,td{border:1px solid #ccc;padding:4px 6px;vertical-align:top}
    th{text-align:left;background:#f5f5f5}
    td.num{text-align:right}
  </style></head><body>
    <h1>Reporte de inventario</h1>
    <div class="meta">Rango consulta: ${escHtml(new Date(item.fromIso).toLocaleDateString('es-GT'))} – ${escHtml(
      new Date(item.toIso).toLocaleDateString('es-GT'),
    )}</div>
    <div class="meta">${escHtml(item.summary || '')}</div>
    <div class="meta">Artículos: ${rows.length} · Unidades en stock (suma): ${totalStock}</div>
    <table>
      <thead><tr>
        <th>Concepto</th>
        <th>Detalle</th>
        <th class="num">Precio venta</th>
        <th class="num">Stock actual</th>
        <th>Actualizado</th>
      </tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="5">Sin artículos</td></tr>'}</tbody>
    </table>
  </body></html>`;
}

function sanitizeSearchQuery(s) {
  return String(s || '').trim().replace(/[%(),]/g, '').slice(0, 80);
}

function clienteEstaActivo(cli) {
  if (!cli || typeof cli !== 'object') return true;
  if (cli.activo === false || cli.activo === 0) return false;
  const est = String(cli.estado || '').toLowerCase();
  if (['inactivo', 'baja', 'archivado', 'bloqueado'].includes(est)) return false;
  if (String(cli.categoria || '').toLowerCase() === 'inactivo') return false;
  return true;
}

function buildClienteFichaRows(cli) {
  const activo = clienteEstaActivo(cli);
  const pairs = [
    ['Nombre', cli.nombre],
    ['Teléfono', cli.telefono],
    ['Email', cli.email],
    ['Categoría', cli.categoria],
    ['Dirección', cli.direccion],
    ['Notas', cli.notas],
    ['Puntos fidelidad', cli.puntos_fidelidad != null ? String(cli.puntos_fidelidad) : null],
    ['Tipo registro', cli.tipo_registro],
    ['Referido por', cli.referido_por],
    ['Cumpleaños', cli.cumpleanos],
    ['Foto (URL)', cli.photo_url],
    ['ID usuario app', cli.user_id],
    ['Contacto emergencia', cli.contacto_emergencia],
    ['Tel. emergencia', cli.tel_emergencia],
  ];
  const lines = pairs.filter(([, v]) => v != null && String(v).trim() !== '');
  return [
    {
      id: 'cli-bd',
      nombre: '— Registro cliente (BD) —',
      descripcion: `Estado: ${activo ? 'Activo' : 'Inactivo'} · ID ${cli.id}`,
      fecha: cli.created_at || '-',
    },
    ...lines.map(([label, val], i) => ({
      id: `cli-f-${i}`,
      nombre: label,
      descripcion: String(val),
      fecha: cli.updated_at || '-',
    })),
  ];
}

async function fetchRowsByType(typeId, startIso, endIso, options = {}) {
  switch (typeId) {
    case 'caja':
      return fetchCajaReport(startIso, endIso);
    case 'mensajes': {
      const { data, error } = await db.marketingDirectMessages.getByDateRange(startIso, endIso);
      return { rows: data || [], error, summary: `Mensajes en rango: ${(data || []).length}` };
    }
    case 'metas': {
      const { data: meta, error } = await db.metas.getGlobalMontoActiva();
      let rows;
      if (meta) {
        rows = [
          {
            nombre: meta.titulo || 'Meta global',
            descripcion: `Período ${meta.fecha_inicio || '—'} → ${meta.fecha_fin || '—'}`,
            monto: Number(meta.actual || 0),
            montoFmt: `Q${Number(meta.actual || 0).toFixed(2)} / Q${Number(meta.valor_objetivo || 0).toFixed(2)}`,
            fecha: meta.fecha_fin || meta.creado_a,
          },
        ];
      } else {
        const { data: allMetas } = await db.metas.getAll();
        rows = filterByRange(allMetas || [], startIso, endIso).map((m) => ({
          nombre: m.titulo || m.tipo,
          descripcion: `${m.alcance || '—'} · actual ${m.actual} / obj ${m.valor_objetivo}`,
          monto: Number(m.actual || 0),
          montoFmt: `Q${Number(m.actual || 0).toFixed(2)}`,
          fecha: m.creado_a,
        }));
      }
      const pct = meta?.valor_objetivo
        ? Math.min(100, Math.round((Number(meta.actual || 0) / Number(meta.valor_objetivo)) * 100))
        : 0;
      return {
        rows,
        error,
        summary: meta
          ? `Meta global: Q${Number(meta.actual || 0).toFixed(2)} de Q${Number(meta.valor_objetivo || 0).toFixed(2)} (${pct}%)`
          : `Metas en rango: ${rows.length}`,
      };
    }
    case 'pedidos': {
      const { data, error } = await db.orders.getAll();
      const filtered = filterByRange(data || [], startIso, endIso);
      const rows = filtered.map(enrichPedidoRow);
      const totalQ = filtered.reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const pendientes = filtered.filter((r) => r.status === 'pending').length;
      return {
        rows,
        error,
        summary: `Pedidos: ${rows.length} · Q${totalQ.toFixed(2)} · ${pendientes} pendiente(s)`,
      };
    }
    case 'proveedores': {
      const { proveedorNombre } = options;
      let query = supabase
        .from('proveedores')
        .select('*')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false });
      if (proveedorNombre?.trim()) query = query.ilike('nombre_compania', `%${proveedorNombre.trim()}%`);
      const { data, error } = await query;
      const totalCompra = (data || []).reduce(
        (s, r) => s + Number(r?.monto_total_compras || r?.total_compras || r?.monto || 0),
        0,
      );
      return {
        rows: data || [],
        error,
        summary: `Proveedores: ${(data || []).length}. Compras acumuladas: ${totalCompra.toFixed(2)}`,
      };
    }
    case 'clientes': {
      const { data, error } = await db.clientes.getAll();
      let rows = filterByRange(data || [], startIso, endIso);
      if (options.clientesModo === 'nuevos') {
        rows = rows.filter((r) => String(r?.categoria || '').toLowerCase().includes('nuevo'));
      }
      return { rows, error, summary: `Clientes (${options.clientesModo || 'general'}): ${rows.length}` };
    }
    case 'agenda': {
      const { data, error } = await db.citas.getByDateRange(startIso, endIso);
      let rows = data || [];
      const modo = options.agendaModo || 'general';
      const cliSel = options.agendaCliente;

      if (modo === 'por_cliente' && cliSel?.id) {
        const idStr = String(cliSel.id);
        rows = rows.filter(
          (r) => String(r?.cliente_id ?? '') === idStr || String(r?.cliente?.id ?? '') === idStr,
        );
        const visitas = rows.length;
        const desde = new Date(startIso).toLocaleDateString('es-GT');
        const hasta = new Date(endIso).toLocaleDateString('es-GT');
        const header = [
          {
            id: 'agenda-resumen-cliente',
            nombre: `Visitas al salón — ${cliSel.nombre}`,
            descripcion: `${visitas} cita(s) en el rango (${desde} → ${hasta})`,
            fecha: '-',
          },
        ];
        const enriched = rows.map(enrichCitaRow);
        return {
          rows: [...header, ...enriched],
          error,
          summary: `${cliSel.nombre}: ${visitas} visita(s) / citas en el rango`,
        };
      }

      const enriched = rows.map(enrichCitaRow);
      return {
        rows: enriched,
        error,
        summary: `General: ${rows.length} citas en el rango (todos los clientes)`,
      };
    }
    case 'ventas_cliente': {
      const sel = options.clienteVentas;
      if (!sel?.id) {
        return { rows: [], error: null, summary: 'Sin cliente seleccionado' };
      }
      const { data: cliFresh, error: errCli } = await db.clientes.getById(sel.id);
      if (errCli) {
        return { rows: [], error: errCli, summary: '' };
      }
      if (!cliFresh) {
        return { rows: [], error: { message: 'Cliente no encontrado' }, summary: '' };
      }
      const ficha = buildClienteFichaRows(cliFresh);
      if (!clienteEstaActivo(cliFresh)) {
        return {
          rows: [
            ...ficha,
            {
              id: 'cli-inactivo',
              nombre: 'Compras en el rango',
              descripcion: 'Cliente inactivo en sistema — no se incluyen ventas del periodo.',
              fecha: '-',
            },
          ],
          error: null,
          summary: `${cliFresh.nombre}: inactivo — ficha de BD exportada, sin compras del rango.`,
        };
      }
      const { data: ventasData, error: errVen } = await db.ventas.getByRangoFechas(startIso, endIso);
      if (errVen) {
        return { rows: ficha, error: errVen, summary: 'Error al cargar ventas' };
      }
      const raw = (ventasData || []).filter((r) => String(r?.cliente_id ?? '') === String(cliFresh.id));
      const totalMonto = raw.reduce((s, r) => s + montoVenta(r), 0);
      const ventasRows = raw.map(enrichVentaRow);
      const desde = new Date(startIso).toLocaleDateString('es-GT');
      const hasta = new Date(endIso).toLocaleDateString('es-GT');
      const rows = [
        ...ficha,
        {
          id: 'cli-compras-sep',
          nombre: '— Compras (cliente activo) —',
          descripcion: `${desde} → ${hasta} · ${raw.length} ticket(s) · Total Q${totalMonto.toFixed(2)}`,
          fecha: '-',
        },
        ...ventasRows,
      ];
      return {
        rows,
        error: null,
        summary: `${cliFresh.nombre} (activo): ${raw.length} compras · Total Q${totalMonto.toFixed(2)} en el rango`,
      };
    }
    case 'empleado_ventas': {
      const emp = options.vendedorEmpleado;
      if (!emp?.id) {
        return { rows: [], error: null, summary: 'Sin empleado seleccionado' };
      }
      const { data, error } = await db.ventas.getByRangoFechas(startIso, endIso);
      const raw = (data || []).filter((r) => String(r?.vendedor_id ?? '') === String(emp.id));
      const totalMonto = raw.reduce((s, r) => s + montoVenta(r), 0);
      const rows = raw.map(enrichVentaRow);
      return {
        rows,
        error,
        summary: `${emp.nombre}: ${raw.length} ventas · Total Q${totalMonto.toFixed(2)} en el rango`,
      };
    }
    case 'inventario': {
      const { data: invRows, error: invErr } = await db.inventario.getAll();
      let rows = (invRows || []).map(enrichInventarioRow);
      let summary = `Inventario global: ${rows.length} artículos`;
      if (options.inventarioModo === 'producto_servicio') {
        const q = (options.itemNombre || '').trim().toLowerCase();
        rows = rows.filter((r) => String(r?.nombre || '').toLowerCase().includes(q));
        const vendido = rows.reduce((s, r) => s + Number(r?.vendidos || r?.cantidad_vendida || r?.salidas || 0), 0);
        summary = `Item "${options.itemNombre || 'N/A'}" · ${rows.length} coincidencia(s) · vendidos en rango: ${vendido}`;
      }
      return { rows, error: invErr, summary };
    }
    case 'incidentes': {
      const { data, error } = await db.incidentes.getByDateRange(startIso, endIso);
      const rows = (data || []).map((r) => ({
        ...r,
        nombre: `${r.folio || r.id} · ${r.tipo_incidente || '—'}`,
        descripcion: `${r.estado || '—'} · ${r.empleado_nombre || '—'} · Pérdida Q${Number(r.monto_perdida || 0).toFixed(2)}`,
        fecha: r.fecha,
      }));
      return {
        rows,
        error,
        summary: `Incidentes en rango: ${rows.length} (fecha de registro)`,
      };
    }
    case 'empleados': {
      const { data, error } = await db.empleados.getAll();
      const rows = filterByRange(data || [], startIso, endIso);
      return { rows, error, summary: `Empleados registrados: ${rows.length}` };
    }
    default:
      return { rows: [], error: { message: 'Tipo de reporte no soportado' } };
  }
}

function buildCajaReportHtml(item) {
  const sessions = item.cajaSessions || [];
  const sections = sessions
    .map((session) => {
      const { caja, movimientos, ventas, cuadre } = session;
      const responsable = escHtml(
        caja.responsable_apertura || caja.responsable || caja.responsable_cierre || '—',
      );
      const cierreNom = escHtml(caja.responsable_cierre || '—');
      const cajaIdShort = escHtml(String(caja.id || '').slice(0, 8));

      const movRows = (movimientos || [])
        .map((m) => {
          const sign = m.tipo === 'egreso' ? '−' : '+';
          return `<tr>
            <td>${escHtml(tipoMovLabel(m.tipo))}</td>
            <td>${escHtml(m.descripcion || '—')}</td>
            <td style="text-align:right">${sign}${escHtml(formatQ(m.monto))}</td>
            <td>${escHtml(fmtFecha(m.fecha))}</td>
          </tr>`;
        })
        .join('');

      const venRows = (ventas || [])
        .map((v) => {
          const monto = Number(v.total ?? v.monto ?? 0);
          return `<tr>
            <td>${escHtml(v.no_factura || 'Venta')}</td>
            <td>${escHtml(ventaProductosNombres(v))}</td>
            <td>${escHtml(v.cliente_nombre || v.cliente?.nombre || 'Cliente')} · ${escHtml(v.metodo_pago || '—')}</td>
            <td style="text-align:right">${escHtml(formatQ(monto))}</td>
            <td>${escHtml(fmtFecha(v.fecha))}</td>
          </tr>`;
        })
        .join('');

      const cuadreBlock = cuadre
        ? `<p class="meta">Cuadre: ventas ${escHtml(formatQ(cuadre.total_ventas))} · esperado ${escHtml(
            formatQ(cuadre.monto_cierre_esperado),
          )}${
            cuadre.monto_cierre_real != null
              ? ` · real ${escHtml(formatQ(cuadre.monto_cierre_real))} (${escHtml(cuadre.estado_cuadre)})`
              : ''
          }</p>`
        : '';

      return `
        <section class="turno">
          <h2>Turno de caja · ${responsable}</h2>
          <p class="meta">ID turno: ${cajaIdShort}… · Estado: ${escHtml(caja.estado || '—')}</p>
          <p class="meta">Responsable apertura: ${responsable} · Cierre: ${cierreNom}</p>
          <p class="meta">Apertura: ${escHtml(formatQ(caja.monto_apertura))} · Cierre registrado: ${
            caja.monto_cierre != null ? escHtml(formatQ(caja.monto_cierre)) : '—'
          }</p>
          <p class="meta">Abierto: ${escHtml(fmtFecha(caja.creado_a))} · Cerrado: ${escHtml(fmtFecha(caja.fecha_cierre))}</p>
          ${cuadreBlock}
          <h3>Movimientos de caja</h3>
          <table>
            <thead><tr><th>Tipo</th><th>Detalle</th><th>Monto</th><th>Fecha</th></tr></thead>
            <tbody>${movRows || '<tr><td colspan="4">Sin movimientos</td></tr>'}</tbody>
          </table>
          <h3>Ventas del turno</h3>
          <table>
            <thead><tr><th>Folio</th><th>Producto</th><th>Cliente / pago</th><th>Total</th><th>Fecha</th></tr></thead>
            <tbody>${venRows || '<tr><td colspan="5">Sin ventas</td></tr>'}</tbody>
          </table>
        </section>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:system-ui;padding:16px;color:#222;font-size:11px}
    h1{font-size:18px;margin:0 0 6px}
    h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
    h3{font-size:12px;margin:10px 0 4px;color:#444}
    .meta{font-size:10px;color:#555;margin:2px 0}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px}
    th,td{border:1px solid #ccc;padding:4px 6px;vertical-align:top}
    th{text-align:left;background:#f5f5f5}
    .turno{page-break-inside:avoid;margin-bottom:12px}
  </style></head><body>
    <h1>Reporte de caja</h1>
    <div class="meta">Rango: ${escHtml(new Date(item.fromIso).toLocaleDateString('es-GT'))} – ${escHtml(
      new Date(item.toIso).toLocaleDateString('es-GT'),
    )}</div>
    <div class="meta">${escHtml(item.summary || '')}</div>
    ${sections || '<p>Sin turnos de caja en el rango.</p>'}
  </body></html>`;
}

async function printReport(item) {
  let html;
  if (item.typeId === 'caja') {
    html = buildCajaReportHtml(item);
  } else if (item.typeId === 'inventario') {
    html = buildInventarioReportHtml(item);
  } else {
    const previewRows = (item.rows || []).slice(0, 80);
    const rowsHtml = previewRows
      .map(
        (r) => `<tr><td>${escHtml(r.nombre || r.tipo || '-')}</td><td>${escHtml(
          r.descripcion || r.detalle || '-',
        )}</td><td>${escHtml(r.montoFmt || (r.monto != null ? formatQ(r.monto) : '-'))}</td><td>${escHtml(
          fmtFecha(r.fecha || r.created_at || r.fecha_hora),
        )}</td></tr>`,
      )
      .join('');
    html = `<!doctype html><html><head><meta charset="utf-8"/><style>
      body{font-family:system-ui;padding:16px;color:#222;font-size:11px}
      h1{font-size:18px;margin:0 0 6px}
      .meta{font-size:10px;color:#555;margin-bottom:6px}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th,td{border:1px solid #ccc;padding:4px 6px}
      th{text-align:left;background:#f5f5f5}
    </style></head><body>
      <h1>Reporte ${escHtml(item.typeLabel)}</h1>
      <div class="meta">Rango: ${escHtml(new Date(item.fromIso).toLocaleDateString('es-GT'))} – ${escHtml(
        new Date(item.toIso).toLocaleDateString('es-GT'),
      )}</div>
      <div class="meta">${escHtml(item.summary || '')}</div>
      <div class="meta">Registros: ${item.total}</div>
      <table><thead><tr><th>Concepto</th><th>Detalle</th><th>Monto</th><th>Fecha</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: 'Imprimir / Compartir reporte' });
  } else {
    Alert.alert('Reporte listo', `PDF generado: ${uri}`);
  }
}

export function ReportesScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);
  const modalScrollMaxHeight = Math.max(240, Math.min(winH * 0.72, winH * 0.92 - 140));

  const [generated, setGenerated] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [typeId, setTypeId] = useState('caja');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inventarioModo, setInventarioModo] = useState('global');
  const [itemNombre, setItemNombre] = useState('');
  const [clientesModo, setClientesModo] = useState('general');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [vendedorSearch, setVendedorSearch] = useState('');
  const [vendedorResults, setVendedorResults] = useState([]);
  const [vendedorSelected, setVendedorSelected] = useState(null);
  const [clienteVentasSearch, setClienteVentasSearch] = useState('');
  const [clienteVentasResults, setClienteVentasResults] = useState([]);
  const [clienteVentasSelected, setClienteVentasSelected] = useState(null);
  const [agendaModo, setAgendaModo] = useState('general');
  const [agendaClienteSearch, setAgendaClienteSearch] = useState('');
  const [agendaClienteResults, setAgendaClienteResults] = useState([]);
  const [agendaClienteSelected, setAgendaClienteSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await loadReportes();
      if (!cancelled) {
        setGenerated(list);
        setReportsLoading(false);
      }
    };
    refresh();
    const unsub = subscribeReportesStorage(() => {
      refresh();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (typeId !== 'empleado_ventas') {
      setVendedorResults([]);
      return undefined;
    }
    let cancelled = false;
    const q = sanitizeSearchQuery(vendedorSearch);
    if (q.length < 2) {
      setVendedorResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      const { data, error } = await db.empleados.search(q);
      if (!cancelled && !error) setVendedorResults(data || []);
      else if (!cancelled) setVendedorResults([]);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [typeId, vendedorSearch]);

  useEffect(() => {
    if (typeId !== 'ventas_cliente') {
      setClienteVentasResults([]);
      return undefined;
    }
    let cancelled = false;
    const q = sanitizeSearchQuery(clienteVentasSearch);
    if (q.length < 2) {
      setClienteVentasResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      const { data, error } = await db.clientes.search(q);
      if (!cancelled && !error) setClienteVentasResults(data || []);
      else if (!cancelled) setClienteVentasResults([]);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [typeId, clienteVentasSearch]);

  useEffect(() => {
    if (typeId !== 'agenda' || agendaModo !== 'por_cliente') {
      setAgendaClienteResults([]);
      return undefined;
    }
    let cancelled = false;
    const q = sanitizeSearchQuery(agendaClienteSearch);
    if (q.length < 2) {
      setAgendaClienteResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      const { data, error } = await db.clientes.search(q);
      if (!cancelled && !error) setAgendaClienteResults(data || []);
      else if (!cancelled) setAgendaClienteResults([]);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [typeId, agendaModo, agendaClienteSearch]);

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);
  const selected = REPORT_TYPES.find((x) => x.id === typeId);

  const rightAction = useMemo(
    () => (
      <TouchableOpacity
        style={styles.headerIconCircle}
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Generar reporte"
        activeOpacity={0.85}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <FileText size={22} color={c.foreground} strokeWidth={2.2} />
      </TouchableOpacity>
    ),
    [c.foreground, styles.headerIconCircle],
  );

  const generarReporte = async () => {
    if (toDate < fromDate) {
      Alert.alert('Rango inválido', 'La fecha final no puede ser menor que la inicial.');
      return;
    }
    if (typeId === 'empleado_ventas' && !vendedorSelected) {
      Alert.alert('Ventas por empleado', 'Buscá y elegí un empleado para ver sus ventas en el rango.');
      return;
    }
    if (typeId === 'ventas_cliente' && !clienteVentasSelected) {
      Alert.alert('Ventas por cliente', 'Buscá y elegí un cliente para exportar su ficha y compras.');
      return;
    }
    if (typeId === 'agenda' && agendaModo === 'por_cliente' && !agendaClienteSelected) {
      Alert.alert('Agenda', 'Elegí un cliente para ver sus visitas, o cambiá a “General”.');
      return;
    }
    setLoading(true);
    const startIso = toStartIso(fromDate);
    const endIso = toEndIso(toDate);
    const options = {
      inventarioModo,
      itemNombre,
      clientesModo,
      proveedorNombre,
      vendedorEmpleado: vendedorSelected,
      clienteVentas: clienteVentasSelected,
      agendaModo,
      agendaCliente: agendaClienteSelected,
    };
    const { rows, error, summary, cajaSessions } = await fetchRowsByType(typeId, startIso, endIso, options);
    setLoading(false);

    if (error) {
      Alert.alert('Error al generar', error.message || 'No fue posible obtener datos de base.');
      return;
    }

    const item = {
      id: `${Date.now()}-${typeId}`,
      typeId,
      typeLabel: selected?.label || typeId,
      fromIso: startIso,
      toIso: endIso,
      total: rows.length,
      rows,
      cajaSessions: cajaSessions || null,
      summary,
      generatedAt: new Date().toISOString(),
      status: 'Generado',
    };
    const next = await addReporte(item);
    setGenerated(next);
    setModalOpen(false);
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Reportes"
        subtitle="Generá reportes por rango de fechas y luego imprimilos."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        rightAction={rightAction}
        edgeToEdge
      >
        <View style={styles.body}>
          {reportsLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.md }} color={c.primary} />
          ) : generated.length === 0 ? (
            <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
              Aún no hay reportes. Tocá el ícono de documento arriba a la derecha para generar uno.
            </Text>
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={generated}
                keyExtractor={(r) => String(r.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: padBottom }}
                renderItem={({ item: r }) => (
                  <TouchableOpacity
                    style={[styles.row, { borderBottomColor: c.cardBorder }]}
                    onPress={() => printReport(r)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowBody}>
                      <View style={styles.rowTop}>
                        <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
                          {r.typeLabel}
                        </Text>
                        <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
                          {r.total} reg.
                        </Text>
                      </View>
                      <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
                        {new Date(r.fromIso).toLocaleDateString('es-GT')} –{' '}
                        {new Date(r.toIso).toLocaleDateString('es-GT')} ·{' '}
                        {new Date(r.generatedAt).toLocaleString('es-GT', {
                          day: '2-digit',
                          month: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {r.summary ? (
                        <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
                          {r.summary}
                        </Text>
                      ) : null}
                    </View>
                    <Printer size={16} color={c.primary} style={styles.rowIcon} />
                    <ChevronRight size={16} color={c.foregroundSubtle} />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </SubScreenChrome>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.bottom + spacing.md}
        >
          <View style={[styles.modalCard, { backgroundColor: c.background }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Generar reporte</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: modalScrollMaxHeight }}
              contentContainerStyle={{ paddingBottom: spacing.lg + insets.bottom }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <Text style={styles.fieldLbl}>Tipo de reporte</Text>
              <View style={styles.typeGrid}>
                {REPORT_TYPES.map((t) => {
                  const on = t.id === typeId;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.typeChip,
                        {
                          borderColor: on ? c.primary : c.cardBorder,
                          backgroundColor: on ? c.surfaceMuted : c.card,
                        },
                      ]}
                      onPress={() => setTypeId(t.id)}
                    >
                      <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLbl}>Rango de fecha</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.dateBtn, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                  onPress={() => setShowFromPicker(true)}
                >
                  <Calendar size={16} color={c.foregroundMuted} />
                  <Text style={styles.dateTxt}>{fromDate.toLocaleDateString('es-GT')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateBtn, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                  onPress={() => setShowToPicker(true)}
                >
                  <Calendar size={16} color={c.foregroundMuted} />
                  <Text style={styles.dateTxt}>{toDate.toLocaleDateString('es-GT')}</Text>
                </TouchableOpacity>
              </View>

              {showFromPicker ? (
                <DateTimePicker
                  mode="date"
                  value={fromDate}
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') setShowFromPicker(false);
                    if (date) setFromDate(date);
                  }}
                />
              ) : null}
              {showToPicker ? (
                <DateTimePicker
                  mode="date"
                  value={toDate}
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') setShowToPicker(false);
                    if (date) setToDate(date);
                  }}
                />
              ) : null}

              <TextInput
                style={[styles.inputHint, { borderColor: c.cardBorder, color: c.foregroundMuted, backgroundColor: c.card }]}
                editable={false}
                value={`Fuente: base de datos (${selected?.label || ''})`}
              />

              {typeId === 'incidentes' ? (
                <Text style={[subStyles.muted, { marginBottom: spacing.md, fontSize: 12 }]}>
                  Listado de protocolos de accidente por fecha del incidente (folio, tipo, estado y montos).
                </Text>
              ) : null}

              {typeId === 'inventario' ? (
                <>
                  <Text style={styles.fieldLbl}>Inventario: alcance</Text>
                  <View style={styles.typeGrid}>
                    {[
                      { id: 'global', label: 'Global' },
                      { id: 'producto_servicio', label: 'Producto / servicio' },
                    ].map((opt) => {
                      const on = inventarioModo === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.typeChip,
                            {
                              borderColor: on ? c.primary : c.cardBorder,
                              backgroundColor: on ? c.surfaceMuted : c.card,
                            },
                          ]}
                          onPress={() => setInventarioModo(opt.id)}
                        >
                          <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {inventarioModo === 'producto_servicio' ? (
                    <TextInput
                      style={[styles.inputHint, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                      placeholder="Nombre de producto o servicio"
                      placeholderTextColor={c.foregroundSubtle}
                      value={itemNombre}
                      onChangeText={setItemNombre}
                    />
                  ) : null}
                </>
              ) : null}

              {typeId === 'clientes' ? (
                <>
                  <Text style={styles.fieldLbl}>Clientes: modo</Text>
                  <View style={styles.typeGrid}>
                    {[
                      { id: 'general', label: 'General' },
                      { id: 'nuevos', label: 'Clientes nuevos' },
                    ].map((opt) => {
                      const on = clientesModo === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.typeChip,
                            {
                              borderColor: on ? c.primary : c.cardBorder,
                              backgroundColor: on ? c.surfaceMuted : c.card,
                            },
                          ]}
                          onPress={() => setClientesModo(opt.id)}
                        >
                          <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {typeId === 'agenda' ? (
                <>
                  <Text style={styles.fieldLbl}>Agenda: alcance</Text>
                  <View style={styles.typeGrid}>
                    {[
                      { id: 'general', label: 'General' },
                      { id: 'por_cliente', label: 'Por cliente' },
                    ].map((opt) => {
                      const on = agendaModo === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.typeChip,
                            {
                              borderColor: on ? c.primary : c.cardBorder,
                              backgroundColor: on ? c.surfaceMuted : c.card,
                            },
                          ]}
                          onPress={() => {
                            setAgendaModo(opt.id);
                            if (opt.id === 'general') {
                              setAgendaClienteSelected(null);
                              setAgendaClienteSearch('');
                              setAgendaClienteResults([]);
                            }
                          }}
                        >
                          <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {agendaModo === 'por_cliente' ? (
                    <>
                      <Text style={styles.fieldLbl}>Buscar cliente</Text>
                      <View style={[styles.searchBar, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                        <Search size={18} color={c.foregroundMuted} />
                        <TextInput
                          style={[styles.searchInput, { color: c.foreground }]}
                          placeholder="Nombre, teléfono o correo"
                          placeholderTextColor={c.foregroundSubtle}
                          value={agendaClienteSearch}
                          onChangeText={setAgendaClienteSearch}
                          editable={!agendaClienteSelected}
                        />
                      </View>
                      {agendaClienteSelected ? (
                        <TouchableOpacity
                          style={[styles.invPickPill, { borderColor: c.primary, backgroundColor: c.surfaceMuted }]}
                          onPress={() => {
                            setAgendaClienteSelected(null);
                            setAgendaClienteSearch('');
                            setAgendaClienteResults([]);
                          }}
                        >
                          <Text style={[styles.invPickPillTxt, { color: c.foreground }]} numberOfLines={1}>
                            {agendaClienteSelected.nombre}
                          </Text>
                          <Text style={[styles.invPickClear, { color: c.foregroundMuted }]}>Quitar</Text>
                        </TouchableOpacity>
                      ) : agendaClienteResults.length > 0 ? (
                        <View style={[styles.invSuggest, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                          {agendaClienteResults.slice(0, 8).map((row) => (
                            <TouchableOpacity
                              key={row.id}
                              style={styles.invSuggestRow}
                              onPress={() => {
                                setAgendaClienteSelected(row);
                                setAgendaClienteSearch('');
                                setAgendaClienteResults([]);
                              }}
                            >
                              <Text style={[styles.invSuggestName, { color: c.foreground }]} numberOfLines={2}>
                                {row.nombre}
                              </Text>
                              <Text style={[styles.invSuggestMeta, { color: c.foregroundMuted }]}>
                                {[row.telefono, row.email].filter(Boolean).join(' · ') || 'Sin contacto'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                      <Text style={[subStyles.muted, { marginBottom: spacing.md, fontSize: 12 }]}>
                        Contamos las citas del cliente en el rango de fechas (cuántas veces agendó / visitó en ese periodo).
                      </Text>
                    </>
                  ) : (
                    <Text style={[subStyles.muted, { marginBottom: spacing.md, fontSize: 12 }]}>
                      Todas las citas del salón en el rango: todos los clientes (vista general).
                    </Text>
                  )}
                </>
              ) : null}

              {typeId === 'proveedores' ? (
                <>
                  <Text style={styles.fieldLbl}>Compañía</Text>
                  <TextInput
                    style={[styles.inputHint, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                    placeholder="Nombre de la compañía"
                    placeholderTextColor={c.foregroundSubtle}
                    value={proveedorNombre}
                    onChangeText={setProveedorNombre}
                  />
                </>
              ) : null}

              {typeId === 'ventas_cliente' ? (
                <>
                  <Text style={styles.fieldLbl}>Cliente</Text>
                  <View style={[styles.searchBar, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                    <Search size={18} color={c.foregroundMuted} />
                    <TextInput
                      style={[styles.searchInput, { color: c.foreground }]}
                      placeholder="Nombre, teléfono o correo"
                      placeholderTextColor={c.foregroundSubtle}
                      value={clienteVentasSearch}
                      onChangeText={setClienteVentasSearch}
                      editable={!clienteVentasSelected}
                    />
                  </View>
                  {clienteVentasSelected ? (
                    <TouchableOpacity
                      style={[styles.invPickPill, { borderColor: c.primary, backgroundColor: c.surfaceMuted }]}
                      onPress={() => {
                        setClienteVentasSelected(null);
                        setClienteVentasSearch('');
                        setClienteVentasResults([]);
                      }}
                    >
                      <Text style={[styles.invPickPillTxt, { color: c.foreground }]} numberOfLines={1}>
                        {clienteVentasSelected.nombre}
                        {clienteVentasSelected.categoria ? (
                          <Text style={{ color: c.foregroundMuted }}> · {clienteVentasSelected.categoria}</Text>
                        ) : null}
                      </Text>
                      <Text style={[styles.invPickClear, { color: c.foregroundMuted }]}>Quitar</Text>
                    </TouchableOpacity>
                  ) : clienteVentasResults.length > 0 ? (
                    <View style={[styles.invSuggest, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                      {clienteVentasResults.slice(0, 8).map((row) => (
                        <TouchableOpacity
                          key={row.id}
                          style={styles.invSuggestRow}
                          onPress={() => {
                            setClienteVentasSelected(row);
                            setClienteVentasSearch('');
                            setClienteVentasResults([]);
                          }}
                        >
                          <Text style={[styles.invSuggestName, { color: c.foreground }]} numberOfLines={2}>
                            {row.nombre}
                          </Text>
                          <Text style={[styles.invSuggestMeta, { color: c.foregroundMuted }]}>
                            {[row.telefono, row.email].filter(Boolean).join(' · ') || 'Sin contacto'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  <Text style={[subStyles.muted, { marginBottom: spacing.md, fontSize: 12 }]}>
                    Exporta los datos del cliente desde la base y sus compras en el rango; si el cliente está inactivo,
                    solo se exporta la ficha sin ventas del periodo.
                  </Text>
                </>
              ) : null}

              {typeId === 'empleado_ventas' ? (
                <>
                  <Text style={styles.fieldLbl}>Empleado</Text>
                  <View style={[styles.searchBar, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                    <Search size={18} color={c.foregroundMuted} />
                    <TextInput
                      style={[styles.searchInput, { color: c.foreground }]}
                      placeholder="Nombre, teléfono o correo"
                      placeholderTextColor={c.foregroundSubtle}
                      value={vendedorSearch}
                      onChangeText={setVendedorSearch}
                      editable={!vendedorSelected}
                    />
                  </View>
                  {vendedorSelected ? (
                    <TouchableOpacity
                      style={[styles.invPickPill, { borderColor: c.primary, backgroundColor: c.surfaceMuted }]}
                      onPress={() => {
                        setVendedorSelected(null);
                        setVendedorSearch('');
                        setVendedorResults([]);
                      }}
                    >
                      <Text style={[styles.invPickPillTxt, { color: c.foreground }]} numberOfLines={1}>
                        {vendedorSelected.nombre}
                        {vendedorSelected.rol ? (
                          <Text style={{ color: c.foregroundMuted }}> · {vendedorSelected.rol}</Text>
                        ) : null}
                      </Text>
                      <Text style={[styles.invPickClear, { color: c.foregroundMuted }]}>Quitar</Text>
                    </TouchableOpacity>
                  ) : vendedorResults.length > 0 ? (
                    <View style={[styles.invSuggest, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                      {vendedorResults.slice(0, 8).map((row) => (
                        <TouchableOpacity
                          key={row.id}
                          style={styles.invSuggestRow}
                          onPress={() => {
                            setVendedorSelected(row);
                            setVendedorSearch('');
                            setVendedorResults([]);
                          }}
                        >
                          <Text style={[styles.invSuggestName, { color: c.foreground }]} numberOfLines={2}>
                            {row.nombre}
                          </Text>
                          <Text style={[styles.invSuggestMeta, { color: c.foregroundMuted }]}>
                            {[row.telefono, row.email].filter(Boolean).join(' · ') || 'Sin contacto'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  <Text style={[subStyles.muted, { marginBottom: spacing.md, fontSize: 12 }]}>
                    Se listan las ventas de ese vendedor entre las fechas elegidas arriba.
                  </Text>
                </>
              ) : null}

              <SalonButton
                title={loading ? 'Generando...' : 'Generar'}
                variant="heroGold"
                fullWidth
                disabled={loading}
                onPress={generarReporte}
              />
              <SalonButton
                title="Cancelar"
                variant="outlineGray"
                fullWidth
                style={{ marginTop: spacing.sm }}
                onPress={() => setModalOpen(false)}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    body: {
      flex: 1,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
    },
    listShell: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.xs,
    },
    rowBody: { flex: 1, minWidth: 0 },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    rowTitle: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    rowMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    rowSub: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    rowIcon: { flexShrink: 0 },
    emptyTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      paddingHorizontal: spacing.sm,
    },
    headerIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    modalCard: {
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      maxHeight: '92%',
      overflow: 'hidden',
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    typeChip: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      minWidth: '47%',
    },
    typeChipTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
    },
    dateRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    dateBtn: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    dateTxt: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foreground,
    },
    inputHint: {
      minHeight: 44,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      fontFamily: typography.fontSans,
      fontSize: 13,
    },
    noteArea: {
      minHeight: 84,
      textAlignVertical: 'top',
      paddingTop: spacing.sm,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 14,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    },
    invSuggest: {
      borderRadius: radii.md,
      borderWidth: 1,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    invSuggestRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(128,128,128,0.35)',
    },
    invSuggestName: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    invSuggestMeta: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      marginTop: 2,
    },
    invPickPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    invPickPillTxt: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 13,
    },
    invPickClear: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
  });
}
