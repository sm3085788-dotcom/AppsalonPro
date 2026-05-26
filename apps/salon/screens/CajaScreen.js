import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  TrendingUp,
  TrendingDown,
  RotateCcw,
  RefreshCw,
  FileText,
  QrCode,
  Lock,
} from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, supabase } from '@appsalon/shared-config';
import { SubScreenChrome, useSubStyles, SalonButton, modalSheetBottomPad, modalScrollBottomPad } from '../components/luxury';
import { useSalonPullRefresh } from '../hooks/useSalonPullRefresh';
import { useTheme } from '../theme/ThemeProvider';
import {
  clearCajaSession,
  getCajaChicaSaldo,
  getCajaSession,
  loadCajaTxs,
  setCajaChicaSaldo,
  setCajaSession,
} from '../services/salonCajaSession';

const TX_FEED_VISIBLE = 10;
const Q = 'Q';

const INGRESO_TIPOS = [
  { id: 'i1', label: 'Propina no registrada en POS' },
  { id: 'i2', label: 'Efectivo cobrado fuera de ticket' },
  { id: 'i3', label: 'Reembolso de gasto menor (cliente)' },
  { id: 'i4', label: 'Ajuste de redondeo a favor de caja' },
];

const EGRESO_TIPOS = [
  { id: 'e1', label: 'Cambio mal entregado al cliente' },
  { id: 'e2', label: 'Gasto de envío / delivery emergente' },
  { id: 'e3', label: 'Compra rápida de insumos (sin factura formal)' },
  { id: 'e4', label: 'Faltante en arqueo parcial' },
];

