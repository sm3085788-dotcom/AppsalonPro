import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Minus, Plus, Trash2, User, Package, UserCog } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  db,
  registrarMontoVentaEnMeta,
  getArticuloTipo,
  servicioUsaPreciosPorVolumen,
  precioServicioPorVolumen,
  getPreciosPorVolumenFromRow,
  VOLUMEN_TRABAJO_OPCIONES,
  volumenTrabajoLabel,
} from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, SalonSearchBar } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { printVentaTicket } from '../utils/ventaTicketPrint';

const METODOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
];

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sanitizeMontoInput(t) {
  let out = String(t || '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');
  const parts = out.split('.');
  if (parts.length > 2) out = `${parts[0]}.${parts.slice(1).join('')}`;
  const dot = out.indexOf('.');
  if (dot >= 0) {
    out = `${out.slice(0, dot + 1)}${out.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`;
  }
  return out;
}

function parseMontoEfectivo(str) {
  const n = Number(String(str || '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function sanitizeDescuentoPct(t) {
  let out = String(t || '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');
  const dot = out.indexOf('.');
  if (dot >= 0) {
    out = `${out.slice(0, dot + 1)}${out.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`;
  }
  return out;
}

function nextNoFactura() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 90000) + 10000);
  return `FAC-${y}${m}${day}-${r}`;
}

function qtyOnCart(lines, productoId, exceptLineId, volumenTrabajo = undefined) {
  return lines
    .filter((l) => {
      if (l.productoId !== productoId || l.id === exceptLineId) return false;
      if (volumenTrabajo !== undefined) {
        return (l.volumenTrabajo ?? null) === (volumenTrabajo ?? null);
      }
      return true;
    })
    .reduce((s, l) => s + l.qty, 0);
}

function precioSugerenciaInventario(p) {
  if (servicioUsaPreciosPorVolumen(p)) {
    const tabla = getPreciosPorVolumenFromRow(p);
    const vals = VOLUMEN_TRABAJO_OPCIONES.map((o) => tabla[o.id]).filter((n) => n != null && n > 0);
    if (!vals.length) return formatQ(p.precio_venta);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return min === max ? formatQ(min) : `${formatQ(min)} – ${formatQ(max)}`;
  }
  return formatQ(p.precio_venta);
}

