import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Trash2, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { clearAllBasureroEntries, getBasureroEntries } from '../services/salonBasurero';

const KNOWN_SOURCES = new Set([
  'marketing_posts',
  'inventario',
  'clientes',
  'incidentes',
  'mensajes',
  'proveedores',
]);

function sourceLabel(source) {
  const map = {
    marketing_posts: 'Marketing · Tendencias',
    inventario: 'Inventario',
    proveedores: 'Proveedores',
    clientes: 'Clientes',
    incidentes: 'Incidentes',
    mensajes: 'Mensajes',
  };
  return map[source] || source;
}

export function BasureroScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortMode, setSortMode] = useState('fecha_desc');
  const [filterSource, setFilterSource] = useState('todos');

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const load = useCallback(async () => {
    const list = await getBasureroEntries();
    setEntries(list);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtroResumen = useMemo(() => {
    const orden =
      sortMode === 'fecha_asc'
        ? 'Más antiguos primero'
        : sortMode === 'nombre_asc'
          ? 'Título A → Z'
          : sortMode === 'nombre_desc'
            ? 'Título Z → A'
            : 'Más recientes primero';
    const origen =
      filterSource === 'todos'
        ? 'Todos los orígenes'
        : filterSource === 'otros'
          ? 'Otros / desconocido'
          : sourceLabel(filterSource);
    return `${orden} · ${origen}`;
  }, [sortMode, filterSource]);

  const filtered = useMemo(() => {
    let rows = [...entries];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((e) => {
        const blob = [e.title, e.summary, sourceLabel(e.source), e.source].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    if (filterSource === 'otros') {
      rows = rows.filter((e) => !KNOWN_SOURCES.has(String(e.source || '')));
    } else if (filterSource !== 'todos') {
      rows = rows.filter((e) => String(e.source) === filterSource);
    }
    rows.sort((a, b) => {
      if (sortMode === 'fecha_desc' || sortMode === 'fecha_asc') {
        const ta = new Date(a.deletedAt).getTime();
        const tb = new Date(b.deletedAt).getTime();
        return sortMode === 'fecha_desc' ? tb - ta : ta - tb;
      }
      const cmp = String(a.title || '').localeCompare(String(b.title || ''), 'es', { sensitivity: 'base' });
      return sortMode === 'nombre_desc' ? -cmp : cmp;
    });
    return rows;
  }, [entries, query, filterSource, sortMode]);

  const verCopia = (item) => {
    let text;
    try {
      text = JSON.stringify(item.snapshot, null, 2);
    } catch {
      text = String(item.snapshot);
    }
    const max = 3500;
    if (text.length > max) text = `${text.slice(0, max)}\n… (truncado)`;
    Alert.alert('Copia guardada', text, [{ text: 'Cerrar' }], { cancelable: true });
  };

  const limpiarTodo = () => {
    if (!entries.length) {
      Alert.alert('Basurero', 'No hay nada para borrar.');
      return;
    }
    Alert.alert(
      'Vaciar basurero',
      `Se eliminarán ${entries.length} copia(s) guardadas en este dispositivo. No afecta la base de datos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar todo',
          style: 'destructive',
          onPress: async () => {
            await clearAllBasureroEntries();
            setEntries([]);
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
        <Trash2 size={20} color={c.foregroundMuted} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[subStyles.muted, styles.meta]} numberOfLines={1}>
          {sourceLabel(item.source)} · {new Date(item.deletedAt).toLocaleString('es-GT')}
        </Text>
        {item.summary ? (
          <Text style={[subStyles.muted, styles.sum]} numberOfLines={2}>
            {item.summary}
          </Text>
        ) : null}
        <TouchableOpacity onPress={() => verCopia(item)} hitSlop={8}>
          <Text style={[styles.link, { color: c.primary }]}>Ver copia JSON</Text>
        </TouchableOpacity>
      </View>
      <ChevronRight size={18} color={c.foregroundMuted} />
    </View>
  );

  const emptyText = loading
    ? 'Cargando…'
    : !entries.length
      ? 'Todavía no hay eliminaciones registradas. Al borrar contenido en Marketing (u otros módulos conectados), aparecerá una copia aquí.'
      : 'Ningún resultado con la búsqueda o filtros actuales.';

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Basurero"
        subtitle="Copias locales de lo eliminado en App Salón (este dispositivo)."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
      >
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <SalonButton
            title="Limpiar todo"
            variant="outlineGray"
            fullWidth
            onPress={limpiarTodo}
            style={{ marginBottom: spacing.md }}
          />

          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar por título, resumen u origen…"
            placeholderTextColor={c.foregroundSubtle}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            accessibilityLabel="Buscar en basurero"
          />

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {filtered.length} copia{filtered.length === 1 ? '' : 's'}
              {!loading && entries.length ? ` de ${entries.length}` : ''}
            </Text>
            <TouchableOpacity
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Ordenar y filtros"
              onPress={() => setModalFiltros(true)}
            >
              <Text style={[styles.toolbarLink, { color: c.primary }]}>Ordenar · filtros</Text>
            </TouchableOpacity>
          </View>
          <Text style={[subStyles.muted, { fontSize: 12, lineHeight: 17, marginBottom: spacing.md }]} numberOfLines={2}>
            {filtroResumen}
          </Text>

          <FlatList
            data={filtered}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: padBottom, flexGrow: 1 }}
            ListEmptyComponent={<Text style={[subStyles.muted, { marginTop: spacing.sm }]}>{emptyText}</Text>}
          />
        </View>
      </SubScreenChrome>

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background }]}>
            <View style={styles.filterHead}>
              <Text style={[styles.filterTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Orden</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'fecha_desc', label: 'Más recientes' },
                { id: 'fecha_asc', label: 'Más antiguos' },
                { id: 'nombre_asc', label: 'Título A → Z' },
                { id: 'nombre_desc', label: 'Título Z → A' },
              ].map((opt) => {
                const on = sortMode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setSortMode(opt.id)}
                  >
                    <Text style={[styles.chipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Origen</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'marketing_posts', label: 'Marketing' },
                { id: 'inventario', label: 'Inventario' },
                { id: 'clientes', label: 'Clientes' },
                { id: 'incidentes', label: 'Incidentes' },
                { id: 'mensajes', label: 'Mensajes' },
                { id: 'proveedores', label: 'Proveedores' },
                { id: 'otros', label: 'Otros' },
              ].map((opt) => {
                const on = filterSource === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilterSource(opt.id)}
                  >
                    <Text style={[styles.chipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalFiltros(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    search: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    toolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    toolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    filterSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
    },
    filterHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    filterTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
    },
    sectionLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    chipTxt: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontFamily: typography.fontSansMedium, fontSize: 16 },
    meta: { fontSize: 12, marginTop: 4 },
    sum: { fontSize: 13, marginTop: 6, lineHeight: 18 },
    link: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginTop: spacing.sm,
    },
  });
}