function parseAmount(str) {
  const n = Number(String(str || '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatQ(n) {
  return `${Q} ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nowLabel() {
  return new Date().toLocaleString('es-GT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Caja: apertura, movimientos locales del turno y cierre con PDF.
 */
export function CajaScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);
  /** Ref (no variable de módulo): evita keys duplicadas tras Fast Refresh de Metro. */
  const txSeqRef = useRef(0);
  const makeTxId = useCallback(() => {
    txSeqRef.current += 1;
    return `tx-${Date.now()}-${txSeqRef.current}`;
  }, []);

  const [view, setView] = useState('gate');
  const [adminApertura, setAdminApertura] = useState('');
  const [cajaChicaStr, setCajaChicaStr] = useState('');
  const [montoApertura, setMontoApertura] = useState('');
  const [gerenteCierre, setGerenteCierre] = useState('');
  const [administradorCierre, setAdministradorCierre] = useState('');
  const [txs, setTxs] = useState([]);
  const [metaApertura, setMetaApertura] = useState(null);

  const [modalIngresos, setModalIngresos] = useState(false);
  const [modalEgresos, setModalEgresos] = useState(false);
  const [modalDev, setModalDev] = useState(false);
  const [modalCambio, setModalCambio] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);

  const [ingresoTipoId, setIngresoTipoId] = useState(null);
  const [ingresoNota, setIngresoNota] = useState('');
  const [ingresoMonto, setIngresoMonto] = useState('');
  const [egresoTipoId, setEgresoTipoId] = useState(null);
  const [egresoNota, setEgresoNota] = useState('');
  const [egresoMonto, setEgresoMonto] = useState('');

  const [facturaDev, setFacturaDev] = useState('');
  const [qrDev, setQrDev] = useState(false);
  const [facturaCambio, setFacturaCambio] = useState('');
  const [qrCambio, setQrCambio] = useState(false);
  const [feedExpanded, setFeedExpanded] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [highlightTxIds, setHighlightTxIds] = useState(() => new Set());
  const prevTxIdsRef = useRef(new Set());

  const cajaId = metaApertura?.cajaId ?? null;

  const refreshTxsFromDb = useCallback(async (id) => {
    if (!id) return;
    try {
      const rows = await loadCajaTxs(id);
      const prev = prevTxIdsRef.current;
      const nuevasVentas = rows.filter((r) => r.kind === 'venta_producto' && !prev.has(r.id));
      if (nuevasVentas.length) {
        setHighlightTxIds((h) => {
          const next = new Set(h);
          nuevasVentas.forEach((r) => next.add(r.id));
          return next;
        });
        setTimeout(() => {
          setHighlightTxIds((h) => {
            const next = new Set(h);
            nuevasVentas.forEach((r) => next.delete(r.id));
            return next;
          });
        }, 5000);
      }
      prevTxIdsRef.current = new Set(rows.map((r) => r.id));
      setTxs(rows);
    } catch (e) {
      if (__DEV__) console.warn('Caja refresh', e);
    }
  }, []);

  const reloadCajaScreen = useCallback(async () => {
    try {
      const { data: caja } = await db.cajas.getCajaActual();
      if (caja?.id && caja.estado === 'abierta') {
        const session = await getCajaSession();
        const nombre = caja.responsable_apertura || caja.responsable || session?.nombre || '—';
        const monto = Number(caja.monto_apertura ?? session?.monto ?? 0);
        setMetaApertura({
          cajaId: caja.id,
          nombre,
          monto,
          abierto: session?.abierto || nowLabel(),
        });
        setView('dash');
        await refreshTxsFromDb(caja.id);
      } else {
        const chica = await getCajaChicaSaldo();
        setCajaChicaStr(chica > 0 ? String(chica) : '');
      }
    } catch (e) {
      if (__DEV__) console.warn('Caja pull refresh', e);
    }
  }, [refreshTxsFromDb]);

  const { refreshControl } = useSalonPullRefresh(reloadCajaScreen);

  const pushTx = useCallback(
    (row) => {
      setTxs((prev) => [{ id: makeTxId(), ts: Date.now(), ...row }, ...prev]);
    },
    [makeTxId],
  );

  useEffect(() => {
    if (view === 'gate') setFeedExpanded(false);
  }, [view]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: caja } = await db.cajas.getCajaActual();
        if (cancelled) return;
        if (caja?.id && caja.estado === 'abierta') {
          const session = await getCajaSession();
          const nombre = caja.responsable_apertura || caja.responsable || session?.nombre || '—';
          const monto = Number(caja.monto_apertura ?? session?.monto ?? 0);
          setMetaApertura({
            cajaId: caja.id,
            nombre,
            monto,
            abierto: session?.abierto || nowLabel(),
          });
          setView('dash');
          await refreshTxsFromDb(caja.id);
        } else {
          await clearCajaSession();
        }
      } catch (e) {
        if (__DEV__) console.warn('Caja restore', e);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTxsFromDb]);

  useEffect(() => {
    if (view !== 'dash' || !cajaId) return undefined;
    const id = setInterval(() => {
      refreshTxsFromDb(cajaId);
    }, 4000);
    return () => clearInterval(id);
  }, [view, cajaId, refreshTxsFromDb]);

  useEffect(() => {
    if (view !== 'dash' || !cajaId) return undefined;
    const channel = supabase
      .channel(`caja-ventas-live-${cajaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas', filter: `caja_id=eq.${cajaId}` },
        () => {
          void refreshTxsFromDb(cajaId);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, cajaId, refreshTxsFromDb]);

  const totalEntrante = useMemo(() => {
    return txs.reduce((s, t) => s + (t.signo || 0) * (t.monto || 0), 0);
  }, [txs]);

  const feedTxs = useMemo(() => {
    if (feedExpanded || txs.length <= TX_FEED_VISIBLE) return txs;
    return txs.slice(0, TX_FEED_VISIBLE);
  }, [txs, feedExpanded]);

  const feedHiddenCount = txs.length > TX_FEED_VISIBLE ? txs.length - TX_FEED_VISIBLE : 0;

  useEffect(() => {
    if (view !== 'gate') return;
    let alive = true;
    (async () => {
      const saldo = await getCajaChicaSaldo();
      if (!alive) return;
      setCajaChicaStr(saldo > 0 ? String(saldo) : '');
    })();
    return () => {
      alive = false;
    };
  }, [view]);

  const cajaChicaNum = useMemo(() => parseAmount(cajaChicaStr), [cajaChicaStr]);
  const montoAperturaNum = useMemo(() => parseAmount(montoApertura), [montoApertura]);
  const cajaChicaTrasApertura = useMemo(
    () => Math.max(0, Math.round((cajaChicaNum - montoAperturaNum) * 100) / 100),
    [cajaChicaNum, montoAperturaNum],
  );
  const chicaInsuficiente = montoAperturaNum > 0 && cajaChicaNum + 0.004 < montoAperturaNum;

  const guardarSaldoCajaChica = async () => {
    const n = parseAmount(cajaChicaStr);
    await setCajaChicaSaldo(n);
    setCajaChicaStr(n > 0 ? String(n) : '');
    Alert.alert('Caja chica', `Saldo guardado: ${formatQ(n)}`);
  };

  const abrirCaja = async () => {
    const nom = adminApertura.trim();
    const m = parseAmount(montoApertura);
    if (!nom) {
      Alert.alert('Dato requerido', 'Ingresá el nombre del administrador responsable.');
      return;
    }
    if (m <= 0) {
      Alert.alert('Dato requerido', 'Ingresá un monto inicial mayor a 0.');
      return;
    }
    const chica = parseAmount(cajaChicaStr);
    if (chica + 0.004 < m) {
      Alert.alert(
        'Caja chica',
        `El monto inicial (${formatQ(m)}) supera el saldo de caja chica (${formatQ(chica)}). Ajustá el saldo o el monto a pasar a caja.`,
      );
      return;
    }
    setAbriendo(true);
    try {
      const nuevoSaldoChica = await setCajaChicaSaldo(chica - m);
      setCajaChicaStr(nuevoSaldoChica > 0 ? String(nuevoSaldoChica) : '');
      const { data: existente } = await db.cajas.getCajaActual();
      if (existente?.id) {
        const session = await getCajaSession();
        setMetaApertura({
          cajaId: existente.id,
          nombre: existente.responsable_apertura || existente.responsable || nom,
          monto: Number(existente.monto_apertura ?? m),
          abierto: session?.abierto || nowLabel(),
        });
        setView('dash');
        await refreshTxsFromDb(existente.id);
        Alert.alert('Caja', 'Ya hay una caja abierta; se restauró el turno activo.');
        return;
      }

      const { data: nueva, error } = await db.cajas.abrir({
        monto_apertura: m,
        responsable: nom,
        responsable_apertura: nom,
      });
      if (error) throw error;
      if (!nueva?.id) throw new Error('No se pudo crear la caja.');

      const { error: movErr } = await db.movimientosCaja.registrarApertura(
        nueva.id,
        m,
        `Responsable: ${nom} · ${formatQ(m)} desde caja chica (queda ${formatQ(nuevoSaldoChica)})`,
      );
      if (movErr) throw movErr;

      const abierto = nowLabel();
      await setCajaSession({ cajaId: nueva.id, nombre: nom, monto: m, abierto });
      setMetaApertura({ cajaId: nueva.id, nombre: nom, monto: m, abierto });
      setView('dash');
      await refreshTxsFromDb(nueva.id);
    } catch (e) {
      Alert.alert('Caja', e?.message || 'No se pudo abrir la caja.');
    } finally {
      setAbriendo(false);
    }
  };

  const registrarIngresos = async () => {
    if (!ingresoTipoId) {
      Alert.alert('Tipo', 'Elegí una sugerencia de ingreso.');
      return;
    }
    const m = parseAmount(ingresoMonto);
    if (m <= 0) {
      Alert.alert('Monto', 'Ingresá un monto mayor a 0.');
      return;
    }
    const tipo = INGRESO_TIPOS.find((t) => t.id === ingresoTipoId);
    const nota = ingresoNota.trim() || '—';
    const desc = `${tipo?.label || 'Ingreso'}${nota !== '—' ? ` · ${nota}` : ''}`;

    if (cajaId) {
      const { error } = await db.movimientosCaja.registrarIngreso(cajaId, m, desc);
      if (error) {
        Alert.alert('Ingreso', error.message || 'No se pudo registrar en caja.');
        return;
      }
      await refreshTxsFromDb(cajaId);
    } else {
      pushTx({
        kind: 'ingreso',
        titulo: tipo?.label || 'Ingreso',
        detalle: nota,
        monto: m,
        signo: 1,
      });
    }
    setIngresoTipoId(null);
    setIngresoNota('');
    setIngresoMonto('');
    setModalIngresos(false);
  };

  const registrarEgresos = async () => {
    if (!egresoTipoId) {
      Alert.alert('Tipo', 'Elegí una sugerencia de egreso.');
      return;
    }
    const m = parseAmount(egresoMonto);
    if (m <= 0) {
      Alert.alert('Monto', 'Ingresá un monto mayor a 0.');
      return;
    }
    const tipo = EGRESO_TIPOS.find((t) => t.id === egresoTipoId);
    const nota = egresoNota.trim() || '—';
    const desc = `${tipo?.label || 'Egreso'}${nota !== '—' ? ` · ${nota}` : ''}`;

    if (cajaId) {
      const { error } = await db.movimientosCaja.registrarEgreso(cajaId, m, desc);
      if (error) {
        Alert.alert('Egreso', error.message || 'No se pudo registrar en caja.');
        return;
      }
      await refreshTxsFromDb(cajaId);
    } else {
      pushTx({
        kind: 'egreso',
        titulo: tipo?.label || 'Egreso',
        detalle: nota,
        monto: m,
        signo: -1,
      });
    }
    setEgresoTipoId(null);
    setEgresoNota('');
    setEgresoMonto('');
    setModalEgresos(false);
  };

  const registrarDevolucion = () => {
    const f = facturaDev.trim();
    if (!f) {
      Alert.alert('Factura', 'Ingresá número o folio de factura.');
      return;
    }
    pushTx({
      kind: 'devolucion',
      titulo: 'Devolución',
      detalle: `Factura ${f}${qrDev ? ' · QR verificado' : ''}`,
      monto: 0,
      signo: 0,
    });
    setFacturaDev('');
    setQrDev(false);
    setModalDev(false);
  };

  const registrarCambio = () => {
    const f = facturaCambio.trim();
    if (!f) {
      Alert.alert('Factura', 'Ingresá número o folio de factura.');
      return;
    }
    pushTx({
      kind: 'cambio',
      titulo: 'Cambio de producto',
      detalle: `Factura ${f}${qrCambio ? ' · QR verificado' : ''}`,
      monto: 0,
      signo: 0,
    });
    setFacturaCambio('');
    setQrCambio(false);
    setModalCambio(false);
  };

  const generarPdfCierre = async () => {
    const nomGer = gerenteCierre.trim();
    const nomAdm = administradorCierre.trim();
    if (!nomGer) {
      Alert.alert('Cierre', 'Ingresá el nombre del gerente que firma el cierre.');
      return;
    }
    if (!nomAdm) {
      Alert.alert('Cierre', 'Ingresá el nombre del administrador que firma el cierre.');
      return;
    }
    if (!metaApertura) return;

    const rowsHtml = txs
      .map(
        (t) => `
      <tr>
        <td>${escHtml(new Date(t.ts).toLocaleString('es-GT'))}</td>
        <td>${escHtml(t.kind)}</td>
        <td>${escHtml(t.titulo)}</td>
        <td>${escHtml(t.productos || '—')}</td>
        <td>${escHtml(t.detalle || '')}</td>
        <td style="text-align:right">${t.signo === -1 ? '-' : ''}${formatQ(t.monto || 0)}</td>
      </tr>`,
      )
      .join('');

    const admEsc = escHtml(nomAdm);
    const gerEsc = escHtml(nomGer);
    const apNombre = escHtml(metaApertura.nombre);
    const apAbierto = escHtml(metaApertura.abierto);

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Reporte de caja</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #222; }
  h1 { font-size: 20px; }
  h2 { font-size: 15px; margin-top: 24px; }
  .movimientos { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  .movimientos th, .movimientos td { border: 1px solid #ccc; padding: 8px; vertical-align: top; }
  .movimientos th { background: #f4f4f4; text-align: left; }
  .tot { font-size: 18px; font-weight: 700; margin-top: 20px; }
  .sig-wrap { margin-top: 36px; page-break-inside: avoid; }
  .sig-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
  .sig-row { display: flex; flex-wrap: wrap; gap: 40px; margin-top: 8px; }
  .sig-col { flex: 1; min-width: 200px; }
  .sig-role { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; margin-bottom: 6px; }
  .sig-line {
    border: none;
    border-bottom: 1px solid #222;
    padding-top: 36px;
    margin: 0 0 10px 0;
    background: transparent;
  }
  .sig-name { font-size: 13px; font-weight: 600; color: #222; }
</style></head><body>
  <h1>Reporte de caja — App Andrea Control</h1>
  <p><strong>Apertura de turno:</strong> ${apNombre} · ${apAbierto}</p>
  <p><strong>Monto inicial en caja:</strong> ${formatQ(metaApertura.monto)}</p>
  <p><strong>Cierre registrado:</strong> ${escHtml(nowLabel())}</p>
  <p><strong>Saldo final:</strong> <span class="tot">${formatQ(totalEntrante)}</span></p>
  <h2>Movimientos</h2>
  <table class="movimientos">
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Productos</th><th>Detalle</th><th>Monto</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="sig-wrap">
    <div class="sig-title">Firmas de conformidad</div>
    <div class="sig-row">
      <div class="sig-col">
        <div class="sig-role">Administrador</div>
        <div class="sig-line"></div>
        <div class="sig-name">${admEsc}</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Gerente</div>
        <div class="sig-line"></div>
        <div class="sig-name">${gerEsc}</div>
      </div>
    </div>
  </div>
  <p style="margin-top:24px;font-size:11px;color:#666;">Documento generado desde la app del salón.</p>
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Guardar o compartir PDF de caja',
        });
      } else {
        Alert.alert('PDF listo', `Archivo en: ${uri}`);
      }
      setModalCierre(false);
      if (cajaId) {
        await db.movimientosCaja.registrarCierre(cajaId, totalEntrante, 'Cierre de turno');
        await db.cajas.cerrar(cajaId, {
          monto_cierre: totalEntrante,
          responsable_cierre: nomAdm,
        });
        await clearCajaSession();
      }
      setView('gate');
      setTxs([]);
      setMetaApertura(null);
      setAdminApertura('');
      setMontoApertura('');
      setGerenteCierre('');
      setAdministradorCierre('');
      Alert.alert('Caja cerrada', 'PDF generado. Sesión reiniciada; podés abrir una nueva caja.');
    } catch (e) {
      Alert.alert('PDF', 'No se pudo generar el PDF en este dispositivo.');
      if (__DEV__) console.warn(e);
    }
  };

  const kindBadge = (kind) => {
    switch (kind) {
      case 'apertura':
        return { bg: '#E3F2FD', fg: '#1565C0', txt: 'Apertura' };
      case 'ingreso':
        return { bg: '#E8F5E9', fg: '#2E7D32', txt: 'Ingreso' };
      case 'egreso':
        return { bg: '#FFEBEE', fg: '#C62828', txt: 'Egreso' };
      case 'devolucion':
        return { bg: '#FFF3E0', fg: '#E65100', txt: 'Devolución' };
      case 'cambio':
        return { bg: '#F3E5F5', fg: '#6A1B9A', txt: 'Cambio' };
      case 'venta_producto':
        return { bg: '#ECEFF1', fg: '#37474F', txt: 'Venta producto' };
      case 'venta_servicio':
        return { bg: '#E0F2F1', fg: '#00695C', txt: 'Venta servicio' };
      case 'venta_app':
        return { bg: '#FBE9E7', fg: '#BF360C', txt: 'Venta app' };
      default:
        return { bg: c.surfaceMuted, fg: c.foregroundMuted, txt: kind };
    }
  };

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.lg);

  if (restoring && view === 'gate') {
    return (
      <View style={[styles.shell, { backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text style={[subStyles.muted, { marginTop: spacing.md }]}>Verificando caja…</Text>
      </View>
    );
  }

  if (view === 'gate') {
    return (
      <View style={[styles.shell, { backgroundColor: c.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SubScreenChrome onBack={onBack} disableBodyScroll>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: padBottom }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            <View style={[subStyles.card, { marginTop: spacing.sm }]}>
              <View style={styles.gateHead}>
                <Lock size={22} color={c.primary} strokeWidth={2} />
                <Text style={styles.gateTitle}>Abrir caja</Text>
              </View>
              <Text style={subStyles.muted}>
                Registrá quién abre el turno. El monto inicial sale de la caja chica y se descuenta al abrir.
              </Text>
              <Text style={styles.label}>Administrador responsable</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={c.foregroundSubtle}
                value={adminApertura}
                onChangeText={setAdminApertura}
              />
              <Text style={styles.label}>Caja chica (saldo disponible)</Text>
              <View style={styles.qRow}>
                <Text style={styles.qPrefix}>{Q}</Text>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="0.00"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                  value={cajaChicaStr}
                  onChangeText={(v) => setCajaChicaStr(v.replace(/[^\d.,]/g, ''))}
                  onEndEditing={() => void setCajaChicaSaldo(parseAmount(cajaChicaStr))}
                />
              </View>
              <TouchableOpacity onPress={() => void guardarSaldoCajaChica()} style={styles.linkSaveChica}>
                <Text style={[styles.linkSaveChicaTxt, { color: c.primary }]}>Guardar saldo de caja chica</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Monto inicial en caja (se descuenta de caja chica)</Text>
              <View style={styles.qRow}>
                <Text style={styles.qPrefix}>{Q}</Text>
                <TextInput
                  style={[
                    styles.input,
                    { flex: 1, marginBottom: 0 },
                    chicaInsuficiente && { borderColor: '#C62828' },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                  value={montoApertura}
                  onChangeText={(v) => setMontoApertura(v.replace(/[^\d.,]/g, ''))}
                />
              </View>
              {montoAperturaNum > 0 ? (
                <Text
                  style={[
                    styles.chicaPreview,
                    { color: chicaInsuficiente ? '#C62828' : c.foregroundMuted },
                  ]}
                >
                  {chicaInsuficiente
                    ? `Falta ${formatQ(montoAperturaNum - cajaChicaNum)} en caja chica.`
                    : `Tras abrir: quedarán ${formatQ(cajaChicaTrasApertura)} en caja chica.`}
                </Text>
              ) : (
                <Text style={[styles.chicaPreview, { color: c.foregroundMuted }]}>
                  Saldo actual en caja chica: {formatQ(cajaChicaNum)}
                </Text>
              )}
              <SalonButton
                title={abriendo ? 'Abriendo…' : 'Entrar al dashboard de caja'}
                variant="heroGold"
                fullWidth
                onPress={abrirCaja}
                disabled={abriendo}
              />
            </View>
          </ScrollView>
        </SubScreenChrome>
      </View>
    );
  }

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome onBack={onBack} disableBodyScroll>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: padBottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          <View style={[styles.incomingCard, { borderColor: c.primary, backgroundColor: c.card }]}>
            <Text style={styles.incomingLabel}>Dinero entrante (efectivo estimado)</Text>
            <Text style={[styles.incomingAmt, { color: c.primary }]}>{formatQ(totalEntrante)}</Text>
            <Text style={[subStyles.muted, { marginTop: spacing.xs }]}>
              Incluye apertura, ingresos y ventas registradas en el turno; descuenta egresos.
            </Text>
          </View>

          <View style={styles.btnGrid2}>
            <View style={styles.btnRow2}>
              <TouchableOpacity
                style={[styles.tileBtn, styles.btnIngreso]}
                onPress={() => {
                  setIngresoTipoId(null);
                  setIngresoNota('');
                  setIngresoMonto('');
                  setModalIngresos(true);
                }}
                activeOpacity={0.88}
              >
                <TrendingUp size={20} color="#fff" strokeWidth={2.2} />
                <Text style={styles.tileBtnTxt}>Ingresos</Text>
                <Text style={styles.tileBtnSub}>Sugerencias · nota · Q</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tileBtn, styles.btnEgreso]}
                onPress={() => {
                  setEgresoTipoId(null);
                  setEgresoNota('');
                  setEgresoMonto('');
                  setModalEgresos(true);
                }}
                activeOpacity={0.88}
              >
                <TrendingDown size={20} color="#fff" strokeWidth={2.2} />
                <Text style={styles.tileBtnTxt}>Egresos</Text>
                <Text style={styles.tileBtnSub}>Sugerencias · nota · Q</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.btnRow2}>
              <TouchableOpacity
                style={[styles.tileBtn, styles.btnNeutral]}
                onPress={() => setModalDev(true)}
                activeOpacity={0.88}
              >
                <RotateCcw size={20} color={c.foreground} strokeWidth={2} />
                <Text style={[styles.tileBtnTxt, styles.tileBtnTxtDark]}>Devoluciones</Text>
                <Text style={[styles.tileBtnSub, styles.tileBtnSubDark]}>Factura + QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tileBtn, styles.btnNeutral]}
                onPress={() => setModalCambio(true)}
                activeOpacity={0.88}
              >
                <RefreshCw size={20} color={c.foreground} strokeWidth={2} />
                <Text style={[styles.tileBtnTxt, styles.tileBtnTxtDark]}>Cambio</Text>
                <Text style={[styles.tileBtnSub, styles.tileBtnSubDark]}>Factura + QR</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[subStyles.card, { marginTop: spacing.md }]}>
            <View style={styles.feedHead}>
              <FileText size={18} color={c.primary} strokeWidth={2} />
              <Text style={styles.feedTitle}>Transacciones en tiempo real</Text>
            </View>
            <Text style={subStyles.muted}>
              Los movimientos del turno se registran con los botones de ingreso, egreso y ventas. Se listan las{' '}
              {TX_FEED_VISIBLE} más recientes; podés desplegar el historial completo.
            </Text>
            {txs.length === 0 ? (
              <Text style={[subStyles.muted, { marginTop: spacing.md }]}>Sin movimientos.</Text>
            ) : (
              <>
                {feedTxs.map((t) => {
                  const b = kindBadge(t.kind);
                  const highlighted = highlightTxIds.has(t.id);
                  return (
                    <View
                      key={t.id}
                      style={[
                        styles.txRow,
                        { borderColor: c.cardBorder },
                        highlighted && {
                          backgroundColor: isDark ? 'rgba(46,125,50,0.22)' : '#E8F5E9',
                          borderColor: '#2E7D32',
                        },
                      ]}
                    >
                      <View style={[styles.badge, { backgroundColor: b.bg }]}>
                        <Text style={[styles.badgeTxt, { color: b.fg }]}>{b.txt}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txTit}>{t.titulo}</Text>
                        {t.productos && t.productos !== '—' ? (
                          <Text style={subStyles.muted} numberOfLines={2}>
                            {t.productos}
                          </Text>
                        ) : null}
                        <Text style={subStyles.muted}>{t.detalle}</Text>
                        <Text style={styles.txTime}>{new Date(t.ts).toLocaleString('es-GT')}</Text>
                      </View>
                      <Text
                        style={[
                          styles.txAmt,
                          { color: t.signo === -1 ? '#C62828' : t.signo === 0 ? c.foregroundMuted : '#2E7D32' },
                        ]}
                      >
                        {t.signo === -1 ? '−' : t.signo === 0 ? '' : '+'}
                        {t.signo === 0 ? '—' : formatQ(t.monto)}
                      </Text>
                    </View>
                  );
                })}
                {feedHiddenCount > 0 ? (
                  <TouchableOpacity
                    style={styles.feedToggle}
                    onPress={() => setFeedExpanded((v) => !v)}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel={feedExpanded ? 'Contraer lista de transacciones' : 'Expandir lista de transacciones'}
                  >
                    <Text style={[styles.feedToggleTxt, { color: c.primary }]}>
                      {feedExpanded
                        ? `Mostrar solo las ${TX_FEED_VISIBLE} más recientes`
                        : `Ver ${feedHiddenCount} movimiento${feedHiddenCount === 1 ? '' : 's'} anterior${feedHiddenCount === 1 ? '' : 'es'}`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>

          <SalonButton
            title="Cerrar caja y generar PDF"
            variant="outlineGray"
            fullWidth
            onPress={() => {
              setAdministradorCierre(metaApertura?.nombre?.trim() || '');
              setModalCierre(true);
            }}
          />
        </ScrollView>
      </SubScreenChrome>

      <Modal visible={modalIngresos} animationType="slide" transparent onRequestClose={() => setModalIngresos(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalScrollFrame}
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: modalScrollBottomPad(insets) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalCardIngresoEgreso, { backgroundColor: c.background }]}>
              <Text style={styles.modalTitle}>Ingresos</Text>
              <Text style={[subStyles.muted, { marginBottom: spacing.xs }]}>
                Elegí motivo, monto y notas (orden sugerido de arriba hacia abajo).
              </Text>
              <Text style={[styles.modalSectionLabel, styles.modalSectionLabelFirst]}>Motivo</Text>
              <View style={styles.sugWrap}>
                {INGRESO_TIPOS.map((t) => {
                  const on = ingresoTipoId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.sugChip, on && styles.sugChipOn, { borderColor: c.cardBorder }]}
                      onPress={() => setIngresoTipoId(t.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.sugChipTxt, on && styles.sugChipTxtOn]} numberOfLines={4}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.modalSectionLabel}>Cantidad</Text>
              <View style={styles.amountRowFull}>
                <Text style={styles.qPrefix}>{Q}</Text>
                <TextInput
                  style={styles.amountInputFull}
                  placeholder="0.00"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                  value={ingresoMonto}
                  onChangeText={(v) => setIngresoMonto(v.replace(/[^\d.,]/g, ''))}
                />
              </View>
              <Text style={styles.modalSectionLabel}>Notas</Text>
              <TextInput
                style={styles.noteAreaFull}
                placeholder="Detalle u observaciones"
                placeholderTextColor={c.foregroundSubtle}
                multiline
                value={ingresoNota}
                onChangeText={setIngresoNota}
              />
              <View style={styles.modalBtnRow}>
                <SalonButton
                  title="Cerrar"
                  variant="outlineGray"
                  fullWidth
                  style={styles.modalBtnHalf}
                  onPress={() => setModalIngresos(false)}
                />
                <SalonButton
                  title="Registrar"
                  variant="heroGold"
                  fullWidth
                  style={styles.modalBtnPrimary}
                  onPress={registrarIngresos}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={modalEgresos} animationType="slide" transparent onRequestClose={() => setModalEgresos(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalScrollFrame}
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: modalScrollBottomPad(insets) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalCardIngresoEgreso, { backgroundColor: c.background }]}>
              <Text style={styles.modalTitle}>Egresos</Text>
              <Text style={[subStyles.muted, { marginBottom: spacing.xs }]}>
                Elegí motivo, monto y notas (orden sugerido de arriba hacia abajo).
              </Text>
              <Text style={[styles.modalSectionLabel, styles.modalSectionLabelFirst]}>Motivo</Text>
              <View style={styles.sugWrap}>
                {EGRESO_TIPOS.map((t) => {
                  const on = egresoTipoId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.sugChip, on && styles.sugChipOnEgreso, { borderColor: c.cardBorder }]}
                      onPress={() => setEgresoTipoId(t.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.sugChipTxt, on && styles.sugChipTxtOnEgreso]} numberOfLines={4}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.modalSectionLabel}>Cantidad</Text>
              <View style={styles.amountRowFull}>
                <Text style={styles.qPrefix}>{Q}</Text>
                <TextInput
                  style={styles.amountInputFull}
                  placeholder="0.00"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                  value={egresoMonto}
                  onChangeText={(v) => setEgresoMonto(v.replace(/[^\d.,]/g, ''))}
                />
              </View>
              <Text style={styles.modalSectionLabel}>Notas</Text>
              <TextInput
                style={styles.noteAreaFull}
                placeholder="Detalle u observaciones"
                placeholderTextColor={c.foregroundSubtle}
                multiline
                value={egresoNota}
                onChangeText={setEgresoNota}
              />
              <View style={styles.modalBtnRow}>
                <SalonButton
                  title="Cerrar"
                  variant="outlineGray"
                  fullWidth
                  style={styles.modalBtnHalf}
                  onPress={() => setModalEgresos(false)}
                />
                <SalonButton
                  title="Registrar"
                  variant="heroGold"
                  fullWidth
                  style={styles.modalBtnPrimary}
                  onPress={registrarEgresos}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {modalDev ? (
        <Modal visible animationType="slide" transparent onRequestClose={() => setModalDev(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: c.card, paddingBottom: modalSheetBottomPad(insets) }]}>
              <Text style={styles.modalTitle}>Devoluciones</Text>
              <Text style={subStyles.muted}>Ingresá factura y activá el lector QR.</Text>
              <TextInput
                style={styles.input}
                placeholder="Número de factura / folio"
                placeholderTextColor={c.foregroundSubtle}
                value={facturaDev}
                onChangeText={setFacturaDev}
              />
              <View style={styles.switchRow}>
                <QrCode size={20} color={c.foregroundMuted} />
                <Text style={styles.switchLabel}>Habilitar lector QR</Text>
                <Switch value={qrDev} onValueChange={setQrDev} trackColor={{ false: c.cardBorder, true: c.primary }} />
              </View>
              <TouchableOpacity style={styles.simQr} onPress={() => setFacturaDev('FAC-QR-88421')}>
                <Text style={styles.simQrTxt}>Simular escaneo QR</Text>
              </TouchableOpacity>
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                <SalonButton title="Registrar" variant="heroGold" fullWidth onPress={registrarDevolucion} />
                <SalonButton title="Cancelar" variant="outlineGray" fullWidth onPress={() => setModalDev(false)} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {modalCambio ? (
        <Modal visible animationType="slide" transparent onRequestClose={() => setModalCambio(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: c.card, paddingBottom: modalSheetBottomPad(insets) }]}>
              <Text style={styles.modalTitle}>Cambio</Text>
              <Text style={subStyles.muted}>Ingresá factura y activá el lector QR.</Text>
              <TextInput
                style={styles.input}
                placeholder="Número de factura / folio"
                placeholderTextColor={c.foregroundSubtle}
                value={facturaCambio}
                onChangeText={setFacturaCambio}
              />
              <View style={styles.switchRow}>
                <QrCode size={20} color={c.foregroundMuted} />
                <Text style={styles.switchLabel}>Habilitar lector QR</Text>
                <Switch
                  value={qrCambio}
                  onValueChange={setQrCambio}
                  trackColor={{ false: c.cardBorder, true: c.primary }}
                />
              </View>
              <TouchableOpacity style={styles.simQr} onPress={() => setFacturaCambio('FAC-QR-88421')}>
                <Text style={styles.simQrTxt}>Simular escaneo QR</Text>
              </TouchableOpacity>
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                <SalonButton title="Registrar" variant="heroGold" fullWidth onPress={registrarCambio} />
                <SalonButton title="Cancelar" variant="outlineGray" fullWidth onPress={() => setModalCambio(false)} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      <Modal visible={modalCierre} animationType="fade" transparent onRequestClose={() => setModalCierre(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.card, paddingBottom: modalSheetBottomPad(insets) }]}>
            <Text style={styles.modalTitle}>Cierre de caja</Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm }]}>
              Completá quién firma como gerente y como administrador. El PDF incluye líneas de firma para ambos.
            </Text>
            <Text style={styles.label}>Gerente (firma en reporte)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo del gerente"
              placeholderTextColor={c.foregroundSubtle}
              value={gerenteCierre}
              onChangeText={setGerenteCierre}
            />
            <Text style={styles.label}>Administrador (firma en reporte)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo del administrador"
              placeholderTextColor={c.foregroundSubtle}
              value={administradorCierre}
              onChangeText={setAdministradorCierre}
            />
            <SalonButton title="Confirmar y generar PDF" variant="heroGold" fullWidth onPress={generarPdfCierre} />
            <SalonButton title="Cancelar" variant="outlineGray" fullWidth onPress={() => setModalCierre(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    gateHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    gateTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      color: c.foreground,
    },
    label: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    linkSaveChica: {
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
      marginTop: -spacing.xs,
    },
    linkSaveChicaTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    chicaPreview: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.sm,
    },
    input: {
      minHeight: 48,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      fontFamily: typography.fontSans,
      fontSize: 15,
      color: c.foreground,
      marginBottom: spacing.md,
    },
    qRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    qPrefix: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      color: c.foregroundMuted,
    },
    incomingCard: {
      borderRadius: radii.lg,
      borderWidth: 2,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    incomingLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foregroundMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    incomingAmt: {
      fontFamily: typography.fontDisplay,
      fontSize: 32,
      marginTop: spacing.xs,
    },
    btnGrid2: {
      marginBottom: spacing.sm,
    },
    btnRow2: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    tileBtn: {
      flex: 1,
      borderRadius: radii.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      minHeight: 96,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnIngreso: { backgroundColor: '#2E7D32' },
    btnEgreso: { backgroundColor: '#C62828' },
    btnNeutral: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    tileBtnTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      color: '#fff',
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    tileBtnTxtDark: {
      color: c.foreground,
    },
    tileBtnSub: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: 'rgba(255,255,255,0.88)',
      marginTop: 2,
      textAlign: 'center',
    },
    tileBtnSubDark: {
      color: c.foregroundMuted,
    },
    sugWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    sugChip: {
      flexGrow: 1,
      flexBasis: '47%',
      maxWidth: '48%',
      minHeight: 68,
      justifyContent: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: c.card,
    },
    sugChipOn: {
      borderColor: '#2E7D32',
      backgroundColor: 'rgba(46, 125, 50, 0.12)',
    },
    sugChipOnEgreso: {
      borderColor: '#C62828',
      backgroundColor: 'rgba(198, 40, 40, 0.1)',
    },
    sugChipTxt: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foreground,
      lineHeight: 17,
    },
    sugChipTxtOn: {
      fontFamily: typography.fontSansMedium,
      color: '#1B5E20',
    },
    sugChipTxtOnEgreso: {
      fontFamily: typography.fontSansMedium,
      color: '#B71C1C',
    },
    modalSectionLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      color: c.foregroundMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    modalSectionLabelFirst: {
      marginTop: spacing.md,
    },
    amountRowFull: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingLeft: spacing.md,
      marginBottom: spacing.sm,
    },
    amountInputFull: {
      flex: 1,
      minHeight: 52,
      fontFamily: typography.fontSansMedium,
      fontSize: 18,
      color: c.foreground,
      paddingVertical: spacing.sm,
      paddingRight: spacing.md,
    },
    noteAreaFull: {
      minHeight: 96,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foreground,
      textAlignVertical: 'top',
      marginBottom: spacing.md,
    },
    modalBtnRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    modalBtnHalf: {
      flex: 1,
    },
    modalBtnPrimary: {
      flex: 1.55,
    },
    feedHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    feedToggle: {
      alignSelf: 'center',
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    feedToggleTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      textAlign: 'center',
    },
    feedTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      color: c.foreground,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
    },
    badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.pill },
    badgeTxt: { fontFamily: typography.fontSansMedium, fontSize: 10 },
    txTit: { fontFamily: typography.fontSansMedium, fontSize: 14, color: c.foreground },
    txTime: { fontFamily: typography.fontSans, fontSize: 11, color: c.foregroundSubtle, marginTop: 4 },
    txAmt: { fontFamily: typography.fontSansMedium, fontSize: 14, marginLeft: spacing.xs },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      paddingTop: spacing.xl,
    },
    /** Altura máxima aquí: la tarjeta blanca crece con el contenido y hace scroll sin recortar botones. */
    modalScrollFrame: {
      width: '100%',
      maxHeight: '92%',
    },
    modalScrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    modalCard: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      width: '100%',
      alignSelf: 'center',
      overflow: 'hidden',
    },
    /** Ingresos / Egresos: panel flotante con bordes redondos en los cuatro lados. */
    modalCardIngresoEgreso: {
      borderRadius: radii.xl,
      padding: spacing.lg,
      width: '100%',
      alignSelf: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
      marginBottom: spacing.sm,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    switchLabel: { flex: 1, fontFamily: typography.fontSans, fontSize: 14, color: c.foreground },
    simQr: { alignSelf: 'flex-start', marginBottom: spacing.sm },
    simQrTxt: { fontFamily: typography.fontSansMedium, fontSize: 13, color: c.primary },
  });
}
