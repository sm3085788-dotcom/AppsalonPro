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
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, X, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, SalonButton, modalSheetBottomPad } from '../components/luxury';
import { ListSelectionToolbarLink } from '../components/ListSelectionBar';
import { useTheme } from '../theme/ThemeProvider';
import { useListSelection } from '../hooks/useListSelection';
import {
  deleteBasureroEntriesByIds,
  getBasureroEntries,
} from '../services/salonBasurero';
import { BASURERO_KNOWN_SOURCES, basureroSourceLabel } from '../services/salonBasureroSources';
import { restoreBasureroEntries } from '../services/salonBasureroRestore';
import { basureroEntryMatchesScope } from '../services/controlPanelScope';

export function BasureroScreen({
  onBack,
  embedded = false,
  branchScope = null,
  panelTab = 'basurero',
  onPanelTabChange,
}) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);
  const sel = useListSelection();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
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
    const orden = sortMode === 'fecha_asc' ? 'Más antiguos primero' : 'Más recientes primero';
    const origen =
      filterSource === 'todos'
        ? 'Todos los orígenes'
        : filterSource === 'otros'
          ? 'Otros / desconocido'
          : basureroSourceLabel(filterSource);
    return `${orden} · ${origen}`;
  }, [sortMode, filterSource]);

  const filtered = useMemo(() => {
    let rows = [...entries];
    if (branchScope?.sucursalId) {
      rows = rows.filter((e) => basureroEntryMatchesScope(e, branchScope));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((e) => {
        const blob = [e.title, e.summary, basureroSourceLabel(e.source), e.source].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    if (filterSource === 'otros') {
      rows = rows.filter((e) => !BASURERO_KNOWN_SOURCES.has(String(e.source || '')));
    } else if (filterSource !== 'todos') {
      rows = rows.filter((e) => String(e.source) === filterSource);
    }
    rows.sort((a, b) => {
      const ta = new Date(a.deletedAt).getTime();
      const tb = new Date(b.deletedAt).getTime();
      return sortMode === 'fecha_desc' ? tb - ta : ta - tb;
    });
    return rows;
  }, [entries, query, filterSource, sortMode, branchScope]);

  const selectedEntries = useMemo(
    () => filtered.filter((e) => sel.selectedIds.has(String(e.id))),
    [filtered, sel.selectedIds],
  );

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

  const confirmBorrarCopias = () => {
    if (!sel.count) return;
    Alert.alert(
      'Borrar copias',
      `¿Eliminar ${sel.count} copia(s) del basurero en este teléfono? No se restaurará nada en la base de datos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar copias',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteBasureroEntriesByIds([...sel.selectedIds]);
              sel.exitSelectMode();
              await load();
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const confirmRestaurar = () => {
    if (!sel.count) return;
    Alert.alert(
      'Restaurar',
      `¿Restaurar ${sel.count} registro(s) en Supabase? Si hay conflictos (FK, duplicados), algunos pueden fallar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            setBusy(true);
            try {
              const { ok, fail, errors } = await restoreBasureroEntries(selectedEntries);
              sel.exitSelectMode();
              await load();
              if (fail > 0) {
                Alert.alert(
                  'Restauración parcial',
                  `Restaurados: ${ok}. Fallidos: ${fail}.\n\n${errors.slice(0, 3).join('\n')}`,
                );
              } else {
                Alert.alert('Listo', ok === 1 ? 'Registro restaurado.' : `Se restauraron ${ok} registros.`);
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onRowPress = (item) => {
    if (sel.active) {
      sel.toggleId(item.id);
      return;
    }
    verCopia(item);
  };

  const renderItem = ({ item }) => {
    const picked = sel.isSelected(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.row,
          { borderBottomColor: c.cardBorder },
          picked && { backgroundColor: c.surfaceMuted },
          sel.active && picked && { borderLeftWidth: 3, borderLeftColor: c.primary },
        ]}
        onPress={() => onRowPress(item)}
        onLongPress={() => {
          if (!sel.active) sel.setActive(true);
          sel.toggleId(item.id);
        }}
        activeOpacity={0.7}
      >
        {sel.active ? (
          <View
            style={[
              styles.check,
              {
                borderColor: picked ? c.primary : c.cardBorder,
                backgroundColor: picked ? c.primary : 'transparent',
              },
            ]}
          >
            {picked ? <Check size={14} color={isDark ? '#141414' : '#fff'} strokeWidth={3} /> : null}
          </View>
        ) : null}
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
              {basureroSourceLabel(item.source)}
            </Text>
          </View>
          <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
            {new Date(item.deletedAt).toLocaleString('es-GT', {
              day: '2-digit',
              month: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {item.summary ? (
            <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
              {item.summary}
            </Text>
          ) : null}
        </View>
        {!sel.active ? <ChevronRight size={16} color={c.foregroundSubtle} /> : null}
      </TouchableOpacity>
    );
  };

  const emptyText = loading
    ? 'Cargando…'
    : !entries.length
      ? 'Todavía no hay eliminaciones registradas. Al borrar desde Papelería, Empleados, Marketing u otros módulos, aparecerá una copia aquí.'
      : 'Ningún resultado con la búsqueda o filtros actuales.';

  const filterOptions = [
    { id: 'todos', label: 'Todos', detail: 'Copias de cualquier módulo en este teléfono.' },
    { id: 'ventas', label: 'Papelería', detail: 'Facturas y ventas del punto de venta.' },
    { id: 'marketing_posts', label: 'Marketing', detail: 'Publicaciones y contenido de marketing.' },
    { id: 'inventario', label: 'Inventario', detail: 'Productos y servicios del catálogo.' },
    { id: 'clientes', label: 'Clientes', detail: 'Fichas de clientes eliminadas.' },
    { id: 'empleados', label: 'Empleados', detail: 'Perfiles del equipo eliminados.' },
    { id: 'proveedores', label: 'Proveedores', detail: 'Proveedores quitados del listado.' },
    { id: 'incidentes', label: 'Incidentes', detail: 'Reportes de incidentes del salón.' },
    { id: 'citas', label: 'Citas', detail: 'Citas de la agenda eliminadas.' },
    { id: 'gift_cards', label: 'Tarjetas regalo', detail: 'Tarjetas regalo emitidas o activadas.' },
    { id: 'gift_card_activation_codes', label: 'Códigos ACT', detail: 'Códigos de activación de tarjeta regalo.' },
    { id: 'sucursales', label: 'Sucursales', detail: 'Sucursales desactivadas desde matriz.' },
    { id: 'mensajes', label: 'Mensajes', detail: 'Mensajes directos de marketing.' },
    { id: 'otros', label: 'Otros', detail: 'Orígenes no clasificados o legacy.' },
  ];

  const mainContent = (
    <>
      <View style={styles.body}>
        <TextInput
          style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
          placeholder="Buscar por título, resumen u origen…"
          placeholderTextColor={c.foregroundSubtle}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          accessibilityLabel="Buscar en basurero"
        />

        <View style={[styles.toolbar, embedded && styles.toolbarEmbedded]}>
          {!embedded ? (
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {filtered.length} copia{filtered.length === 1 ? '' : 's'}
              {!loading && entries.length ? ` de ${entries.length}` : ''}
            </Text>
          ) : null}
          <View style={styles.toolbarRight}>
            {embedded && onPanelTabChange ? (
              <>
                <TouchableOpacity hitSlop={12} onPress={() => onPanelTabChange('purge')}>
                  <Text
                    style={[
                      styles.toolbarLink,
                      { color: panelTab === 'purge' ? c.primary : c.foregroundMuted },
                    ]}
                  >
                    Borrado masivo
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.toolbarDot, { color: c.foregroundSubtle }]}> · </Text>
                <TouchableOpacity hitSlop={12} onPress={() => onPanelTabChange('basurero')}>
                  <Text
                    style={[
                      styles.toolbarLink,
                      { color: panelTab === 'basurero' ? c.primary : c.foregroundMuted },
                    ]}
                  >
                    Basurero
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.toolbarDot, { color: c.foregroundSubtle }]}> · </Text>
              </>
            ) : null}
            <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
            <Text style={[styles.toolbarDot, { color: c.foregroundSubtle }]}> · </Text>
            <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)}>
              <Text style={[styles.toolbarLink, { color: c.primary }]}>Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.filtroResumen, { color: c.foregroundMuted }]} numberOfLines={2}>
          {sel.active ? 'Tocá las tarjetas para marcarlas.' : filtroResumen}
        </Text>

        <View style={styles.listShell}>
          <FlatList
            data={filtered}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={c.primary}
                colors={[c.primary]}
                progressBackgroundColor={c.card}
              />
            }
            contentContainerStyle={{ paddingBottom: sel.count ? 120 : padBottom, flexGrow: 0 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>{emptyText}</Text>
            }
          />
        </View>
      </View>

      {sel.active && sel.count > 0 ? (
        <View
          style={[
            styles.selectBar,
            {
              backgroundColor: c.background,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
            },
          ]}
        >
          <Text style={[styles.selectMeta, { color: c.foregroundMuted }]}>
            {sel.count} seleccionado{sel.count === 1 ? '' : 's'}
          </Text>
          <SalonButton
            title={busy ? 'Restaurando…' : 'Restaurar en Supabase'}
            variant="heroGold"
            fullWidth
            onPress={confirmRestaurar}
            disabled={busy}
          />
          <SalonButton
            title={busy ? 'Borrando…' : 'Borrar solo copias'}
            variant="outlineGray"
            fullWidth
            onPress={confirmBorrarCopias}
            disabled={busy}
            style={{ marginTop: spacing.xs, borderColor: c.error }}
            textStyle={{ color: c.error }}
          />
          <SalonButton title="Cancelar" variant="outlineGray" fullWidth onPress={sel.exitSelectMode} style={{ marginTop: spacing.xs }} />
        </View>
      ) : null}
    </>
  );

  const filtersModal = (
    <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
          <View style={styles.modalHead}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
            <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
              <X size={22} color={c.foregroundMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.fieldLbl, { color: c.foreground }]}>Orden</Text>
          <View style={styles.typeGrid}>
            {[
              { id: 'fecha_desc', label: 'Más recientes' },
              { id: 'fecha_asc', label: 'Más antiguos' },
            ].map((opt) => {
              const on = sortMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.typeChip,
                    { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                  ]}
                  onPress={() => setSortMode(opt.id)}
                >
                  <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLbl, { color: c.foreground }]}>Origen</Text>
          <View style={[styles.originPickList, { borderColor: c.cardBorder }]}>
            {filterOptions.map((opt, index) => {
              const on = filterSource === opt.id;
              const isLast = index === filterOptions.length - 1;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.originPickRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: c.cardBorder,
                    },
                    on && { backgroundColor: c.surfaceMuted },
                  ]}
                  onPress={() => setFilterSource(opt.id)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.originPickTxt, { color: on ? c.primary : c.foreground }]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                  {opt.detail ? (
                    <Text
                      style={[
                        styles.originPickSub,
                        { color: on ? c.foregroundMuted : c.foregroundSubtle },
                      ]}
                      numberOfLines={2}
                    >
                      {opt.detail}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          </ScrollView>

          <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalFiltros(false)} />
        </View>
      </View>
    </Modal>
  );

  if (embedded) {
    return (
      <View style={[styles.shell, { flex: 1, backgroundColor: c.background }]}>
        {mainContent}
        {filtersModal}
      </View>
    );
  }

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Basurero"
        subtitle="Copias locales. Tocá «Seleccionar» para restaurar o borrar copias en lote."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        edgeToEdge
      >
        {mainContent}
      </SubScreenChrome>
      {filtersModal}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    body: {
      flex: 1,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
      backgroundColor: c.background,
    },
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
    toolbarEmbedded: {
      justifyContent: 'flex-end',
    },
    toolbarRight: { flexDirection: 'row', alignItems: 'center' },
    toolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      flex: 1,
    },
    toolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    toolbarDot: { fontSize: 13 },
    filtroResumen: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    listShell: {
      flex: 1,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.xs,
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, minWidth: 0 },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    rowTitle: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    rowMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    rowSub: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    emptyTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      padding: spacing.md,
    },
    selectBar: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      gap: spacing.xs,
    },
    selectMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    modalCard: {
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      maxHeight: '92%',
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.xs,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    typeChip: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      minWidth: '47%',
    },
    typeChipTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
    },
    originPickList: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    originPickRow: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    originPickTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      lineHeight: 18,
    },
    originPickSub: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    },
  });
}
