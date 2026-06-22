import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, ChevronDown, Check, Sparkles } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, getClientSucursalId, setClientSucursalId } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';

const GOLD = '#C5A368';

function branchInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'SA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function ClientSucursalPicker({ onChange, compact = false, canjeSummary = '' }) {
  const { colors: c, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
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

  const closeDropdown = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    if (open) {
      closeDropdown();
      return;
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(width || 0, 220),
        height: height || 52,
      });
      setOpen(true);
    });
  }, [open, closeDropdown]);
  if (loading) {
    return (
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        <View style={[styles.bar, styles.barInline, styles.barShellBg]}>
          <ActivityIndicator size="small" color={GOLD} />
          <Text style={[styles.barSub, { color: c.foregroundMuted }]}>Cargando sucursal…</Text>
        </View>
      </View>
    );
  }

  const canjeTxt = String(canjeSummary || '').trim();

  const canjeStrip = canjeTxt ? (
    <View
      style={[
        styles.canjeStrip,
        { backgroundColor: isDark ? 'rgba(197,163,104,0.12)' : 'rgba(197,163,104,0.08)', borderTopColor: c.cardBorder },
      ]}
    >
      <Text style={[styles.canjeStripTxt, { color: c.foregroundMuted }]}>{canjeTxt}</Text>
    </View>
  ) : null;

  if (loadError || sucursales.length === 0) {
    return (
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        <TouchableOpacity
          style={[styles.bar, styles.barInline, styles.barShellBg]}
          onPress={() => void load()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Reintentar cargar sucursales"
        >
          <View style={styles.barIcon}>
            <MapPin size={16} color={GOLD} strokeWidth={2} />
          </View>
          <Text style={[styles.barSub, { color: c.foregroundMuted }]} numberOfLines={2}>
            {loadError || 'Sin sucursales · tocá para reintentar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dropdownTop = anchor ? anchor.y + anchor.height + 6 : 0;
  const spaceBelow = anchor ? windowHeight - dropdownTop - 16 : 240;
  const listMaxH = Math.min(220, Math.max(120, spaceBelow - 96), sucursales.length * 52 + 4);

  const dropdownPanel = open && anchor ? (
    <Pressable
      style={[
        styles.dropdown,
        {
          top: dropdownTop,
          left: anchor.x,
          width: anchor.width,
          backgroundColor: c.card,
          borderColor: c.cardBorder,
        },
      ]}
      onPress={(e) => e.stopPropagation()}
    >
      <View style={styles.sheetHead}>
        <View style={styles.sheetHeadIcon}>
          <Sparkles size={12} color={GOLD} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sheetKicker, { color: GOLD }]}>Salón Andreas</Text>
          <Text style={[styles.sheetTitle, { color: c.foreground }]}>Elegí tu local</Text>
        </View>
      </View>
      <Text style={[styles.sheetHint, { color: c.foregroundMuted }]}>
        Stock, citas y pedidos usan esta sucursal.
      </Text>

      <ScrollView
        style={{ maxHeight: listMaxH }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {sucursales.map((s) => {
          const on = String(selectedId) === String(s.id);
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.option,
                {
                  borderColor: on ? GOLD : c.cardBorder,
                  backgroundColor: on
                    ? isDark
                      ? 'rgba(197,163,104,0.14)'
                      : 'rgba(197,163,104,0.10)'
                    : c.background,
                },
              ]}
              onPress={() => pick(s)}
              activeOpacity={0.86}
            >
              <View style={[styles.optionBadge, on && styles.optionBadgeOn]}>
                <Text style={[styles.optionBadgeTxt, { color: on ? '#1A1510' : GOLD }]}>
                  {branchInitials(s.nombre)}
                </Text>
              </View>
              <View style={styles.optionMid}>
                <Text style={[styles.optionTitle, { color: c.foreground }]} numberOfLines={1}>
                  {s.nombre}
                </Text>
                {s.direccion ? (
                  <Text style={[styles.optionSub, { color: c.foregroundMuted }]} numberOfLines={1}>
                    {s.direccion}
                  </Text>
                ) : s.es_matriz ? (
                  <Text style={[styles.optionSub, { color: c.foregroundMuted }]}>Matriz</Text>
                ) : null}
              </View>
              {on ? (
                <View style={styles.checkBubble}>
                  <Check size={12} color="#1A1510" strokeWidth={3} />
                </View>
              ) : (
                <View style={[styles.radio, { borderColor: c.cardBorder }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Pressable>
  ) : null;

  return (
    <>
      <View ref={anchorRef} collapsable={false} style={[styles.wrap, compact && styles.wrapCompact]}>
        <View style={styles.bar}>
          <TouchableOpacity
            onPress={toggleDropdown}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Elegir sucursal"
            accessibilityState={{ expanded: open }}
          >
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(197,163,104,0.35)', 'rgba(197,163,104,0.08)']
                  : ['rgba(197,163,104,0.28)', 'rgba(197,163,104,0.06)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.barGradient}
            >
              <View style={styles.barIcon}>
                <MapPin size={17} color={GOLD} strokeWidth={2.2} />
              </View>
              <View style={styles.barMid}>
                <Text style={[styles.barKicker, { color: GOLD }]} numberOfLines={1}>
                  Tu sucursal
                </Text>
                <Text style={[styles.barTitle, { color: c.foreground }]} numberOfLines={1}>
                  {selectedLabel}
                </Text>
              </View>
              <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
                <ChevronDown size={18} color={GOLD} strokeWidth={2} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          {canjeStrip}
        </View>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={closeDropdown}>
          {dropdownPanel}
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(c, isDark) {
  return StyleSheet.create({
    wrap: {
      width: '100%',
      maxWidth: 320,
      marginBottom: spacing.md,
    },
    wrapCompact: {
      marginBottom: spacing.sm,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    bar: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(197,163,104,0.35)' : 'rgba(197,163,104,0.45)',
      width: '100%',
      minHeight: 52,
    },
    barShellBg: {
      backgroundColor: isDark ? c.card : '#FFFCF7',
    },
    barInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
    },
    barGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 52,
      width: '100%',
    },
    barIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    barMid: {
      flex: 1,
      minWidth: 0,
    },
    barKicker: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginBottom: 1,
    },
    barTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      lineHeight: 18,
    },
    barSub: {
      fontFamily: typography.fontSans,
      fontSize: 11,
    },
    canjeStrip: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    canjeStripTxt: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
    },
    dropdown: {
      position: 'absolute',
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.45 : 0.18,
      shadowRadius: 16,
      elevation: 16,
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    sheetHeadIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(197,163,104,0.15)' : 'rgba(197,163,104,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetKicker: {
      fontFamily: typography.fontSansMedium,
      fontSize: 9,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    sheetTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 15,
      lineHeight: 18,
    },
    sheetHint: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 14,
      marginBottom: 6,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingVertical: 6,
      paddingHorizontal: 8,
      marginBottom: 5,
    },
    optionBadge: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      backgroundColor: isDark ? 'rgba(197,163,104,0.12)' : 'rgba(197,163,104,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionBadgeOn: {
      backgroundColor: GOLD,
    },
    optionBadgeTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
    },
    optionMid: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    optionSub: {
      fontFamily: typography.fontSans,
      fontSize: 10,
      marginTop: 1,
    },
    checkBubble: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: GOLD,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
    },
  });
}
