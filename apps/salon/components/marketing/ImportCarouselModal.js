import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  db,
  getArticuloTipo,
  normalizeServicioCategoria,
  buildHomeCarouselMarketingPayload,
  inventarioRowImageUrls,
  resolveInventarioCarouselMediaUrl,
} from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton, useSubStyles } from '../luxury';

const MAX_CAROUSEL_SLIDES = 15;

/**
 * Modal «Importar al carrusel» — un ScrollView, botón Importar por fila (evita fallos de toque en Android).
 */
export function ImportCarouselModal({
  visible,
  onClose,
  carouselPublishedCount = 0,
  onImported,
  customCta = '',
  onCustomCtaChange,
}) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [query, setQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const rowsRef = useRef([]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.inventario.getAll();
      if (error) throw error;
      const list = (data || []).filter((r) => {
        const t = getArticuloTipo(r);
        return t === 'servicio' || t === 'producto';
      });
      setRows(list);
      rowsRef.current = list;
    } catch (e) {
      Alert.alert('Inventario', e?.message || 'No se pudo cargar inventario.');
      setRows([]);
      rowsRef.current = [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setBusyId(null);
    setQuery('');
    setTipoFilter('todos');
    Keyboard.dismiss();
    void loadRows();
  }, [visible, loadRows]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const summary = useMemo(() => {
    let productos = 0;
    let servicios = 0;
    let serviciosSinFoto = 0;
    for (const r of rows) {
      const t = getArticuloTipo(r);
      if (t === 'producto') productos += 1;
      else if (t === 'servicio') {
        servicios += 1;
        if (!inventarioRowImageUrls(r).length) serviciosSinFoto += 1;
      }
    }
    return { productos, servicios, serviciosSinFoto };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const t = getArticuloTipo(r);
      if (tipoFilter === 'producto' && t !== 'producto') return false;
      if (tipoFilter === 'servicio' && t !== 'servicio') return false;
      if (!q) return true;
      return `${r.nombre || ''} ${r.categoria || ''}`.toLowerCase().includes(q);
    });
  }, [rows, query, tipoFilter]);

  const runImport = async (row) => {
    const rowId = row?.id != null ? String(row.id).trim() : '';
    if (!rowId) {
      Alert.alert(
        'Inventario',
        'Este artículo no tiene ID. Editá y guardá de nuevo en Inventario.',
      );
      return;
    }
    if (busyId) return;

    if (carouselPublishedCount >= MAX_CAROUSEL_SLIDES) {
      Alert.alert('Límite del carrusel', `Máximo ${MAX_CAROUSEL_SLIDES} diapositivas publicadas.`);
      return;
    }

    let built;
    try {
      built = buildHomeCarouselMarketingPayload(row, { customCta });
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo preparar la diapositiva.');
      return;
    }

    if (!built.mediaUrl) {
      Alert.alert(
        'Sin imagen',
        built.isProducto
          ? 'Subí una foto en Inventario para este producto.'
          : 'No hay imagen para este servicio. Subí portada en Inventario.',
      );
      return;
    }

    setBusyId(rowId);
    try {
      const { data: created, error: crErr } = await db.marketingPosts.create(built.payload);
      if (crErr) {
        let hint = '';
        const msg = String(crErr.message || '');
        if (crErr.code === '42501' || /policy|permission|RLS/i.test(msg)) {
          hint = '\n\nEjecutá supabase-marketing-carousel-import-fix.sql en Supabase.';
        } else if (/media_url|validate_marketing_media_url|file:/i.test(msg)) {
          hint =
            '\n\nLa URL de imagen fue rechazada por el trigger de Supabase. Ejecutá supabase-marketing-media-url-trigger-fix.sql o subí la foto del servicio a Storage en Inventario.';
        }
        Alert.alert('Base de datos', `${msg || 'No se pudo importar.'}${hint}`);
        return;
      }
      if (created?.id && created.status !== 'published') {
        await db.marketingPosts.publish(created.id);
      }
      Alert.alert(
        'Listo',
        built.isProducto
          ? 'Producto en el carrusel → App Clientes abre Tienda (carrito).'
          : 'Servicio en el carrusel → App Clientes abre Mis citas.',
      );
      onClose();
      await onImported?.();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo importar.');
    } finally {
      setBusyId(null);
    }
  };

  const onImportPress = (row) => {
    Keyboard.dismiss();
    const rowId = row?.id != null ? String(row.id).trim() : '';
    const fresh = rowsRef.current.find((r) => String(r?.id ?? '').trim() === rowId) || row;
    void runImport(fresh);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.shell, { backgroundColor: c.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View
          style={[
            styles.head,
            { paddingTop: insets.top + spacing.sm, borderBottomColor: c.cardBorder },
          ]}
        >
          <Text style={[styles.title, { color: c.foreground }]}>Importar al carrusel</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
            <X size={24} color={c.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl,
          }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Text style={[subStyles.muted, styles.summary]}>
            {summary.productos} producto(s) · {summary.servicios} servicio(s)
            {summary.serviciosSinFoto > 0
              ? ` · ${summary.serviciosSinFoto} servicio(s) usan imagen de categoría`
              : ''}
          </Text>

          <TextInput
            style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
            placeholder="Buscar producto o servicio…"
            placeholderTextColor={c.foregroundSubtle}
            value={query}
            onChangeText={setQuery}
          />

          <View style={styles.chipRow}>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'producto', label: 'Productos' },
              { id: 'servicio', label: 'Servicios' },
            ].map((opt) => {
              const on = tipoFilter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.chip,
                    {
                      borderColor: on ? c.primary : c.cardBorder,
                      backgroundColor: on ? c.surfaceMuted : c.card,
                    },
                  ]}
                  onPress={() => setTipoFilter(opt.id)}
                >
                  <Text
                    style={{
                      color: on ? c.primary : c.foregroundMuted,
                      fontFamily: typography.fontSansMedium,
                      fontSize: 12,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
          ) : filtered.length === 0 ? (
            <Text style={[subStyles.muted, styles.empty]}>
              {rows.length === 0
                ? 'No hay artículos en inventario.'
                : tipoFilter === 'servicio'
                  ? 'Ningún servicio en la lista.'
                  : tipoFilter === 'producto'
                    ? 'Ningún producto en la lista.'
                    : 'Sin resultados para la búsqueda.'}
            </Text>
          ) : (
            filtered.map((row) => {
              const rowId = row?.id != null ? String(row.id).trim() : '';
              const tipo = getArticuloTipo(row);
              const isProducto = tipo === 'producto';
              const img = resolveInventarioCarouselMediaUrl(row);
              const busy = busyId === rowId;
              const canImport = !!img && !!rowId;
              const tipoLabel = isProducto ? 'Producto · Tienda' : 'Servicio · Mis citas';
              const catLabel = isProducto
                ? String(row.categoria || 'Producto')
                : normalizeServicioCategoria(row.categoria);

              return (
                <View
                  key={rowId ? `${rowId}-${tipo}` : `row-${row.nombre}`}
                  style={[styles.row, { borderBottomColor: c.cardBorder }]}
                  collapsable={false}
                >
                  {img ? (
                    <Image source={{ uri: img }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: c.surfaceMuted }]} />
                  )}
                  <View style={styles.rowBody}>
                    <Text
                      style={{ color: c.foreground, fontFamily: typography.fontSansMedium }}
                      numberOfLines={1}
                    >
                      {row.nombre}
                    </Text>
                    <Text style={{ color: c.primary, fontSize: 11, fontFamily: typography.fontSansMedium }}>
                      {tipoLabel}
                    </Text>
                    <Text style={{ color: c.foregroundMuted, fontSize: 12 }} numberOfLines={1}>
                      {catLabel}
                    </Text>
                  </View>
                  <SalonButton
                    title="Importar"
                    variant="outlineGold"
                    loading={busy}
                    disabled={!canImport || (!!busyId && !busy)}
                    onPress={() => onImportPress(row)}
                    style={styles.importBtn}
                    textStyle={{ fontSize: 12 }}
                  />
                </View>
              );
            })
          )}

          <Text style={[styles.fieldLbl, { color: c.foreground, marginTop: spacing.lg }]}>
            Texto del botón en App Clientes (opcional)
          </Text>
          <Text style={[subStyles.muted, { fontSize: 11, marginBottom: spacing.xs }]}>
            Vacío: producto → «Ver en tienda» · servicio → «Ver servicio»
          </Text>
          <TextInput
            style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
            placeholder="Ej. Ver en tienda / Ver servicio"
            placeholderTextColor={c.foregroundSubtle}
            value={customCta}
            onChangeText={onCustomCtaChange}
            maxLength={28}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
      flex: 1,
      fontFamily: typography.fontDisplay,
      fontSize: 20,
    },
    scroll: { flex: 1 },
    summary: { marginTop: spacing.sm, marginBottom: spacing.sm, fontSize: 12 },
    input: {
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontFamily: typography.fontSans,
      fontSize: 15,
      marginBottom: spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    empty: { textAlign: 'center', marginTop: spacing.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      minHeight: 76,
      ...Platform.select({
        android: { elevation: 0 },
        default: {},
      }),
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: radii.sm,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    importBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      minWidth: 88,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
  });
}
