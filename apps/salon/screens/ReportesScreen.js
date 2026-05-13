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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, FileText, Printer, Search, X } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, supabase } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

const REPORT_TYPES = [
  { id: 'caja', label: 'Caja' },
  { id: 'mensajes', label: 'Mensajes' },
  { id: 'metas', label: 'Metas' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'ventas_cliente', label: 'Ventas por cliente' },
  { id: 'empleado_ventas', label: 'Ventas por empleado' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'incidentes', label: 'Incidentes' },
  { id: 'empleados', label: 'Empleados' },
  { id: 'convertor', label: 'Convertor' },
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
    case 'caja': {
      // Trae cajas y movimientos; si el rango incluye varios días, retorna todo desglosado por fecha.
      const { data: cajas, error: cajasErr } = await db.cajas.getByDateRange(startIso, endIso);
      const { data: movs, error: movErr } = await db.movimientosCaja.getByRangoFechas(startIso, endIso);
      const error = cajasErr || movErr;
      const byDay = sumBy(movs || [], ['fecha', 'created_at']);
      const resumen = Object.entries(byDay)
        .map(([k, v]) => `${k}: ${v} movimientos`)
        .join(' | ');
      return {
        rows: [{ tipo: 'cajas', total: (cajas || []).length }, ...(movs || [])],
        error,
        summary: `Cajas: ${(cajas || []).length}. ${resumen || 'Sin movimientos en el rango.'}`,
      };
    }
    case 'mensajes': {
      const { data, error } = await db.marketingDirectMessages.getByDateRange(startIso, endIso);
      return { rows: data || [], error, summary: `Mensajes en rango: ${(data || []).length}` };
    }
    case 'metas': {
      const { data, error } = await db.metas.getAll();
      const rows = filterByRange(data || [], startIso, endIso);
      return { rows, error, summary: `Metas en rango: ${rows.length}` };
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
      let rows = filterByRange(invRows || [], startIso, endIso);
      let summary = `Inventario global: ${rows.length} registros`;
      if (options.inventarioModo === 'producto_servicio') {
        const q = (options.itemNombre || '').trim().toLowerCase();
        rows = rows.filter((r) => String(r?.nombre || r?.producto || r?.servicio || '').toLowerCase().includes(q));
        const vendido = rows.reduce((s, r) => s + Number(r?.vendidos || r?.cantidad_vendida || r?.salidas || 0), 0);
        summary = `Item "${options.itemNombre || 'N/A'}" vendido en rango: ${vendido}`;
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
    case 'convertor': {
      const invCosto = options.convertorItemCosto || null;
      const invUtil = options.convertorItemUtilidad || null;
      const fijo = invCosto ? Number(invCosto.precio_costo ?? invCosto.costo ?? 0) : 0;
      const costoUtil = invUtil ? Number(invUtil.precio_costo ?? invUtil.costo ?? 0) : 0;
      const ventaUtil = invUtil ? Number(invUtil.precio_venta ?? 0) : 0;
      const neta = invUtil ? Math.max(0, ventaUtil - costoUtil) : 0;
      const resultado = fijo * neta;
      const nota = options.convertorNota?.trim() || 'Sin nota';
      const nomCosto = invCosto?.nombre || '—';
      const nomUtil = invUtil?.nombre || '—';
      return {
        rows: [
          {
            id: 'convertor-resumen',
            nombre: `Costo fijo (inventario): ${nomCosto} → Q${fijo.toFixed(2)}`,
            tipo: `Utilidad neta (inventario): ${nomUtil} → Q${neta.toFixed(2)}`,
            descripcion: nota,
            fecha: new Date().toISOString(),
            costo_fijo: fijo,
            utilidad_neta: neta,
            resultado,
            inventario_costo_id: invCosto?.id ?? null,
            inventario_utilidad_id: invUtil?.id ?? null,
          },
        ],
        error: null,
        summary: `Convertor: ${nomCosto} (costo Q${fijo.toFixed(2)}) × margen ${nomUtil} (Q${neta.toFixed(2)}) = Q${resultado.toFixed(2)}`,
      };
    }
    default:
      return { rows: [], error: { message: 'Tipo de reporte no soportado' } };
  }
}

async function printReport(item) {
  const previewRows = (item.rows || []).slice(0, 30);
  const rowsHtml = previewRows
    .map(
      (r) => `<tr><td>${String(r.id || '-')}</td><td>${String(r.nombre || r.tipo || r.descripcion || '-')}</td><td>${String(
        r.fecha || r.created_at || r.fecha_hora || '-',
      )}</td></tr>`,
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:system-ui;padding:20px;color:#222}
    h1{font-size:20px;margin:0 0 8px}
    .meta{font-size:12px;color:#555;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ccc;padding:6px}
    th{text-align:left;background:#f5f5f5}
  </style></head><body>
    <h1>Reporte ${item.typeLabel}</h1>
    <div class="meta">Rango: ${new Date(item.fromIso).toLocaleDateString('es-GT')} - ${new Date(item.toIso).toLocaleDateString(
      'es-GT',
    )}</div>
    <div class="meta">${item.summary || ''}</div>
    <div class="meta">Registros: ${item.total}</div>
    <table><thead><tr><th>ID</th><th>Detalle</th><th>Fecha</th></tr></thead><tbody>${rowsHtml}</tbody></table>
  </body></html>`;
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
  const [convertorSearchCosto, setConvertorSearchCosto] = useState('');
  const [convertorSearchUtilidad, setConvertorSearchUtilidad] = useState('');
  const [convertorResultsCosto, setConvertorResultsCosto] = useState([]);
  const [convertorResultsUtilidad, setConvertorResultsUtilidad] = useState([]);
  const [convertorItemCosto, setConvertorItemCosto] = useState(null);
  const [convertorItemUtilidad, setConvertorItemUtilidad] = useState(null);
  const [convertorNota, setConvertorNota] = useState('');
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
    const q = sanitizeSearchQuery(convertorSearchCosto);
    if (q.length < 2) {
      setConvertorResultsCosto([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      const { data, error } = await db.inventario.search(q);
      if (!cancelled && !error) setConvertorResultsCosto(data || []);
      else if (!cancelled) setConvertorResultsCosto([]);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [convertorSearchCosto]);

  useEffect(() => {
    let cancelled = false;
    const q = sanitizeSearchQuery(convertorSearchUtilidad);
    if (q.length < 2) {
      setConvertorResultsUtilidad([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      const { data, error } = await db.inventario.search(q);
      if (!cancelled && !error) setConvertorResultsUtilidad(data || []);
      else if (!cancelled) setConvertorResultsUtilidad([]);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [convertorSearchUtilidad]);

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
    if (typeId === 'convertor' && (!convertorItemCosto || !convertorItemUtilidad)) {
      Alert.alert(
        'Convertor',
        'Elegí un producto en “Costo fijo” y otro en “Utilidad neta” usando la búsqueda de inventario.',
      );
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
      convertorItemCosto,
      convertorItemUtilidad,
      convertorNota,
      vendedorEmpleado: vendedorSelected,
      clienteVentas: clienteVentasSelected,
      agendaModo,
      agendaCliente: agendaClienteSelected,
    };
    const { rows, error, summary } = await fetchRowsByType(typeId, startIso, endIso, options);
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
      summary,
      generatedAt: new Date().toISOString(),
      status: 'Generado',
    };
    setGenerated((prev) => [item, ...prev]);
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
      >
        <View style={styles.body}>
          <ScrollView contentContainerStyle={{ paddingBottom: padBottom, paddingTop: spacing.sm }} showsVerticalScrollIndicator={false}>
            {generated.length === 0 ? (
              <Text style={subStyles.muted}>
                Aún no hay reportes. Tocá el ícono de documento arriba a la derecha para generar uno.
              </Text>
            ) : (
              generated.map((r) => (
                <View key={r.id} style={[styles.reportItem, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportName}>{r.typeLabel}</Text>
                    <Text style={subStyles.muted}>
                      {new Date(r.fromIso).toLocaleDateString('es-GT')} - {new Date(r.toIso).toLocaleDateString('es-GT')}
                    </Text>
                    <Text style={subStyles.muted}>Registros: {r.total}</Text>
                    {r.summary ? <Text style={subStyles.muted}>{r.summary}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.printBtn, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}
                    onPress={() => printReport(r)}
                  >
                    <Printer size={16} color={c.primary} />
                    <Text style={[styles.printTxt, { color: c.primary }]}>Imprimir</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
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

              {typeId === 'convertor' ? (
                <>
                  <Text style={styles.fieldLbl}>Costo fijo — buscar en inventario</Text>
                  <View style={[styles.searchBar, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                    <Search size={18} color={c.foregroundMuted} />
                    <TextInput
                      style={[styles.searchInput, { color: c.foreground }]}
                      placeholder="Nombre, categoría o código"
                      placeholderTextColor={c.foregroundSubtle}
                      value={convertorSearchCosto}
                      onChangeText={setConvertorSearchCosto}
                      editable={!convertorItemCosto}
                    />
                  </View>
                  {convertorItemCosto ? (
                    <TouchableOpacity
                      style={[styles.invPickPill, { borderColor: c.primary, backgroundColor: c.surfaceMuted }]}
                      onPress={() => {
                        setConvertorItemCosto(null);
                        setConvertorSearchCosto('');
                        setConvertorResultsCosto([]);
                      }}
                    >
                      <Text style={[styles.invPickPillTxt, { color: c.foreground }]} numberOfLines={1}>
                        {convertorItemCosto.nombre}
                        <Text style={{ color: c.primary }}> · Q{Number(convertorItemCosto.precio_costo ?? convertorItemCosto.costo ?? 0).toFixed(2)} costo</Text>
                      </Text>
                      <Text style={[styles.invPickClear, { color: c.foregroundMuted }]}>Quitar</Text>
                    </TouchableOpacity>
                  ) : convertorResultsCosto.length > 0 ? (
                    <View style={[styles.invSuggest, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                      {convertorResultsCosto.slice(0, 8).map((row) => (
                        <TouchableOpacity
                          key={row.id}
                          style={styles.invSuggestRow}
                          onPress={() => {
                            setConvertorItemCosto(row);
                            setConvertorSearchCosto('');
                            setConvertorResultsCosto([]);
                          }}
                        >
                          <Text style={[styles.invSuggestName, { color: c.foreground }]} numberOfLines={2}>
                            {row.nombre}
                          </Text>
                          <Text style={[styles.invSuggestMeta, { color: c.foregroundMuted }]}>
                            Stock {row.stock_actual ?? 0} · Costo Q{Number(row.precio_costo ?? row.costo ?? 0).toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  <Text style={styles.fieldLbl}>Utilidad neta — buscar en inventario</Text>
                  <View style={[styles.searchBar, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                    <Search size={18} color={c.foregroundMuted} />
                    <TextInput
                      style={[styles.searchInput, { color: c.foreground }]}
                      placeholder="Nombre, categoría o código"
                      placeholderTextColor={c.foregroundSubtle}
                      value={convertorSearchUtilidad}
                      onChangeText={setConvertorSearchUtilidad}
                      editable={!convertorItemUtilidad}
                    />
                  </View>
                  {convertorItemUtilidad ? (
                    <TouchableOpacity
                      style={[styles.invPickPill, { borderColor: c.primary, backgroundColor: c.surfaceMuted }]}
                      onPress={() => {
                        setConvertorItemUtilidad(null);
                        setConvertorSearchUtilidad('');
                        setConvertorResultsUtilidad([]);
                      }}
                    >
                      <Text style={[styles.invPickPillTxt, { color: c.foreground }]} numberOfLines={1}>
                        {convertorItemUtilidad.nombre}
                        <Text style={{ color: c.primary }}>
                          {' '}
                          · Margen Q
                          {Math.max(
                            0,
                            Number(convertorItemUtilidad.precio_venta ?? 0) -
                              Number(convertorItemUtilidad.precio_costo ?? convertorItemUtilidad.costo ?? 0),
                          ).toFixed(2)}
                        </Text>
                      </Text>
                      <Text style={[styles.invPickClear, { color: c.foregroundMuted }]}>Quitar</Text>
                    </TouchableOpacity>
                  ) : convertorResultsUtilidad.length > 0 ? (
                    <View style={[styles.invSuggest, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                      {convertorResultsUtilidad.slice(0, 8).map((row) => {
                        const m = Math.max(
                          0,
                          Number(row.precio_venta ?? 0) - Number(row.precio_costo ?? row.costo ?? 0),
                        );
                        return (
                          <TouchableOpacity
                            key={row.id}
                            style={styles.invSuggestRow}
                            onPress={() => {
                              setConvertorItemUtilidad(row);
                              setConvertorSearchUtilidad('');
                              setConvertorResultsUtilidad([]);
                            }}
                          >
                            <Text style={[styles.invSuggestName, { color: c.foreground }]} numberOfLines={2}>
                              {row.nombre}
                            </Text>
                            <Text style={[styles.invSuggestMeta, { color: c.foregroundMuted }]}>
                              Venta Q{Number(row.precio_venta ?? 0).toFixed(2)} · Margen Q{m.toFixed(2)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}

                  <Text style={styles.fieldLbl}>Notas</Text>
                  <TextInput
                    style={[styles.inputHint, styles.noteArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                    placeholder="Contexto del cálculo"
                    placeholderTextColor={c.foregroundSubtle}
                    multiline
                    value={convertorNota}
                    onChangeText={setConvertorNota}
                  />
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
    body: { flex: 1 },
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
    reportItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    reportName: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      color: c.foreground,
      marginBottom: 2,
    },
    badge: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    printBtn: {
      borderWidth: 1,
      borderRadius: radii.md,
      minHeight: 34,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    printTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
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
