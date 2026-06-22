import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { CitaFechaHoraPicker, openAndroidCitaPicker } from './CitaFechaHoraPicker';
import { ClientSucursalPicker } from '../sucursal/ClientSucursalPicker';
import { AgendarServicioResumenCard } from './AgendarServicioResumenCard';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  db,
  resolvePrecioServicioConCanjeCitas,
  mergeNotasServicioConCanje,
  ensureClientSucursalId,
} from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton } from '../luxury/SalonButton';
import { useServiciosCart } from '../../context/ServiciosCartContext';
import {
  ANDREAS_CANJE_PROMO_BLOCK_MSG,
  ANDREAS_CANJE_PROMO_PARTIAL_MSG,
  cartHasPromoItems,
  itemHasPromocionVigente,
  itemsBlockAndreasCanje,
  subtotalEligibleForAndreasCanje,
} from '../../utils/andreasCanjePromo';

function servicioKey(s) {
  return String(s?.id ?? s?.nombre ?? '');
}

function defaultSlotForIndex(index) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10 + (index % 6), 0, 0, 0);
  return d;
}

export function ServiciosCarritoBody({
  clienteRow,
  onClose,
  onCitasChanged,
  onGoTab,
}) {
  const { colors: c } = useTheme();
  const { items, removeItem, clear } = useServiciosCart();
  const styles = useMemo(() => createStyles(c), [c]);
  const n = items.length;

  const [schedules, setSchedules] = useState({});
  const [sucursalId, setSucursalId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [canjeCitas, setCanjeCitas] = useState(null);

  const carritoBloqueaCanje = itemsBlockAndreasCanje(items);
  const carritoCanjeParcial = cartHasPromoItems(items) && subtotalEligibleForAndreasCanje(items) > 0;
  const canjeTargetKey = useMemo(() => {
    if (!canjeCitas || carritoBloqueaCanje) return null;
    const hit = items.find((s) => !itemHasPromocionVigente(s));
    return hit ? servicioKey(hit) : null;
  }, [canjeCitas, carritoBloqueaCanje, items]);

  useEffect(() => {
    if (!clienteRow?.id || carritoBloqueaCanje) {
      setCanjeCitas(null);
      return;
    }
    void db.premiosAndreas.getCanjeCitaAgenda({ clienteRow }).then(({ data }) => {
      setCanjeCitas(data || null);
    });
  }, [clienteRow?.id, clienteRow?.andreas_premios, clienteRow?.membresia_nivel, carritoBloqueaCanje]);

  useEffect(() => {
    setSchedules((prev) => {
      const next = {};
      items.forEach((s, i) => {
        const key = servicioKey(s);
        next[key] = prev[key] ?? defaultSlotForIndex(i);
      });
      return next;
    });
  }, [items]);

  const setScheduleFor = useCallback((key, date) => {
    setSchedules((prev) => ({ ...prev, [key]: date }));
  }, []);

  const solicitarTodas = useCallback(async () => {
    if (!clienteRow?.id) {
      Alert.alert('Cliente', 'Necesitamos tu ficha enlazada al salón para agendar.');
      return;
    }
    if (!items.length) return;

    const sid = sucursalId || (await ensureClientSucursalId());
    if (!sid) {
      Alert.alert('Sucursal', 'Elegí la sucursal donde querés atenderte.');
      return;
    }

    setSaving(true);
    const creadas = [];
    let canjeConsumido = false;
    try {
      for (const s of items) {
        const key = servicioKey(s);
        const fechaHora = schedules[key];
        if (!fechaHora || !Number.isFinite(new Date(fechaHora).getTime())) {
          Alert.alert('Fecha y hora', `Elegí fecha y hora para ${s.nombre || 'el servicio'}.`);
          return;
        }
        const precioBase = Number(s.precio);
        const aplicarCanje = !canjeConsumido && canjeCitas && !itemHasPromocionVigente(s);
        const { precio, canjeSnap } = resolvePrecioServicioConCanjeCitas(
          precioBase,
          aplicarCanje ? canjeCitas : null,
        );
        const dur = Number(s.duracion_minutos);
        let notasServicio = s.inventarioId
          ? `Solicitud desde app clientes · inventario_id=${s.inventarioId}`
          : 'Solicitud desde app clientes';
        if (canjeSnap) {
          notasServicio = mergeNotasServicioConCanje(notasServicio, canjeSnap) || notasServicio;
        }
        const { data: citaRow, error } = await db.citas.create(
          {
            cliente_id: clienteRow.id,
            servicio: s.nombre,
            precio: Number.isFinite(precio) ? precio : 0,
            duracion_minutos: Number.isFinite(dur) ? dur : 30,
            fecha_hora: new Date(fechaHora).toISOString(),
            estado: 'pendiente',
            notas_servicio: notasServicio,
            empleado_id: null,
            sucursal_id: sid,
          },
          { forClientApp: true },
        );
        if (error) {
          const raw = String(error.message || '');
          const isRls = /row-level security|violates.*policy|permission denied/i.test(raw);
          const msg = isRls
            ? 'Tu cuenta no tiene permiso para agendar aún. Pedí al salón que vincule tu usuario.'
            : raw || 'Revisá la conexión e intentá de nuevo.';
          Alert.alert(`No se pudo agendar ${s.nombre}`, msg);
          return;
        }
        if (canjeSnap && citaRow?.id) {
          canjeConsumido = true;
          setCanjeCitas(null);
          void db.premiosAndreas.registrarCanjeCitaAgendada({
            clienteId: clienteRow.id,
            citaId: citaRow.id,
            ruleId: canjeSnap.rule_id,
            referidosCiclo: canjeSnap.referidos_ciclo,
          });
        }
        creadas.push(s.nombre);
      }

      clear();
      onCitasChanged?.();
      Alert.alert(
        'Solicitudes enviadas',
        creadas.length === 1
          ? 'Tu cita quedó pendiente. El salón te confirmará pronto.'
          : `Se enviaron ${creadas.length} solicitudes al salón. Te confirmarán pronto.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose?.();
              onGoTab?.('historial');
            },
          },
        ],
      );
    } finally {
      setSaving(false);
    }
  }, [clienteRow?.id, items, schedules, canjeCitas, sucursalId, clear, onCitasChanged, onClose, onGoTab]);

  if (!clienteRow?.id) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.intro}>
          Pedí en recepción que enlacen tu cuenta con el salón para poder solicitar citas desde la app.
        </Text>
        <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {carritoBloqueaCanje ? (
        <View style={[styles.canjeBanner, { backgroundColor: c.surfaceMuted, borderColor: c.foregroundSubtle }]}>
          <Text style={[styles.canjeBannerTxt, { color: c.foregroundMuted }]}>{ANDREAS_CANJE_PROMO_BLOCK_MSG}</Text>
        </View>
      ) : carritoCanjeParcial ? (
        <View style={[styles.canjeBanner, { backgroundColor: c.surfaceMuted, borderColor: c.foregroundSubtle }]}>
          <Text style={[styles.canjeBannerTxt, { color: c.foregroundMuted }]}>{ANDREAS_CANJE_PROMO_PARTIAL_MSG}</Text>
        </View>
      ) : canjeCitas ? (
        <View style={[styles.canjeBanner, { backgroundColor: c.surfaceMuted, borderColor: c.primary }]}>
          <Text style={[styles.canjeBannerTxt, { color: c.foreground }]}>
            {(canjeCitas.rule_id || canjeCitas.ruleId) === 'referidos'
              ? `Premio referidos: ${canjeCitas.descuento_pct}% de descuento en el primer servicio sin promoción de esta solicitud.`
              : `Canje ANDREAS activo: ${canjeCitas.descuento_pct}% de descuento en el primer servicio sin promoción de esta solicitud.`}
          </Text>
        </View>
      ) : null}

      <View style={styles.sucursalCard}>
        <Text style={styles.whenLbl}>Sucursal</Text>
        <Text style={[styles.intro, { marginBottom: spacing.sm }]}>
          Las citas se enviarán a la agenda de esta sucursal.
        </Text>
        <ClientSucursalPicker onChange={setSucursalId} compact />
      </View>

      {n === 0 ? (
        <Text style={styles.intro}>
          Agregá servicios con el botón + en Servicios. Cuando termines, volvé aquí para agendar.
        </Text>
      ) : null}

      {items.map((s, index) => {
        const key = servicioKey(s);
        const fechaHora = schedules[key] ?? defaultSlotForIndex(index);
        const esConCanje = canjeTargetKey === key;
        const precioCanje = esConCanje ? resolvePrecioServicioConCanjeCitas(s.precio, canjeCitas) : null;

        return (
          <View key={key} style={styles.card}>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeItem(s)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Quitar de la lista"
            >
              <X size={20} color={c.foregroundSubtle} />
            </TouchableOpacity>

            <AgendarServicioResumenCard
              kicker={n > 1 ? `Servicio ${index + 1} de ${n}` : 'Servicio seleccionado'}
              servicio={s}
              precioConCanje={esConCanje ? precioCanje : null}
              canjeDescuentoPct={esConCanje ? canjeCitas?.descuento_pct : null}
            />

            <View style={styles.whenBlock}>
              <Text style={styles.whenLbl}>Fecha y hora</Text>
              <CitaFechaHoraPicker
                value={fechaHora}
                onChange={(next) => setScheduleFor(key, next)}
                onRequestAndroidPicker={
                  Platform.OS === 'android'
                    ? (mode) => {
                        openAndroidCitaPicker({
                          mode,
                          value: fechaHora,
                          onCommit: (next) => setScheduleFor(key, next),
                        });
                      }
                    : undefined
                }
              />
            </View>
          </View>
        );
      })}

      {n > 0 ? (
        <>
          <SalonButton
            variant="heroGold"
            title={
              saving
                ? 'Enviando…'
                : n === 1
                  ? 'Solicitar cita'
                  : `Solicitar ${n} citas`
            }
            fullWidth
            style={{ marginTop: spacing.md }}
            disabled={saving}
            onPress={() => void solicitarTodas()}
          />
          {saving ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={c.primary} /> : null}
          <SalonButton
            variant="outlineGray"
            title="Vaciar lista"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={clear}
            disabled={saving}
          />
        </>
      ) : null}

      <SalonButton
        variant="outlineGray"
        title="Seguir eligiendo servicios"
        fullWidth
        style={{ marginTop: spacing.md }}
        onPress={onClose}
        disabled={saving}
      />
    </ScrollView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    wrap: { paddingBottom: spacing.xl },
    intro: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      lineHeight: 21,
      marginBottom: spacing.md,
    },
    card: {
      borderRadius: radii.lg,
      backgroundColor: c.card,
      padding: spacing.md,
      paddingTop: spacing.sm + 4,
      paddingRight: spacing.xl,
      marginBottom: spacing.md,
      overflow: 'hidden',
      position: 'relative',
    },
    sucursalCard: {
      borderRadius: radii.lg,
      backgroundColor: c.card,
      padding: spacing.md,
      marginBottom: spacing.md,
      overflow: 'visible',
      zIndex: 2,
    },
    removeBtn: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      zIndex: 2,
      padding: 4,
    },
    whenBlock: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.cardBorder,
      paddingTop: spacing.md,
      marginTop: spacing.md,
    },
    whenLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      color: c.foregroundSubtle,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    canjeBanner: {
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.md,
    },
    canjeBannerTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      lineHeight: 19,
    },
  });
}
