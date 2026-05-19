import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import {
  getMetaGlobal,
  guardarMetaGlobal,
  progresoMetaPct,
  reiniciarMetaGlobal,
  renovarMetaGlobal,
  formatMetaQ,
  metaVigente,
  parseMontoInput,
  formatMontoInputLive,
  montoInputFromNumber,
} from '@appsalon/shared-config';
import {
  maybeArchivarMetaVencida,
  getMetaRenewalPrompt,
  dismissMetaRenewalPrompt,
  metaPeriodoTerminado,
  metaVenceHoy,
  suggestNextPeriod,
} from '../services/salonMetaPeriod';

function formatShortDate(d) {
  if (!d) return '—';
  try {
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function toYmd(d) {
  if (!d) return null;
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}

export function MetasScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objetivoStr, setObjetivoStr] = useState('');
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const renewalAlertOpenRef = useRef(false);
  const promptRenovacionMetaRef = useRef(async () => {});

  const loadMeta = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error } = await getMetaGlobal();
    if (error && !silent) {
      Alert.alert('Metas', error.message || 'No se pudo cargar la meta.');
    }
    setMeta(data || null);
    if (data) {
      await maybeArchivarMetaVencida(data);
      if (!silent) {
        if (data.valor_objetivo != null) setObjetivoStr(montoInputFromNumber(data.valor_objetivo));
        setFechaInicio(data.fecha_inicio ? new Date(data.fecha_inicio) : null);
        setFechaFin(data.fecha_fin ? new Date(data.fecha_fin) : null);
      }
      await promptRenovacionMetaRef.current(data);
    }
    if (!silent) setLoading(false);
    setRefreshing(false);
  }, []);

  const ejecutarRenovacion = useCallback(
    async (metaData, suggested) => {
      if (!metaData || !suggested) return;
      setRenewing(true);
      await maybeArchivarMetaVencida(metaData);
      await dismissMetaRenewalPrompt(metaData);
      const { error } = await renovarMetaGlobal({
        valorObjetivo: metaData.valor_objetivo,
        fechaInicio: toYmd(suggested.fechaInicio),
        fechaFin: toYmd(suggested.fechaFin),
      });
      setRenewing(false);
      renewalAlertOpenRef.current = false;
      if (error) {
        Alert.alert('No se renovó', error.message || 'Intentá de nuevo.');
        return;
      }
      setFechaInicio(suggested.fechaInicio);
      setFechaFin(suggested.fechaFin);
      Alert.alert(
        'Meta renovada',
        `Nuevo período: ${formatShortDate(suggested.fechaInicio)} → ${formatShortDate(suggested.fechaFin)}. Avance reiniciado a Q 0.00.`,
      );
      await loadMeta(true);
    },
    [loadMeta],
  );

  const promptRenovacionMeta = useCallback(
    async (metaData) => {
      if (!metaData || renewalAlertOpenRef.current) return;
      const { show, reason, suggested } = await getMetaRenewalPrompt(metaData);
      if (!show || !suggested) return;

      renewalAlertOpenRef.current = true;
      const titulo = reason === 'expired' ? 'Período de meta finalizado' : 'Tu meta vence hoy';
      const cuerpo =
        reason === 'expired'
          ? `El período terminó el ${formatShortDate(new Date(metaData.fecha_fin))}. ¿Renovar con el siguiente período (${formatShortDate(suggested.fechaInicio)} → ${formatShortDate(suggested.fechaFin)})? El avance volverá a Q 0.00.`
          : `Hoy es el último día del período. ¿Renovar para ${formatShortDate(suggested.fechaInicio)} → ${formatShortDate(suggested.fechaFin)}? El avance volverá a Q 0.00.`;

      Alert.alert(titulo, cuerpo, [
        {
          text: 'Después',
          style: 'cancel',
          onPress: () => {
            renewalAlertOpenRef.current = false;
            dismissMetaRenewalPrompt(metaData);
          },
        },
        {
          text: 'Renovar meta',
          onPress: () => ejecutarRenovacion(metaData, suggested),
        },
      ]);
    },
    [ejecutarRenovacion],
  );

  promptRenovacionMetaRef.current = promptRenovacionMeta;

  useEffect(() => {
    loadMeta();
    const timer = setInterval(() => loadMeta(true), 15000);
    return () => clearInterval(timer);
  }, [loadMeta]);

  const pct = meta ? progresoMetaPct(meta) : 0;
  const actual = Number(meta?.actual || 0);
  const objetivo = Number(meta?.valor_objetivo || 0);
  const vigente = meta ? metaVigente(meta) : true;
  const periodoCerrado = meta ? metaPeriodoTerminado(meta) : false;
  const venceHoy = meta ? metaVenceHoy(meta) : false;

  const renovarDesdeBanner = () => {
    if (!meta) return;
    const suggested = suggestNextPeriod(meta.fecha_inicio, meta.fecha_fin);
    const titulo = periodoCerrado ? 'Renovar meta' : 'Renovar antes del cierre';
    const cuerpo = `¿Iniciar el período ${formatShortDate(suggested.fechaInicio)} → ${formatShortDate(suggested.fechaFin)} con avance en Q 0.00?`;
    Alert.alert(titulo, cuerpo, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Renovar', onPress: () => ejecutarRenovacion(meta, suggested) },
    ]);
  };

  const guardar = async () => {
    const v = parseMontoInput(objetivoStr);
    if (!Number.isFinite(v) || v <= 0) {
      Alert.alert('Meta', 'Ingresá un monto objetivo mayor a Q 0.00.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      Alert.alert('Período', 'Elegí fecha de inicio y fin del período de la meta.');
      return;
    }
    setSaving(true);
    const { data, error } = await guardarMetaGlobal({
      valorObjetivo: v,
      fechaInicio: toYmd(fechaInicio),
      fechaFin: toYmd(fechaFin),
    });
    setSaving(false);
    if (error) {
      Alert.alert('No se guardó', error.message || 'Intentá de nuevo.');
      return;
    }
    setMeta(data);
    setObjetivoStr(montoInputFromNumber(v));
    Alert.alert('Listo', `Meta ${formatMetaQ(v)} · ${formatShortDate(fechaInicio)} → ${formatShortDate(fechaFin)}`);
  };

  const reiniciar = () => {
    Alert.alert('Reiniciar avance', '¿Poner el monto acumulado en Q 0.00? El objetivo y fechas se mantienen.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: async () => {
          setResetting(true);
          const { error } = await reiniciarMetaGlobal();
          setResetting(false);
          if (error) Alert.alert('Error', error.message);
          else await loadMeta(true);
        },
      },
    ]);
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios' && event?.type === 'dismissed') {
      setPickerTarget(null);
      return;
    }
    if (!selectedDate || !pickerTarget) {
      if (Platform.OS !== 'ios') setPickerTarget(null);
      return;
    }
    if (pickerTarget === 'from') setFechaInicio(selectedDate);
    if (pickerTarget === 'to') setFechaFin(selectedDate);
    if (Platform.OS !== 'ios') setPickerTarget(null);
  };

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Meta global"
        subtitle="Objetivo en Q con período. Sube con ventas del salón, tarjeta en tienda y efectivo al confirmar en Pedidos."
        onBack={onBack}
        bottomPadding={0}
        disableBodyScroll
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: padBottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMeta(true); }} tintColor={c.primary} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
          ) : (
            <>
            {(periodoCerrado || venceHoy) && meta ? (
              <View style={[styles.renewBanner, { borderColor: periodoCerrado ? '#C62828' : c.primary, backgroundColor: periodoCerrado ? 'rgba(198,40,40,0.08)' : 'rgba(212,175,55,0.12)' }]}>
                <Text style={[styles.renewBannerTitle, { color: c.foreground }]}>
                  {periodoCerrado ? 'Período finalizado' : 'La meta vence hoy'}
                </Text>
                <Text style={[styles.renewBannerBody, { color: c.foregroundMuted }]}>
                  {periodoCerrado
                    ? 'Renová la meta para abrir un nuevo período; el avance se reinicia a Q 0.00.'
                    : 'Renová hoy para continuar sin interrupción en el siguiente período.'}
                </Text>
                <SalonButton
                  title={renewing ? 'Renovando…' : 'Renovar meta'}
                  variant="heroGold"
                  fullWidth
                  disabled={renewing || saving}
                  onPress={renovarDesdeBanner}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ) : null}
            <View style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>{meta?.titulo || 'Meta global de ventas'}</Text>
              {meta?.fecha_inicio && meta?.fecha_fin ? (
                <Text style={[styles.periodoTxt, { color: c.primary }]}>
                  {formatShortDate(new Date(meta.fecha_inicio))} → {formatShortDate(new Date(meta.fecha_fin))}
                  {!vigente ? ' · período cerrado' : ''}
                </Text>
              ) : null}

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statLbl, { color: c.foregroundMuted }]}>Acumulado</Text>
                  <Text style={[styles.statVal, styles.statValMoney, { color: c.foreground }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.65}>
                    {formatMetaQ(actual)}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: c.cardBorder }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statLbl, { color: c.foregroundMuted }]}>Objetivo</Text>
                  <Text style={[styles.statVal, styles.statValMoney, { color: c.primary }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.65}>
                    {meta ? formatMetaQ(objetivo) : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: c.cardBorder }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statLbl, { color: c.foregroundMuted }]}>Avance</Text>
                  <Text style={[styles.statVal, { color: c.foreground }]}>{meta ? `${pct}%` : '—'}</Text>
                </View>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: c.surfaceMuted }]}>
                <View style={[styles.progressFill, { width: `${meta ? pct : 0}%`, backgroundColor: pct >= 100 ? '#2E7D32' : c.primary }]} />
              </View>
              <Text style={[styles.progressHint, { color: c.foregroundSubtle }]}>
                {meta
                  ? pct >= 100
                    ? 'Meta cumplida.'
                    : vigente
                      ? `Faltan ${formatMetaQ(Math.max(0, objetivo - actual))} en este período.`
                      : 'Período terminado; el reporte de cierre aparece en Reportes.'
                  : 'Definí monto y fechas abajo.'}
              </Text>

              <Text style={[styles.fieldLbl, { color: c.foreground }]}>Período de la meta</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={[styles.dateTap, { borderColor: c.cardBorder }]} onPress={() => setPickerTarget('from')}>
                  <Text style={[styles.dateLbl, { color: c.foregroundMuted }]}>Desde</Text>
                  <View style={styles.dateTapInner}>
                    <Text style={{ color: c.foreground }}>{formatShortDate(fechaInicio)}</Text>
                    <Calendar size={16} color={c.primary} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateTap, { borderColor: c.cardBorder }]} onPress={() => setPickerTarget('to')}>
                  <Text style={[styles.dateLbl, { color: c.foregroundMuted }]}>Hasta</Text>
                  <View style={styles.dateTapInner}>
                    <Text style={{ color: c.foreground }}>{formatShortDate(fechaFin)}</Text>
                    <Calendar size={16} color={c.primary} />
                  </View>
                </TouchableOpacity>
              </View>
              {pickerTarget ? (
                <>
                  <DateTimePicker
                    mode="date"
                    value={pickerTarget === 'from' ? fechaInicio || new Date() : fechaFin || fechaInicio || new Date()}
                    minimumDate={pickerTarget === 'to' && fechaInicio ? fechaInicio : undefined}
                    maximumDate={pickerTarget === 'from' && fechaFin ? fechaFin : undefined}
                    onChange={onDateChange}
                  />
                  {Platform.OS === 'ios' ? (
                    <SalonButton title="Listo" variant="outlineGray" fullWidth onPress={() => setPickerTarget(null)} style={{ marginBottom: spacing.sm }} />
                  ) : null}
                </>
              ) : null}

              <Text style={[styles.fieldLbl, { color: c.foreground }]}>Monto objetivo (Q)</Text>
              <View style={[styles.inputRow, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                <Text style={[styles.inputPrefix, { color: c.foregroundMuted }]}>Q</Text>
                <TextInput
                  style={[styles.input, styles.inputNoMargin, { color: c.foreground }]}
                  placeholder="500,000.00"
                  placeholderTextColor={c.foregroundSubtle}
                  keyboardType="decimal-pad"
                  value={objetivoStr}
                  onChangeText={(v) => setObjetivoStr(formatMontoInputLive(v))}
                />
              </View>

              <SalonButton title={saving ? 'Guardando…' : meta ? 'Actualizar meta' : 'Crear meta global'} variant="heroGold" fullWidth disabled={saving} onPress={guardar} />
              {meta ? (
                <SalonButton
                  title={resetting ? 'Reiniciando…' : 'Reiniciar avance a 0'}
                  variant="outlineGray"
                  fullWidth
                  disabled={resetting || saving}
                  onPress={reiniciar}
                  style={{ marginTop: spacing.sm }}
                />
              ) : null}
            </View>
            </>
          )}
        </ScrollView>
      </SubScreenChrome>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    renewBanner: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
    renewBannerTitle: { fontFamily: typography.fontSansMedium, fontSize: 15, marginBottom: 4 },
    renewBannerBody: { fontFamily: typography.fontSans, fontSize: 13, lineHeight: 18 },
    card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
    cardTitle: { fontFamily: typography.fontDisplay, fontSize: 22, marginBottom: spacing.xs },
    periodoTxt: { fontFamily: typography.fontSansMedium, fontSize: 13, marginBottom: spacing.md },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 36 },
    statLbl: { fontFamily: typography.fontSans, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    statVal: { fontFamily: typography.fontSansMedium, fontSize: 18, textAlign: 'center' },
    statValMoney: { fontSize: 15, lineHeight: 18, paddingHorizontal: 2 },
    progressTrack: { height: 10, borderRadius: radii.pill, overflow: 'hidden', marginBottom: spacing.xs },
    progressFill: { height: 10, borderRadius: radii.pill },
    progressHint: { fontFamily: typography.fontSans, fontSize: 12, marginBottom: spacing.md },
    fieldLbl: { fontFamily: typography.fontSansMedium, fontSize: 13, marginBottom: spacing.xs },
    dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    dateTap: { flex: 1, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm },
    dateLbl: { fontFamily: typography.fontSans, fontSize: 11, marginBottom: 4 },
    dateTapInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    input: { fontFamily: typography.fontSans, fontSize: 18, minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, marginBottom: spacing.md },
    inputNoMargin: { marginBottom: 0, flex: 1, borderWidth: 0, paddingHorizontal: spacing.xs },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radii.md, marginBottom: spacing.md, paddingHorizontal: spacing.sm },
    inputPrefix: { fontFamily: typography.fontSansMedium, fontSize: 18, minWidth: 24 },
  });
}
