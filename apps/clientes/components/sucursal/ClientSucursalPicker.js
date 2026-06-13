import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MapPin, ChevronDown, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, getClientSucursalId, setClientSucursalId } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';

export function ClientSucursalPicker({ onChange, compact = false }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState('Elegir sucursal');

  const syncSelection = useCallback(async (list) => {
    const id = await getClientSucursalId();
    if (!id) {
      const matriz = list.find((s) => s.es_matriz) || list[0];
      if (matriz?.id) {
        await setClientSucursalId(matriz.id);
        setSelectedId(matriz.id);
        setSelectedLabel(matriz.nombre);
        onChangeRef.current?.(matriz.id);
        return;
      }
      setSelectedId(null);
      setSelectedLabel('Elegir sucursal');
      return;
    }
    const row = list.find((s) => String(s.id) === String(id));
    setSelectedId(id);
    setSelectedLabel(row?.nombre || 'Sucursal');
    onChangeRef.current?.(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await db.sucursales.listActivas();
      if (error) {
        setLoadError(error.message || 'No se pudieron cargar las sucursales.');
        setSucursales([]);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setSucursales(list);
      if (!list.length) {
        setLoadError('No hay sucursales activas. El salón debe crearlas en App Salón → Sucursales.');
        return;
      }
      await syncSelection(list);
    } finally {
      setLoading(false);
    }
  }, [syncSelection]);

  useEffect(() => {
    load();
  }, [load]);

  const pick = async (row) => {
    await setClientSucursalId(row.id);
    setSelectedId(row.id);
    setSelectedLabel(row.nombre);
    setOpen(false);
    onChangeRef.current?.(row.id);
  };

  if (loading) {
    return (
      <View style={[styles.bar, compact && styles.barCompact, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
        <ActivityIndicator size="small" color={c.primary} />
        <Text style={[styles.barText, { color: c.foregroundMuted }]}>Cargando sucursales…</Text>
      </View>
    );
  }

  if (loadError || sucursales.length === 0) {
    return (
      <TouchableOpacity
        style={[styles.bar, compact && styles.barCompact, { borderColor: c.cardBorder, backgroundColor: c.card }]}
        onPress={() => void load()}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Reintentar cargar sucursales"
      >
        <MapPin size={18} color={c.primary} strokeWidth={2} />
        <Text style={[styles.barText, { color: c.foregroundMuted }]} numberOfLines={2}>
          {loadError || 'Sin sucursales · tocá para reintentar'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.bar, compact && styles.barCompact, { borderColor: c.cardBorder, backgroundColor: c.card }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Elegir sucursal"
      >
        <MapPin size={18} color={c.primary} strokeWidth={2} />
        <Text style={[styles.barText, { color: c.foreground }]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <ChevronDown size={18} color={c.foregroundMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: c.foreground }]}>Tu sucursal</Text>
            <Text style={[styles.sheetHint, { color: c.foregroundMuted }]}>
              Tienda, citas y pedidos usan el stock de esta sucursal.
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {sucursales.map((s) => {
                const on = String(selectedId) === String(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.option, { borderColor: on ? c.primary : c.cardBorder }]}
                    onPress={() => pick(s)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, { color: c.foreground }]}>{s.nombre}</Text>
                      {s.direccion ? (
                        <Text style={[styles.optionSub, { color: c.foregroundMuted }]} numberOfLines={2}>
                          {s.direccion}
                        </Text>
                      ) : null}
                    </View>
                    {on ? <Check size={20} color={c.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    barCompact: {
      marginBottom: spacing.sm,
    },
    barText: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    sheet: {
      borderRadius: radii.xl,
      padding: spacing.lg,
    },
    sheetTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      marginBottom: spacing.xs,
    },
    sheetHint: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.md,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    optionTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    optionSub: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginTop: 2,
    },
  });
}