export function VenderScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(), []);

  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [profesionalSearch, setProfesionalSearch] = useState('');
  const [productoSearch, setProductoSearch] = useState('');
  const [clienteSel, setClienteSel] = useState(null);
  const [profesionalSel, setProfesionalSel] = useState(null);
  const [lines, setLines] = useState([]);
  const [descuentoPctStr, setDescuentoPctStr] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [efectivoRecibidoStr, setEfectivoRecibidoStr] = useState('');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [volumenPickProduct, setVolumenPickProduct] = useState(null);

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  /** Acentos POS (oro de marca, legible en claro y oscuro). */
  const posAccent = useMemo(
    () => ({
      sectionBg: isDark ? 'rgba(197, 163, 104, 0.11)' : 'rgba(197, 163, 104, 0.07)',
      sectionBorder: isDark ? 'rgba(197, 163, 104, 0.32)' : 'rgba(197, 163, 104, 0.28)',
      inputBorder: isDark ? 'rgba(197, 163, 104, 0.22)' : 'rgba(197, 163, 104, 0.18)',
    }),
    [isDark],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rCli, rEmp, rInv] = await Promise.all([
        db.clientes.getAll(),
        db.empleados.getActivos(),
        db.inventario.getAll(),
      ]);
      if (rCli.error) throw rCli.error;
      if (rEmp.error) throw rEmp.error;
      if (rInv.error) throw rInv.error;
      setClientes(Array.isArray(rCli.data) ? rCli.data : []);
      setEmpleados(Array.isArray(rEmp.data) ? rEmp.data : []);
      setInventario(Array.isArray(rInv.data) ? rInv.data : []);
    } catch (e) {
      Alert.alert('Vender', e?.message || 'No se pudieron cargar clientes o inventario.');
      setClientes([]);
      setEmpleados([]);
      setInventario([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const stockById = useMemo(() => {
    const m = {};
    for (const p of inventario) {
      m[p.id] = Number(p.stock_actual ?? 0);
    }
    return m;
  }, [inventario]);

  const clientesFiltrados = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientes
      .filter((row) => {
        const blob = [row.nombre, row.telefono, row.email].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 60);
  }, [clientes, clienteSearch]);

  const empleadosFiltrados = useMemo(() => {
    const q = profesionalSearch.trim().toLowerCase();
    if (q.length < 2 || profesionalSel) return [];
    return empleados
      .filter((row) => {
        const blob = [row.nombre, row.rol, row.telefono, row.email].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 40);
  }, [empleados, profesionalSearch, profesionalSel]);

  const productosFiltrados = useMemo(() => {
    const q = productoSearch.trim().toLowerCase();
    if (!q) return [];
    return inventario
      .filter((p) => {
        const blob = [p.nombre, p.categoria, p.barcode].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
        if (getArticuloTipo(p) === 'servicio') return true;
        return Number(p.stock_actual ?? 0) > 0;
      })
      .slice(0, 50);
  }, [inventario, productoSearch]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.precioUnit, 0),
    [lines],
  );

  const descuentoPct = useMemo(() => {
    const raw = Number(String(descuentoPctStr || '').replace(',', '.'));
    if (!Number.isFinite(raw)) return 0;
    return Math.min(100, Math.max(0, raw));
  }, [descuentoPctStr]);

  const descuentoNum = useMemo(() => {
    if (subtotal <= 0 || descuentoPct <= 0) return 0;
    return Math.round(subtotal * (descuentoPct / 100) * 100) / 100;
  }, [subtotal, descuentoPct]);

  const total = useMemo(() => Math.max(0, subtotal - descuentoNum), [subtotal, descuentoNum]);

  const efectivoRecibido = useMemo(() => parseMontoEfectivo(efectivoRecibidoStr), [efectivoRecibidoStr]);

  const cambio = useMemo(() => {
    if (metodoPago !== 'efectivo' || total <= 0) return 0;
    return Math.max(0, Math.round((efectivoRecibido - total) * 100) / 100);
  }, [metodoPago, efectivoRecibido, total]);

  const efectivoInsuficiente =
    metodoPago === 'efectivo' && total > 0 && efectivoRecibidoStr.trim() !== '' && efectivoRecibido < total - 0.004;

  const maxQtyForLine = useCallback(
    (line) => {
      if (line.esServicio) return 99;
      const stock = stockById[line.productoId] ?? 0;
      const other = qtyOnCart(lines, line.productoId, line.id, line.volumenTrabajo);
      return Math.max(0, stock - other);
    },
    [lines, stockById],
  );

  const pushLine = (p, { precio, volumenTrabajo = null, nombreExtra = null }) => {
    const esServicio = getArticuloTipo(p) === 'servicio';
    const stock = Number(p.stock_actual ?? 0);
    if (!esServicio && stock < 1) {
      Alert.alert('Stock', 'Este producto no tiene stock disponible.');
      return;
    }
    const baseNombre = p.nombre || (esServicio ? 'Servicio' : 'Producto');
    const nombre = nombreExtra || baseNombre;
    setLines((prev) => {
      const idx = prev.findIndex(
        (l) =>
          l.productoId === p.id && (l.volumenTrabajo ?? null) === (volumenTrabajo ?? null),
      );
      if (idx >= 0) {
        const cur = prev[idx];
        if (!esServicio) {
          const other = qtyOnCart(prev, p.id, cur.id, volumenTrabajo);
          if (cur.qty + 1 > stock - other) return prev;
        }
        const next = [...prev];
        next[idx] = { ...cur, qty: cur.qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: `${p.id}-${volumenTrabajo || 'x'}-${Date.now()}`,
          productoId: p.id,
          nombre,
          precioUnit: precio,
          qty: 1,
          esServicio,
          volumenTrabajo,
        },
      ];
    });
    setProductoSearch('');
  };

  const addProductWithVolumen = (p, volumenId) => {
    const precio = precioServicioPorVolumen(p, volumenId);
    if (!(precio > 0)) {
      Alert.alert('Precio', 'Este nivel no tiene precio configurado en inventario.');
      return;
    }
    const volLabel = volumenTrabajoLabel(volumenId);
    pushLine(p, {
      precio,
      volumenTrabajo: volumenId,
      nombreExtra: volLabel ? `${p.nombre} (${volLabel})` : p.nombre,
    });
  };

  const addProduct = (p) => {
    if (servicioUsaPreciosPorVolumen(p)) {
      setVolumenPickProduct(p);
      return;
    }
    const precio = Number(p.precio_venta ?? 0);
    pushLine(p, { precio });
  };

  const closeVolumenPick = () => setVolumenPickProduct(null);

  const onPickVolumen = (volumenId) => {
    const p = volumenPickProduct;
    closeVolumenPick();
    if (p) addProductWithVolumen(p, volumenId);
  };

  const setLineQty = (lineId, nextQty) => {
    setLines((prev) => {
      const line = prev.find((l) => l.id === lineId);
      if (!line) return prev;
      let max = 99;
      if (!line.esServicio) {
        max = (stockById[line.productoId] ?? 0) - qtyOnCart(prev, line.productoId, lineId, line.volumenTrabajo);
        if (max < 1) return prev;
      }
      const q = Math.max(1, Math.min(max, Math.floor(nextQty)));
      return prev.map((l) => (l.id === lineId ? { ...l, qty: q } : l));
    });
  };

  const removeLine = (lineId) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const buildItemsPayload = () =>
    lines.map((l) => {
      const item = {
        producto_id: l.productoId,
        nombre: l.nombre,
        cantidad: l.qty,
        precio_unitario: l.precioUnit,
        subtotal: Math.round(l.qty * l.precioUnit * 100) / 100,
      };
      if (l.volumenTrabajo) item.volumen_trabajo = l.volumenTrabajo;
      return item;
    });

  const validateStock = () => {
    const byPid = {};
    for (const l of lines) {
      if (l.esServicio) continue;
      const key = `${l.productoId}`;
      byPid[key] = (byPid[key] || 0) + l.qty;
    }
    for (const key of Object.keys(byPid)) {
      const need = byPid[key];
      const have = stockById[key] ?? 0;
      if (need > have) {
        const name = lines.find((x) => String(x.productoId) === key && !x.esServicio)?.nombre || key;
        return `Stock insuficiente para «${name}»: pedís ${need}, hay ${have}.`;
      }
    }
    return null;
  };

  const registrarVenta = async () => {
    if (lines.length === 0) {
      Alert.alert('Venta', 'Agregá al menos un producto a la factura.');
      return;
    }
    const stockErr = validateStock();
    if (stockErr) {
      Alert.alert('Stock', stockErr);
      return;
    }
    if (descuentoNum > subtotal + 0.0001) {
      Alert.alert('Descuento', 'El descuento no puede ser mayor al subtotal.');
      return;
    }
    if (metodoPago === 'efectivo') {
      if (!efectivoRecibidoStr.trim()) {
        Alert.alert('Efectivo', 'Ingresá el monto que entregó el cliente.');
        return;
      }
      if (efectivoRecibido < total - 0.004) {
        Alert.alert('Efectivo', `Falta ${formatQ(total - efectivoRecibido)}. El recibido debe cubrir el total.`);
        return;
      }
    }

    const noFactura = nextNoFactura();
    const items = buildItemsPayload();

    setSubmitting(true);
    try {
      const { data: cajaAbierta } = await db.cajas.getCajaActual();
      const cajaId = cajaAbierta?.id ?? null;

      const profNombre = profesionalSel?.nombre?.trim() || profesionalSearch.trim() || null;

      const { error: vErr } = await db.ventas.create({
        cliente_id: clienteSel?.id ?? null,
        cliente_nombre: clienteSel?.nombre?.trim() || null,
        profesional: profNombre,
        vendedor_id: profesionalSel?.id ?? null,
        total,
        monto: total,
        metodo_pago: metodoPago,
        items,
        no_factura: noFactura,
        descuento: descuentoNum,
        notas: notas.trim() || null,
        caja_id: cajaId,
      });

      if (vErr) throw vErr;

      for (const l of lines) {
        if (l.esServicio) continue;
        const { error: dErr } = await db.inventario.decrementarStock(l.productoId, l.qty);
        if (dErr) {
          Alert.alert(
            'Inventario',
            `La venta quedó registrada (${noFactura}), pero hubo un error al descontar stock de «${l.nombre}». Revisá inventario manualmente.\n${dErr.message || ''}`,
          );
          await loadAll();
          resetFormPartial();
          return;
        }
      }

      await registrarMontoVentaEnMeta(total);

      try {
        await printVentaTicket({
          no_factura: noFactura,
          fecha: new Date().toISOString(),
          cliente_nombre: clienteSel?.nombre?.trim() || null,
          profesional: profNombre,
          items,
          subtotal,
          descuento: descuentoNum,
          total,
          metodo_pago: metodoPago,
          efectivo_recibido: metodoPago === 'efectivo' ? efectivoRecibido : null,
          cambio: metodoPago === 'efectivo' ? cambio : null,
          notas: notas.trim() || null,
        });
      } catch (printErr) {
        Alert.alert(
          'Venta guardada',
          `Folio ${noFactura} registrado, pero no se pudo abrir el ticket: ${printErr?.message || 'error de impresión'}.`,
        );
      }

      await loadAll();
      resetFormPartial();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo registrar la venta.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormPartial = () => {
    setLines([]);
    setDescuentoPctStr('');
    setEfectivoRecibidoStr('');
    setNotas('');
    setProductoSearch('');
    setProfesionalSel(null);
    setProfesionalSearch('');
  };

  if (loading) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={c.background} />
        <SubScreenChrome hideTitles onBack={onBack}>
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
        </SubScreenChrome>
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={c.background} />
      <SubScreenChrome hideTitles onBack={onBack} bottomPadding={padBottom}>
        <View style={styles.page}>
          <View style={styles.labelRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: c.card }]}>
              <User size={17} color={c.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.sectionLabel, { color: c.foreground }]}>Cliente</Text>
          </View>
            <SalonSearchBar
              value={clienteSearch}
              onChangeText={setClienteSearch}
              placeholder="Buscar cliente: nombre, teléfono o correo…"
              accessibilityLabel="Buscar cliente"
              style={{ borderColor: posAccent.inputBorder }}
            />
            {clienteSel ? (
              <View
                style={[
                  styles.chipSelected,
                  { borderColor: c.primary, backgroundColor: posAccent.sectionBg },
                ]}
              >
                <Text style={[styles.chipSelectedTxt, { color: c.foreground }]} numberOfLines={1}>
                  {clienteSel.nombre}
                  {clienteSel.telefono ? ` · ${clienteSel.telefono}` : ''}
                </Text>
                <TouchableOpacity onPress={() => setClienteSel(null)} hitSlop={10}>
                  <Text style={[styles.chipClear, { color: c.primary }]}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {!clienteSel && clienteSearch.trim().length >= 2 && clientesFiltrados.length === 0 ? (
              <Text style={[styles.pickHint, { color: c.foregroundMuted }]}>
                Sin coincidencias para «{clienteSearch.trim()}».
              </Text>
            ) : null}
            {!clienteSel && clientesFiltrados.length > 0 ? (
              <View
                style={[
                  styles.pickBlock,
                  { borderColor: posAccent.sectionBorder, backgroundColor: c.card },
                ]}
              >
                {clientesFiltrados.map((item) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[styles.pickTouch, { borderBottomColor: c.cardBorder }]}
                    onPress={() => {
                      setClienteSel(item);
                      setClienteSearch('');
                    }}
                  >
                    <Text style={[styles.pickName, { color: c.foreground }]} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <Text style={[styles.pickMeta, { color: c.foregroundMuted }]} numberOfLines={1}>
                      {item.telefono || item.email || '—'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={[styles.labelRow, { marginTop: spacing.lg }]}>
              <View style={[styles.sectionIconWrap, { backgroundColor: c.card }]}>
                <UserCog size={17} color={c.primary} strokeWidth={2.2} />
              </View>
              <Text style={[styles.sectionLabel, { color: c.foreground }]}>Profesional</Text>
            </View>
            <SalonSearchBar
              value={profesionalSearch}
              onChangeText={setProfesionalSearch}
              placeholder="Buscar profesional por nombre o rol…"
              accessibilityLabel="Buscar profesional"
              style={{ borderColor: posAccent.inputBorder }}
            />
            {profesionalSel ? (
              <View
                style={[
                  styles.chipSelected,
                  { borderColor: c.primary, backgroundColor: posAccent.sectionBg },
                ]}
              >
                <Text style={[styles.chipSelectedTxt, { color: c.foreground }]} numberOfLines={1}>
                  {profesionalSel.nombre}
                  {profesionalSel.rol ? ` · ${profesionalSel.rol}` : ''}
                </Text>
                <TouchableOpacity onPress={() => setProfesionalSel(null)} hitSlop={10}>
                  <Text style={[styles.chipClear, { color: c.primary }]}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {!profesionalSel && profesionalSearch.trim().length >= 2 && empleadosFiltrados.length === 0 ? (
              <Text style={[styles.pickHint, { color: c.foregroundMuted }]}>
                Sin coincidencias para «{profesionalSearch.trim()}».
              </Text>
            ) : null}
            {!profesionalSel && empleadosFiltrados.length > 0 ? (
              <View
                style={[
                  styles.pickBlock,
                  { borderColor: posAccent.sectionBorder, backgroundColor: c.card },
                ]}
              >
                {empleadosFiltrados.map((item) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[styles.pickTouch, { borderBottomColor: c.cardBorder }]}
                    onPress={() => {
                      setProfesionalSel(item);
                      setProfesionalSearch('');
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.pickName, { color: c.foreground }]} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      <Text style={[styles.pickMeta, { color: c.foregroundMuted }]} numberOfLines={1}>
                        {item.rol || 'Profesional'}
                        {item.telefono ? ` · ${item.telefono}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={[styles.labelRow, { marginTop: spacing.lg }]}>
              <View style={[styles.sectionIconWrap, { backgroundColor: c.card }]}>
                <Package size={17} color={c.primary} strokeWidth={2.2} />
              </View>
              <Text style={[styles.sectionLabel, { color: c.foreground }]}>Inventario</Text>
            </View>
            <SalonSearchBar
              value={productoSearch}
              onChangeText={setProductoSearch}
              placeholder="Buscar producto, servicio, categoría o código…"
              accessibilityLabel="Buscar inventario para vender"
              style={{ borderColor: posAccent.inputBorder }}
            />
            {productoSearch.trim().length > 0 ? (
              productosFiltrados.length > 0 ? (
                <View style={styles.suggestList}>
                  {productosFiltrados.map((item) => (
                    <TouchableOpacity
                      key={String(item.id)}
                      style={[styles.suggestRow, { borderBottomColor: c.cardBorder }]}
                      onPress={() => addProduct(item)}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.pickName, { color: c.foreground }]} numberOfLines={2}>
                          {item.nombre}
                        </Text>
                        <Text style={[styles.pickMeta, { color: c.foregroundMuted }]}>
                          {precioSugerenciaInventario(item)}
                          {servicioUsaPreciosPorVolumen(item)
                            ? ' · 4 precios (elegir al agregar)'
                            : getArticuloTipo(item) === 'servicio'
                              ? ' · Servicio'
                              : ` · Stock ${item.stock_actual ?? 0}`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.addBtn,
                          { borderColor: posAccent.sectionBorder, backgroundColor: posAccent.sectionBg },
                        ]}
                      >
                        <Text style={[styles.addBtnTxt, { color: c.primary }]}>+</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.hint, { color: c.foregroundMuted, marginBottom: spacing.sm }]}>
                  Sin coincidencias. Los productos requieren stock; los servicios aparecen aunque el stock sea 0.
                </Text>
              )
            ) : null}

            {lines.length > 0 ? (
              lines.map((line) => (
                <View
                  key={line.id}
                  style={[
                    styles.lineRow,
                    {
                      borderColor: c.cardBorder,
                      backgroundColor: c.card,
                      borderLeftColor: c.primary,
                    },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.lineName, { color: c.foreground }]} numberOfLines={2}>
                      {line.nombre}
                    </Text>
                    <Text style={[styles.pickMeta, { color: c.foregroundMuted }]}>
                      {formatQ(line.precioUnit)} c/u
                      {line.esServicio ? '' : ` · máx. ${maxQtyForLine(line)} u.`}
                    </Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={[styles.qtyBtn, { borderColor: posAccent.inputBorder, backgroundColor: c.background }]}
                      onPress={() => setLineQty(line.id, line.qty - 1)}
                      disabled={line.qty <= 1}
                    >
                      <Minus size={17} color={line.qty <= 1 ? c.foregroundSubtle : c.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyTxt, { color: c.foreground }]}>{line.qty}</Text>
                    <TouchableOpacity
                      style={[styles.qtyBtn, { borderColor: posAccent.inputBorder, backgroundColor: c.background }]}
                      onPress={() => setLineQty(line.id, line.qty + 1)}
                      disabled={line.qty >= maxQtyForLine(line)}
                    >
                      <Plus
                        size={17}
                        color={line.qty >= maxQtyForLine(line) ? c.foregroundSubtle : c.primary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.lineAmt, { color: c.foreground }]}>{formatQ(line.qty * line.precioUnit)}</Text>
                  <TouchableOpacity onPress={() => removeLine(line.id)} hitSlop={12} style={styles.trashBtn}>
                    <Trash2 size={18} color={c.foregroundMuted} />
                  </TouchableOpacity>
                </View>
              ))
            ) : productoSearch.trim().length === 0 ? (
              <Text style={[styles.hint, { color: c.foregroundMuted, marginBottom: 0 }]}>
                Escribí en la búsqueda para agregar productos (con stock) o servicios.
              </Text>
            ) : null}

            <Text style={[styles.checkoutTitle, { color: c.primary }]}>Resumen y cobro</Text>

            <View
              style={[
                styles.totalBlock,
                {
                  borderTopColor: c.cardBorder,
                },
              ]}
            >
              <View style={styles.totalRow}>
                <Text style={[styles.totalMuted, { color: c.foregroundMuted }]}>Subtotal</Text>
                <Text style={[styles.totalFig, { color: c.foreground }]}>{formatQ(subtotal)}</Text>
              </View>
              <Text style={[styles.fieldLbl, { color: c.foreground }]}>Descuento (%)</Text>
              <View style={styles.discountRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.discountInput,
                    {
                      borderColor: posAccent.inputBorder,
                      color: c.foreground,
                      backgroundColor: c.backgroundAlt ?? c.surfaceMuted,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={c.foregroundSubtle}
                  value={descuentoPctStr}
                  onChangeText={(t) => setDescuentoPctStr(sanitizeDescuentoPct(t))}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                />
                <View style={[styles.percentBox, { borderColor: posAccent.inputBorder, backgroundColor: c.card }]}>
                  <Text style={[styles.percentBoxTxt, { color: c.foregroundMuted }]}>%</Text>
                </View>
              </View>
              <Text style={[styles.hint, { color: c.foregroundMuted, marginTop: 0 }]}>
                {descuentoPct > 0
                  ? `Descuento: ${formatQ(descuentoNum)} (${descuentoPct}%)`
                  : 'Escribí el porcentaje sin símbolo; el monto se calcula del subtotal.'}
              </Text>
              <View style={[styles.grandRow, { borderTopColor: c.cardBorder }]}>
                <Text style={[styles.grandLbl, { color: c.foreground }]}>Total</Text>
                <Text style={[styles.grandVal, { color: c.primary }]}>{formatQ(total)}</Text>
              </View>
            </View>

            <Text style={[styles.fieldLbl, { color: c.foreground, marginTop: spacing.md }]}>Pago</Text>
            <View style={styles.payRow}>
              {METODOS.map((m) => {
                const on = metodoPago === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setMetodoPago(m.id)}
                    activeOpacity={0.85}
                    style={[
                      styles.payChip,
                      {
                        borderColor: on ? c.primary : c.cardBorder,
                        backgroundColor: on ? c.primary : c.card,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.payChipTxt, { color: on ? c.heroCtaText : c.foregroundMuted }]}
                      numberOfLines={1}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {metodoPago === 'efectivo' ? (
              <View
                style={[
                  styles.efectivoBlock,
                  {
                    borderColor: posAccent.sectionBorder,
                    backgroundColor: posAccent.sectionBg,
                  },
                ]}
              >
                <Text style={[styles.fieldLbl, { color: c.foreground, marginTop: 0 }]}>Efectivo del cliente</Text>
                <Text style={[styles.hint, { color: c.foregroundMuted, marginTop: 0 }]}>
                  Monto que entrega el cliente; el cambio se calcula solo.
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.efectivoInput,
                    {
                      borderColor: efectivoInsuficiente ? '#C62828' : posAccent.inputBorder,
                      color: c.foreground,
                      backgroundColor: c.card,
                    },
                  ]}
                  placeholder={total > 0 ? formatQ(total) : '0.00'}
                  placeholderTextColor={c.foregroundSubtle}
                  value={efectivoRecibidoStr}
                  onChangeText={(t) => setEfectivoRecibidoStr(sanitizeMontoInput(t))}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                />
                <View style={styles.cambioRow}>
                  <Text style={[styles.cambioLbl, { color: c.foregroundMuted }]}>Cambio a entregar</Text>
                  <Text
                    style={[
                      styles.cambioVal,
                      {
                        color: efectivoInsuficiente ? '#C62828' : c.primary,
                      },
                    ]}
                  >
                    {efectivoRecibidoStr.trim() ? formatQ(cambio) : '—'}
                  </Text>
                </View>
                {efectivoInsuficiente ? (
                  <Text style={styles.cambioWarn}>El monto recibido es menor al total ({formatQ(total)}).</Text>
                ) : null}
              </View>
            ) : null}

            <Text style={[styles.fieldLbl, { color: c.foreground }]}>Notas</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  borderColor: posAccent.inputBorder,
                  color: c.foreground,
                  backgroundColor: c.card,
                },
              ]}
              placeholder="Opcional"
              placeholderTextColor={c.foregroundSubtle}
              value={notas}
              onChangeText={setNotas}
              multiline
            />

            <SalonButton
              title={submitting ? 'Registrando…' : 'Crear factura y registrar venta'}
              variant="heroGold"
              fullWidth
              disabled={submitting || lines.length === 0}
              onPress={registrarVenta}
              style={{ marginTop: spacing.sm }}
            />
        </View>
      </SubScreenChrome>

      <Modal
        visible={!!volumenPickProduct}
        transparent
        animationType="fade"
        onRequestClose={closeVolumenPick}
      >
        <Pressable style={styles.volOverlay} onPress={closeVolumenPick}>
          <Pressable
            style={[styles.volSheet, { backgroundColor: c.card, borderColor: c.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.volTitle, { color: c.foreground }]}>
              {volumenPickProduct?.nombre || 'Servicio'}
            </Text>
            <Text style={[styles.volSub, { color: c.foregroundMuted }]}>
              Elegí el volumen de trabajo (define el precio):
            </Text>
            {VOLUMEN_TRABAJO_OPCIONES.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.volOpt, { borderColor: c.cardBorder }]}
                onPress={() => onPickVolumen(opt.id)}
              >
                <Text style={[styles.volOptLbl, { color: c.foreground }]}>{opt.label}</Text>
                <Text style={[styles.volOptPrice, { color: c.primary }]}>
                  {formatQ(precioServicioPorVolumen(volumenPickProduct, opt.id))}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.volCancel} onPress={closeVolumenPick}>
              <Text style={[styles.volCancelTxt, { color: c.foregroundMuted }]}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles() {
  return StyleSheet.create({
    page: {
      flex: 1,
      paddingBottom: spacing.sm,
    },
    checkoutTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    sectionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    sectionLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    hint: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
      marginBottom: spacing.sm,
      fontFamily: typography.fontSans,
      fontSize: 15,
    },
    textArea: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    chipSelected: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    chipSelectedTxt: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      marginRight: spacing.sm,
    },
    chipClear: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    pickBlock: {
      borderRadius: radii.md,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    },
    suggestList: {
      marginBottom: spacing.sm,
    },
    suggestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
    },
    pickTouch: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
    },
    pickName: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    pickMeta: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginTop: 2,
    },
    pickHint: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 20,
      marginTop: -1,
    },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderLeftWidth: 4,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    lineName: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    lineAmt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      minWidth: 72,
      textAlign: 'right',
    },
    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    qtyBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      minWidth: 28,
      textAlign: 'center',
    },
    trashBtn: {
      padding: spacing.xs,
    },
    volOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    volSheet: {
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.lg,
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
    },
    volTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 18,
      marginBottom: spacing.xs,
    },
    volSub: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      marginBottom: spacing.md,
    },
    volOpt: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radii.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    volOptLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
    },
    volOptPrice: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
    },
    volCancel: {
      alignItems: 'center',
      paddingTop: spacing.sm,
    },
    volCancelTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    totalBlock: {
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    totalMuted: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    totalFig: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.xs,
    },
    grandRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    grandLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
    },
    grandVal: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
    },
    payRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    payChip: {
      flex: 1,
      minWidth: 0,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payChipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    efectivoBlock: {
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    efectivoInput: {
      fontSize: 22,
      fontFamily: typography.fontSansMedium,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    cambioRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cambioLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    cambioVal: {
      fontFamily: typography.fontDisplay,
      fontSize: 26,
    },
    cambioWarn: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: '#C62828',
      marginTop: spacing.xs,
    },
    discountRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    discountInput: {
      flex: 1,
      marginBottom: 0,
    },
    percentBox: {
      width: 48,
      borderWidth: 1,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    percentBoxTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
    },
  });
}
