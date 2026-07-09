import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';

function branchLabel(row) {
  if (!row) return 'Elegir sucursal';
  return row.es_matriz ? `${row.nombre} · Matriz` : row.nombre;
}

/**
 * Selector compacto de sucursal (lista desplegable).
 */
export function SalonSucursalSelect({
  sucursales,
  selectedId,
  onSelect,
  label = 'Sucursal',
  variant = 'default',
  style,
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const [open, setOpen] = useState(false);
  const isField = variant === 'field';

  const selected = useMemo(
    () => (sucursales || []).find((s) => String(s.id) === String(selectedId)) || null,
    [sucursales, selectedId],
  );

  const pick = (id) => {
    onSelect(id);
    setOpen(false);
  };

  const trigger = isField ? (
    <View style={[styles.fieldWrap, style]}>
      <Text style={[styles.fieldLbl, { color: c.foregroundMuted }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.fieldTap, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${branchLabel(selected)}`}
      >
        <View style={styles.fieldTapInner}>
          <Text style={[styles.fieldValue, { color: c.foreground }]} numberOfLines={1}>
            {branchLabel(selected)}
          </Text>
          <ChevronDown size={18} color={c.primary} strokeWidth={2} />
        </View>
      </TouchableOpacity>
    </View>
  ) : (
    <TouchableOpacity
      style={[styles.trigger, { borderColor: c.cardBorder, backgroundColor: c.card }, style]}
      onPress={() => setOpen(true)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${branchLabel(selected)}`}
    >
      <Text style={[styles.triggerLabel, { color: c.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.triggerValue, { color: c.foreground }]} numberOfLines={1}>
        {branchLabel(selected)}
      </Text>
      <ChevronDown size={18} color={c.foregroundMuted} strokeWidth={2} />
    </TouchableOpacity>
  );

  return (
    <>
      {trigger}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.panel, { backgroundColor: c.background, borderColor: c.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.panelTitle, { color: c.foreground }]}>{label}</Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" bounces={false}>
              {(sucursales || []).map((s) => {
                const on = String(selectedId) === String(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.option,
                      {
                        borderColor: on ? c.primary : c.cardBorder,
                        backgroundColor: on ? c.surfaceMuted : c.card,
                      },
                    ]}
                    onPress={() => pick(s.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.optionTxt, { color: on ? c.primary : c.foreground }]}>
                      {branchLabel(s)}
                    </Text>
                    {on ? <Check size={18} color={c.primary} strokeWidth={2.5} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={[styles.cancelTxt, { color: c.foregroundMuted }]}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles() {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    triggerLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    triggerValue: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      textAlign: 'right',
    },
    fieldWrap: {
      marginBottom: spacing.sm,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    fieldTap: {
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.sm,
    },
    fieldTapInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    fieldValue: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    panel: {
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.md,
      maxHeight: '70%',
    },
    panelTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      marginBottom: spacing.sm,
    },
    list: {
      maxHeight: 320,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      marginBottom: spacing.sm,
    },
    optionTxt: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      marginRight: spacing.sm,
    },
    cancelBtn: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
      marginTop: spacing.xs,
    },
    cancelTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
  });
}
