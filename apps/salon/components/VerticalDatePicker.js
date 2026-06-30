import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SalonButton } from './luxury/SalonButton';

function ensureDate(d, fallback) {
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
  if (fallback instanceof Date && !Number.isNaN(fallback.getTime())) return new Date(fallback.getTime());
  return new Date();
}

/**
 * Selector de fecha/hora con rueda vertical (spinner), sin calendario de cuadrícula.
 */
export function VerticalDatePicker({
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  label,
  colors: c,
  style,
  disabled = false,
}) {
  const safeValue = useMemo(() => ensureDate(value), [value]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(safeValue);

  const openPicker = useCallback(() => {
    if (disabled) return;
    setDraft(safeValue);
    setOpen(true);
  }, [disabled, safeValue]);

  const closePicker = useCallback(() => setOpen(false), []);

  const confirm = useCallback(() => {
    onChange?.(draft);
    setOpen(false);
  }, [draft, onChange]);

  const displayLabel = useMemo(() => {
    if (mode === 'time') {
      return safeValue.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
    }
    return safeValue.toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [safeValue, mode]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        touch: {
          borderWidth: 1,
          borderColor: c?.cardBorder ?? '#ddd',
          borderRadius: radii.md,
          backgroundColor: c?.card ?? '#fff',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: 44,
          justifyContent: 'center',
        },
        touchTxt: {
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c?.foreground ?? '#111',
        },
        lbl: {
          fontFamily: typography.fontSansMedium,
          fontSize: 12,
          color: c?.foregroundMuted ?? '#666',
          marginBottom: spacing.xs,
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'flex-end',
        },
        modalCard: {
          backgroundColor: c?.card ?? '#fff',
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          padding: spacing.lg,
          paddingBottom: spacing.xl + (Platform.OS === 'ios' ? 8 : 0),
        },
      }),
    [c],
  );

  return (
    <View style={style}>
      {label ? <Text style={styles.lbl}>{label}</Text> : null}
      <TouchableOpacity style={styles.touch} onPress={openPicker} activeOpacity={0.85} disabled={disabled}>
        <Text style={styles.touchTxt}>{displayLabel}</Text>
      </TouchableOpacity>

      {open ? (
        <Modal transparent animationType="fade" visible onRequestClose={closePicker}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closePicker}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()}>
              <View style={styles.modalCard}>
                <DateTimePicker
                  value={draft}
                  mode={mode}
                  display="spinner"
                  minimumDate={mode === 'date' ? minimumDate : undefined}
                  maximumDate={mode === 'date' ? maximumDate : undefined}
                  onChange={(_, selected) => {
                    if (selected) setDraft(selected);
                  }}
                />
                <SalonButton title="Listo" variant="outlineGold" fullWidth onPress={confirm} style={{ marginTop: spacing.sm }} />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}

/** Inline: modal ya abierto controlado externamente (p. ej. ControlPanelScreen). */
export function VerticalDatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  mode = 'date',
  minimumDate,
  maximumDate,
  colors: c,
}) {
  const safeValue = useMemo(() => ensureDate(value), [value]);
  const [draft, setDraft] = useState(safeValue);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'flex-end',
        },
        modalCard: {
          backgroundColor: c?.card ?? '#fff',
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          padding: spacing.lg,
          paddingBottom: spacing.xl,
        },
      }),
    [c],
  );

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.modalCard}>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              minimumDate={mode === 'date' ? minimumDate : undefined}
              maximumDate={mode === 'date' ? maximumDate : undefined}
              onChange={(_, selected) => {
                if (selected) setDraft(selected);
              }}
            />
            <SalonButton
              title="Listo"
              variant="outlineGold"
              fullWidth
              onPress={() => {
                onChange?.(draft);
                onClose?.();
              }}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
