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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Minus, Plus, Trash2, User, Package } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

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

/** Miles con punto, decimales con coma (2 cifras), p. ej. 1.250,50 */
function formatDescuentoMonto(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return '0,00';
  const [intRaw, dec = '00'] = x.toFixed(2).split('.');
  const intPart = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intPart},${dec}`;
}

function parseDescuentoMonto(s) {
  const t = String(s || '').trim();
  if (!t) return 0;
  const noThousands = t.replace(/\./g, '');
  const normalized = noThousands.replace(',', '.');
  const x = parseFloat(normalized);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

function sanitizeDescuentoTyping(t) {
  let out = String(t || '').replace(/[^\d.,]/g, '');
  const comma = out.indexOf(',');
  const dot = out.indexOf('.');
  if (comma >= 0 && dot >= 0) {
    if (comma < dot) out = out.replace(/,/g, '');
    else out = out.replace(/\./g, '');
  }
  const sep = out.includes(',') ? ',' : out.includes('.') ? '.' : null;
  if (sep) {
    const parts = out.split(sep);
    if (parts.length > 2) out = `${parts[0]}${sep}${parts.slice(1).join('').slice(0, 2)}`;
    else if (parts[1] && parts[1].length > 2) out = `${parts[0]}${sep}${parts[1].slice(0, 2)}`;
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

function qtyOnCart(lines, productoId, exceptLineId) {
  return lines
    .filter((l) => l.productoId === productoId && l.id !== exceptLineId)
    .reduce((s, l) => s + l.qty, 0);
}

export function VenderScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(), []);

  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [productoSearch, setProductoSearch] = useState('');
  const [clienteSel, setClienteSel] = useState(null);
  const [lines, setLines] = useState([]);
  const [descuentoStr, setDescuentoStr] = useState('0,00');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      const [rCli, rInv] = await Promise.all([db.clientes.getAll(), db.inventario.getAll()]);
      if (rCli.error) throw rCli.error;
      if (rInv.error) throw rInv.error;
      setClientes(Array.isArray(rCli.data) ? rCli.data : []);
      setInventario(Array.isArray(rInv.data) ? rInv.data : []);
    } catch (e) {
      Alert.alert('Vender', e?.message || 'No se pudieron cargar clientes o inventario.');
      setClientes([]);
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
    if (!q) return clientes.slice(0, 40);
    return clientes
      .filter((row) => {
        const blob = [row.nombre, row.telefono, row.email].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 60);
  }, [clientes, clienteSearch]);

  const productosFiltrados = useMemo(() => {
    const q = productoSearch.trim().toLowerCase();
    if (!q) return [];
    return inventario
      .filter((p) => {
        const blob = [p.nombre, p.categoria, p.barcode].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q) && Number(p.stock_actual ?? 0) > 0;
      })
      .slice(0, 50);
  }, [inventario, productoSearch]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.precioUnit, 0),
    [lines],
  );

  const descuentoNum = useMemo(() => parseDescuentoMonto(descuentoStr), [descuentoStr]);

  const total = useMemo(() => Math.max(0, subtotal - descuentoNum), [subtotal, descuentoNum]);

  const maxQtyForLine = useCallback(
    (line) => {
      const stock = stockById[line.productoId] ?? 0;
      const other = qtyOnCart(lines, line.productoId, line.id);
      return Math.max(0, stock - other);
    },
    [lines, stockById],
  );

  const addProduct = (p) => {
    const stock = Number(p.stock_actual ?? 0);
    if (stock < 1) {
      Alert.alert('Stock', 'Este producto no tiene stock disponible.');
      return;
    }
    const precio = Number(p.precio_venta ?? 0);
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productoId === p.id);
      if (idx >= 0) {
        const cur = prev[idx];
        const other = qtyOnCart(prev, p.id, cur.id);
        if (cur.qty + 1 > stock - other) return prev;
        const next = [...prev];
        next[idx] = { ...cur, qty: cur.qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: `${p.id}-${Date.now()}`,
          productoId: p.id,
          nombre: p.nombre || 'Producto',
          precioUnit: precio,
          qty: 1,
        },
      ];
    });
    setProductoSearch('');
  };

  const setLineQty = (lineId, nextQty) => {
    setLines((prev) => {
      const line = prev.find((l) => l.id === lineId);
      if (!line) return prev;
      const max = (stockById[line.productoId] ?? 0) - qtyOnCart(prev, line.productoId, lineId);
      if (max < 1) return prev;
      const q = Math.max(1, Math.min(max, Math.floor(nextQty)));
      return prev.map((l) => (l.id === lineId ? { ...l, qty: q } : l));
    });
  };

  const removeLine = (lineId) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const buildItemsPayload = () =>
    lines.map((l) => ({
      producto_id: l.productoId,
      nombre: l.nombre,
      cantidad: l.qty,
      precio_unitario: l.precioUnit,
      subtotal: Math.round(l.qty * l.precioUnit * 100) / 100,
    }));

  const validateStock = () => {
    const byPid = {};
    for (const l of lines) {
      byPid[l.productoId] = (byPid[l.productoId] || 0) + l.qty;
    }
    for (const pid of Object.keys(byPid)) {
      const need = byPid[pid];
      const have = stockById[pid] ?? 0;
      if (need > have) {
        const name = lines.find((x) => x.productoId === pid)?.nombre || pid;
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

    const noFactura = nextNoFactura();
    const items = buildItemsPayload();
    const clienteNombre = clienteSel?.nombre?.trim() || 'Mostrador';

    setSubmitting(true);
    try {
      const { error: vErr } = await db.ventas.create({
        cliente_id: clienteSel?.id ?? null,
        cliente_nombre: clienteSel ? clienteSel.nombre : clienteNombre,
        total,
        monto: total,
        metodo_pago: metodoPago,
        items,
        no_factura: noFactura,
        descuento: descuentoNum,
        notas: notas.trim() || null,
      });

      if (vErr) throw vErr;

      for (const l of lines) {
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

      Alert.alert(
        'Factura creada',
        `Folio: ${noFactura}\nTotal: ${formatQ(total)}\nPago: ${metodoPago}`,
        [{ text: 'OK', onPress: () => {} }],
      );
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
    setDescuentoStr('0,00');
    setNotas('');
    setProductoSearch('');
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
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: posAccent.inputBorder,
                  color: c.foreground,
                  backgroundColor: c.card,
                },
              ]}
              placeholder="Buscar nombre, teléfono o correo…"
              placeholderTextColor={c.foregroundSubtle}
              value={clienteSearch}
              onChangeText={setClienteSearch}
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
                <Package size={17} color={c.primary} strokeWidth={2.2} />
              </View>
              <Text style={[styles.sectionLabel, { color: c.foreground }]}>Inventario</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: posAccent.inputBorder,
                  color: c.foreground,
                  backgroundColor: c.card,
                },
              ]}
              placeholder="Buscar producto, categoría o código…"
              placeholderTextColor={c.foregroundSubtle}
              value={productoSearch}
              onChangeText={setProductoSearch}
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
                          {formatQ(item.precio_venta)} · Stock {item.stock_actual ?? 0}
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
                  Sin coincidencias con stock.
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
                      {formatQ(line.precioUnit)} c/u · máx. {maxQtyForLine(line)} u.
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
                Escribí en la búsqueda para elegir productos o servicios con stock.
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
              <Text style={[styles.fieldLbl, { color: c.foreground }]}>Descuento (Q)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: posAccent.inputBorder,
                    color: c.foreground,
                    backgroundColor: c.backgroundAlt ?? c.surfaceMuted,
                  },
                ]}
                placeholder="0,00"
                placeholderTextColor={c.foregroundSubtle}
                value={descuentoStr}
                onChangeText={(t) => setDescuentoStr(sanitizeDescuentoTyping(t))}
                onBlur={() => {
                  const n = parseDescuentoMonto(descuentoStr);
                  setDescuentoStr(formatDescuentoMonto(n));
                }}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              />
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
  });
}
