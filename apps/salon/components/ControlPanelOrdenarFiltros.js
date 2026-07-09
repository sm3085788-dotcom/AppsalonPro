import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Search, Trash2, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { VerticalDatePickerSheet } from './VerticalDatePicker';
import { SalonButton, modalSheetBottomPad } from './luxury';
import { useTheme } from '../theme/ThemeProvider';
import { moduleListsOnExpand, moduleSupportsSearch } from '../services/controlPanelItemOps';

function moduleBlocksDateRange(actionId, rangeActive) {
  return rangeActive && (actionId === 'proveedores' || actionId === 'sucursales');
}

function dateRangeBlockMessage(actionId) {
  if (actionId === 'proveedores') {
    return 'Este módulo no admite filtro por fechas. Quitá el rango o tocá «Quitar fechas» para borrar todo el listado de proveedores.';
  }
  if (actionId === 'sucursales') {
    return 'Este módulo no admite filtro por fechas. Quitá el rango o tocá «Quitar fechas» para desactivar sucursales.';
  }
  return 'Este módulo no admite filtro por fechas.';
}

function formatShortDate(d) {
  if (!d) return '—';
  try {
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function ControlPanelOrdenarFiltros({
  actions,
  panelTab,
  onPanelTabChange,
  panelSucursalNombre,
  dateFrom,
  dateTo,
  pickerTarget,
  onPickerTargetChange,
  onDateFromChange,
  onDateToChange,
  onClearDates,
  rangeActive,
  purgingId,
  expandedId,
  moduleSearch,
  onModuleSearchChange,
  searchResults,
  searchBusy,
  onToggleExpanded,
  onConfirmPurge,
  onConfirmDeleteItem,
}) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(), []);
  const [modalFiltrosOpen, setModalFiltrosOpen] = useState(false);

  const selectedAction = actions.find((a) => a.id === expandedId) || null;

  const filtroResumen = useMemo(() => {
    const parts = [];
    if (panelSucursalNombre) parts.push(panelSucursalNombre);
    parts.push(selectedAction ? selectedAction.title : 'Sin módulo');
    if (rangeActive) {
      parts.push(`${formatShortDate(dateFrom)} – ${formatShortDate(dateTo)}`);
    } else {
      parts.push('Sin rango de fechas');
    }
    return parts.join(' · ');
  }, [selectedAction, rangeActive, dateFrom, dateTo, panelSucursalNombre]);

  const resultsMeta = useMemo(() => {
    if (!selectedAction) return 'Elegí un módulo';
    if (searchBusy) return 'Cargando…';
    if (moduleSupportsSearch(selectedAction.id)) {
      const n = searchResults.length;
      return `${n} registro${n === 1 ? '' : 's'}`;
    }
    return selectedAction.title;
  }, [selectedAction, searchBusy, searchResults.length]);

  const closeFiltros = useCallback(() => setModalFiltrosOpen(false), []);

  const selectModule = useCallback(
    (action) => {
      const dateBlocked = moduleBlocksDateRange(action.id, rangeActive);
      if (dateBlocked) {
        Alert.alert(action.title, dateRangeBlockMessage(action.id));
        return;
      }
      onToggleExpanded(action.id);
    },
    [onToggleExpanded, rangeActive],
  );

  return (
    <View style={styles.root}>
      <Text style={[styles.fieldLbl, { color: c.foregroundMuted }]}>Rango de fechas</Text>
      <View style={styles.dateRowWrap}>
        <TouchableOpacity
          style={[styles.dateTap, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}
          onPress={() => onPickerTargetChange('from')}
        >
          <Text style={[styles.dateLbl, { color: c.foregroundMuted }]}>Desde</Text>
          <View style={styles.dateTapInner}>
            <Text style={[styles.dateVal, { color: c.foreground }]}>{formatShortDate(dateFrom)}</Text>
            <Calendar size={18} color={c.primary} strokeWidth={2} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateTap, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}
          onPress={() => onPickerTargetChange('to')}
        >
          <Text style={[styles.dateLbl, { color: c.foregroundMuted }]}>Hasta</Text>
          <View style={styles.dateTapInner}>
            <Text style={[styles.dateVal, { color: c.foreground }]}>{formatShortDate(dateTo)}</Text>
            <Calendar size={18} color={c.primary} strokeWidth={2} />
          </View>
        </TouchableOpacity>
      </View>
      {rangeActive ? (
        <Text style={[styles.rangeOn, { color: c.primary }]}>Filtro por fechas activo</Text>
      ) : null}
      {(dateFrom || dateTo) && !rangeActive ? (
        <Text style={[styles.rangeWarn, { color: c.error }]}>Elegí ambas fechas para aplicar el filtro.</Text>
      ) : null}
      {dateFrom || dateTo ? (
        <SalonButton
          title="Quitar fechas"
          variant="outlineGray"
          fullWidth
          onPress={onClearDates}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}

      <VerticalDatePickerSheet
        visible={Boolean(pickerTarget)}
        value={pickerTarget === 'from' ? dateFrom || new Date() : dateTo || dateFrom || new Date()}
        minimumDate={pickerTarget === 'to' && dateFrom ? dateFrom : undefined}
        maximumDate={pickerTarget === 'from' && dateTo ? dateTo : undefined}
        colors={c}
        onChange={(selectedDate) => {
          if (pickerTarget === 'from') onDateFromChange(selectedDate);
          if (pickerTarget === 'to') onDateToChange(selectedDate);
        }}
        onClose={() => onPickerTargetChange(null)}
      />

      <View style={styles.toolbar}>
        <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>{resultsMeta}</Text>
        <View style={styles.toolbarRight}>
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
          <TouchableOpacity
            hitSlop={12}
            onPress={() => {
              onPanelTabChange('basurero');
              setModalFiltrosOpen(false);
            }}
          >
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
          <TouchableOpacity
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="seleccionar-filtros"
            testID="seleccionar-filtros"
            onPress={() => setModalFiltrosOpen(true)}
          >
            <Text style={[styles.toolbarLink, { color: c.primary }]}>Filtros</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.filtroResumen, { color: c.foregroundSubtle }]} numberOfLines={2}>
        {filtroResumen}
      </Text>

      <View
        style={styles.resultsShell}
        testID="ordenar-filtros"
        accessibilityLabel="ordenar-filtros"
      >
        {!selectedAction ? (
          <Text style={[styles.emptyTxt, { color: c.foregroundSubtle }]}>
            Tocá «Filtros» y elegí un módulo para ver registros y opciones de borrado.
          </Text>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsContent}
          >
            <SalonButton
              title={purgingId === selectedAction.id ? 'Borrando…' : 'Borrar todo este módulo'}
              variant="outlineGray"
              fullWidth
              disabled={!!purgingId || moduleBlocksDateRange(selectedAction.id, rangeActive)}
              onPress={() => onConfirmPurge(selectedAction)}
              style={{ borderColor: c.error }}
              textStyle={{ color: c.error }}
            />

            {moduleSupportsSearch(selectedAction.id) ? (
              <>
                <View
                  style={[
                    styles.moduleSearchWrap,
                    { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted },
                  ]}
                >
                  <Search size={18} color={c.foregroundSubtle} strokeWidth={1.8} />
                  <TextInput
                    style={[styles.moduleSearchInput, { color: c.foreground }]}
                    placeholder={
                      moduleListsOnExpand(selectedAction.id)
                        ? selectedAction.id === 'papeleria'
                          ? 'Filtrar facturas (opcional)…'
                          : 'Filtrar listado (opcional)…'
                        : 'Buscar un registro para borrar (mín. 2 letras)…'
                    }
                    placeholderTextColor={c.foregroundSubtle}
                    value={moduleSearch}
                    onChangeText={onModuleSearchChange}
                    autoCorrect={false}
                    editable={purgingId !== selectedAction.id}
                  />
                  {searchBusy ? <ActivityIndicator size="small" color={c.primary} /> : null}
                </View>

                {moduleListsOnExpand(selectedAction.id) && searchResults.length === 0 && !searchBusy ? (
                  <Text style={[styles.noHits, { color: c.foregroundSubtle }]}>
                    No hay entradas guardadas en este teléfono.
                  </Text>
                ) : null}
                {!moduleListsOnExpand(selectedAction.id) &&
                moduleSearch.trim().length >= 2 &&
                !searchBusy &&
                searchResults.length === 0 ? (
                  <Text style={[styles.noHits, { color: c.foregroundSubtle }]}>Sin coincidencias.</Text>
                ) : null}

                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[styles.hitRow, { borderColor: c.cardBorder }]}
                    onPress={() => onConfirmDeleteItem(selectedAction, item)}
                    disabled={!!purgingId}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.hitTitle, { color: c.foreground }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.sub ? (
                        <Text style={[styles.hitSub, { color: c.foregroundMuted }]} numberOfLines={1}>
                          {item.sub}
                        </Text>
                      ) : null}
                    </View>
                    <Trash2 size={16} color={c.error} />
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text style={[styles.noSearchHint, { color: c.foregroundSubtle }]}>
                Este módulo solo admite «Borrar todo» (sin búsqueda puntual).
              </Text>
            )}
          </ScrollView>
        )}
      </View>

      <Modal visible={modalFiltrosOpen} animationType="slide" transparent onRequestClose={closeFiltros}>
        <Pressable style={styles.filterBackdrop} onPress={closeFiltros}>
          <Pressable
            style={[styles.filterSheet, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.filterHead}>
              <Text style={[styles.filterTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={closeFiltros} hitSlop={12} accessibilityLabel="Cerrar">
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.filterScrollContent}
            >
              <Text style={[styles.filterSectionLbl, { color: c.foreground }]}>Módulo</Text>
              <View style={[styles.modulePickList, { borderColor: c.cardBorder }]}>
                {actions.map((action, index) => {
                  const on = expandedId === action.id;
                  const dateBlocked = moduleBlocksDateRange(action.id, rangeActive);
                  const isLast = index === actions.length - 1;
                  return (
                    <TouchableOpacity
                      key={action.id}
                      style={[
                        styles.modulePickRow,
                        !isLast && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: c.cardBorder,
                        },
                        on && { backgroundColor: c.surfaceMuted },
                        dateBlocked && { opacity: 0.45 },
                      ]}
                      onPress={() => selectModule(action)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.modulePickTxt,
                          { color: on ? c.primary : c.foreground },
                        ]}
                        numberOfLines={2}
                      >
                        {action.title}
                      </Text>
                      {action.detail ? (
                        <Text
                          style={[
                            styles.modulePickSub,
                            { color: on ? c.foregroundMuted : c.foregroundSubtle },
                          ]}
                          numberOfLines={2}
                        >
                          {action.detail}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={closeFiltros} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    root: {
      marginTop: spacing.xs,
      flex: 1,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    dateRowWrap: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    dateTap: {
      flex: 1,
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.sm,
    },
    dateLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      marginBottom: 4,
    },
    dateTapInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateVal: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    rangeOn: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginTop: spacing.sm,
    },
    rangeWarn: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      marginTop: spacing.xs,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    toolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      flex: 1,
      marginRight: spacing.sm,
    },
    toolbarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    toolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    toolbarDot: {
      fontSize: 13,
    },
    filtroResumen: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.sm,
    },
    resultsShell: {
      flex: 1,
      borderRadius: radii.md,
      minHeight: 200,
      overflow: 'hidden',
    },
    resultsContent: {
      padding: spacing.md,
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
    emptyTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
      lineHeight: 19,
    },
    moduleSearchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    },
    moduleSearchInput: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 15,
      paddingVertical: spacing.sm,
    },
    noHits: {
      fontFamily: typography.fontSans,
      fontSize: 12,
    },
    noSearchHint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
    hitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    hitTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    hitSub: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginTop: 2,
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
      maxHeight: '92%',
    },
    filterHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    filterTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
    },
    filterScrollContent: {
      flexGrow: 0,
    },
    filterSectionLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.xs,
    },
    modulePickList: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    },
    modulePickRow: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    modulePickTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      lineHeight: 18,
    },
    modulePickSub: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    },
  });
}
