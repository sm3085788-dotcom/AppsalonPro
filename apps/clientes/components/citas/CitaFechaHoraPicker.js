import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SalonButton } from '../luxury/SalonButton';
import { useTheme } from '../../theme/ThemeProvider';

function ensureDate(d, fallback) {
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
  if (fallback instanceof Date && !Number.isNaN(fallback.getTime())) return new Date(fallback.getTime());
  const n = new Date();
  n.setDate(n.getDate() + 1);
  n.setHours(10, 0, 0, 0);
  return n;
}

export function mergeDraft(base, draft, mode) {
  const next = new Date(ensureDate(base));
  const d = ensureDate(draft, base);
  if (mode === 'date') {
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
  } else {
    next.setHours(d.getHours(), d.getMinutes(), 0, 0);
  }
  return next;
}

/**
 * API imperativa de Android (calendario nativo). Evita montar <DateTimePicker> en React,
 * que en listas/Expo Go bloquea la selección en la cuadrícula.
 */
export function openAndroidCitaPicker({
  mode,
  value,
  minimumDate,
  maximumDate,
  onCommit,
  onCancel,
}) {
  if (Platform.OS !== 'android') return;

  const base = ensureDate(value);
  const minDate = ensureDate(minimumDate, new Date());
  const maxDate = ensureDate(
    maximumDate,
    new Date(new Date().getFullYear() + 1, 11, 31),
  );

  try {
    DateTimePickerAndroid.dismiss(mode);
  } catch {
    /* ignore */
  }

  DateTimePickerAndroid.open({
    value: new Date(base.getTime()),
    mode,
    display: 'default',
    is24Hour: false,
    minimumDate: mode === 'date' ? minDate : undefined,
    maximumDate: mode === 'date' ? maxDate : undefined,
    onChange: (event, selectedDate) => {
      if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') {
        onCancel?.();
        return;
      }
      if (event.type === 'set' && selectedDate) {
        onCommit?.(mergeDraft(base, selectedDate, mode));
        return;
      }
      if (selectedDate) {
        onCommit?.(mergeDraft(base, selectedDate, mode));
      }
    },
  });
}

/**
 * @param {object} props
 * @param {Date} props.value
 * @param {(d: Date) => void} props.onChange
 * @param {Date} [props.minimumDate]
 * @param {Date} [props.maximumDate]
 * @param {(mode: 'date'|'time') => void} [props.onRequestAndroidPicker]
 */
export function CitaFechaHoraPicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  onRequestAndroidPicker,
}) {
  const { colors: c } = useTheme();
  const safeValue = useMemo(() => ensureDate(value), [value]);
  const minDate = useMemo(() => ensureDate(minimumDate, new Date()), [minimumDate]);
  const maxDate = useMemo(
    () =>
      ensureDate(
        maximumDate,
        new Date(new Date().getFullYear() + 1, 11, 31),
      ),
    [maximumDate],
  );

  const [iosPicker, setIosPicker] = useState(null);
  const [iosDraft, setIosDraft] = useState(safeValue);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        dateRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        dateTxt: {
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foreground,
          flex: 1,
        },
        webHint: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundMuted,
          lineHeight: 17,
          marginBottom: spacing.sm,
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'flex-end',
        },
        modalCard: {
          backgroundColor: c.card,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          padding: spacing.lg,
          paddingBottom: spacing.xl,
        },
      }),
    [c],
  );

  const openPicker = useCallback(
    (mode) => {
      if (Platform.OS === 'web') return;

      if (Platform.OS === 'android') {
        if (onRequestAndroidPicker) {
          onRequestAndroidPicker(mode);
          return;
        }
        openAndroidCitaPicker({
          mode,
          value: safeValue,
          minimumDate: minDate,
          maximumDate: maxDate,
          onCommit: (next) => onChange(next),
        });
        return;
      }

      setIosDraft(safeValue);
      setIosPicker(mode);
    },
    [safeValue, minDate, maxDate, onChange, onRequestAndroidPicker],
  );

  const closeIosPicker = useCallback(() => setIosPicker(null), []);

  const onIosSpinnerChange = (mode) => (_, selected) => {
    if (!selected) return;
    if (mode === 'date') {
      setIosDraft((prev) => {
        const next = new Date(prev);
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        return next;
      });
    } else {
      setIosDraft((prev) => {
        const next = new Date(prev);
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        return next;
      });
    }
  };

  const confirmIos = () => {
    if (iosPicker === 'date') onChange(mergeDraft(safeValue, iosDraft, 'date'));
    else if (iosPicker === 'time') onChange(mergeDraft(safeValue, iosDraft, 'time'));
    closeIosPicker();
  };

  const dateLabel = safeValue.toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeLabel = safeValue.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (Platform.OS === 'web') {
    return (
      <Text style={styles.webHint}>
        Fecha y hora: usá la app en tu teléfono para elegir el horario de la cita.
      </Text>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.dateRow, { marginTop: spacing.sm }]}
        onPress={() => openPicker('date')}
        activeOpacity={0.85}
      >
        <Text style={styles.dateTxt}>{dateLabel}</Text>
        <Calendar size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.dateRow} onPress={() => openPicker('time')} activeOpacity={0.85}>
        <Text style={styles.dateTxt}>{timeLabel}</Text>
        <Clock size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
      </TouchableOpacity>

      {Platform.OS === 'ios' && iosPicker ? (
        <Modal transparent animationType="fade" visible onRequestClose={closeIosPicker}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <DateTimePicker
                value={iosDraft}
                mode={iosPicker}
                display="spinner"
                minimumDate={iosPicker === 'date' ? minDate : undefined}
                maximumDate={iosPicker === 'date' ? maxDate : undefined}
                onChange={onIosSpinnerChange(iosPicker)}
              />
              <SalonButton
                title="Listo"
                variant="heroGold"
                fullWidth
                onPress={confirmIos}
                style={{ marginTop: spacing.md }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
