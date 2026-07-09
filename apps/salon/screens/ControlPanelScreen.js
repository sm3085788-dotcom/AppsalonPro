import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { spacing, typography } from '@appsalon/design-tokens';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { PinField } from '../components/auth/PinField';
import { SalonSucursalSelect } from '../components/SalonSucursalSelect';
import { ControlPanelOrdenarFiltros } from '../components/ControlPanelOrdenarFiltros';
import { useSalonPullRefresh } from '../hooks/useSalonPullRefresh';
import { useTheme } from '../theme/ThemeProvider';
import {
  db,
  getSalonSessionProfile,
  isSalonGlobalAdmin,
  getSalonSucursalScope,
} from '@appsalon/shared-config';
import { panelScopeFrom } from '../services/controlPanelScope';
import {
  purgeCitas,
  purgeVentasYRelacionadas,
  purgeVentasSolo,
  purgeCajasYMovimientos,
  purgePedidosEcommerce,
  purgeMarketingRed,
  purgeClientes,
  purgeEmpleados,
  purgeInventario,
  purgeProveedores,
  purgeMetas,
  purgeNotificaciones,
  purgeIncidentes,
  purgeBasureroLocal,
  purgeReportesLocales,
  purgeTarjetasRegalo,
  purgeSucursales,
  purgeUneteEquipo,
  normalizeDateRangeOpts,
} from '../services/controlPanelPurge';
import { searchModuleItems, deleteModuleItem, moduleSupportsSearch, listModuleItems, moduleListsOnExpand } from '../services/controlPanelItemOps';
import { BasureroScreen } from './BasureroScreen';

const CONTROL_PANEL_PASSWORD = '123456';

const PURGE_ACTIONS = [
  {
    id: 'papeleria',
    title: 'Papelería (facturas / ventas)',
    detail: 'Facturas del punto de venta y caja. Con fechas: por campo fecha de ventas. Podés buscar y borrar registros puntuales.',
    run: purgeVentasSolo,
  },
  {
    id: 'ventas_chain',
    title: 'Ventas, devoluciones y cambios',
    detail: 'Devoluciones, cambios de producto y ventas. Con fechas: por campo fecha de cada tabla.',
    run: purgeVentasYRelacionadas,
  },
  {
    id: 'caja_chain',
    title: 'Caja: movimientos y cajas',
    detail: 'Movimientos por fecha/hora; cajas por fecha_apertura (día).',
    run: purgeCajasYMovimientos,
  },
  {
    id: 'pedidos',
    title: 'Pedidos e-commerce',
    detail: 'Órdenes y líneas. Con fechas: órdenes por created_at.',
    outcome: 'bulk',
    run: purgePedidosEcommerce,
  },
  {
    id: 'citas',
    title: 'Citas (agenda)',
    detail: 'Por fecha_hora si usás rango.',
    run: purgeCitas,
  },
  {
    id: 'marketing',
    title: 'Marketing y mensajes',
    detail: 'Comentarios, likes de posts en rango, mensajes y publicaciones. Con fechas: por created_at.',
    run: purgeMarketingRed,
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones internas',
    detail: 'Por created_at si usás rango.',
    run: purgeNotificaciones,
  },
  {
    id: 'metas',
    title: 'Metas del equipo',
    detail: 'Por creado_a si usás rango.',
    run: purgeMetas,
  },
  {
    id: 'incidentes',
    title: 'Incidentes',
    detail: 'Por fecha si usás rango.',
    run: purgeIncidentes,
  },
  {
    id: 'inventario',
    title: 'Inventario (productos/servicios)',
    detail: 'Por updated_at si usás rango. Sin rango: todo el catálogo.',
    run: purgeInventario,
  },
  {
    id: 'proveedores',
    title: 'Proveedores',
    detail: 'Solo borrado total (sin filtro por fecha en esquema).',
    run: purgeProveedores,
  },
  {
    id: 'clientes',
    title: 'Clientes',
    detail: 'Por created_at si usás rango. FK: puede fallar si hay datos vinculados.',
    run: purgeClientes,
  },
  {
    id: 'empleados',
    title: 'Empleados',
    detail: 'Por created_at si usás rango (si existe en BD).',
    run: purgeEmpleados,
  },
  {
    id: 'tarjetas_regalo',
    title: 'Tarjeta regalo',
    detail: 'Tarjetas emitidas y códigos ACT pendientes visibles en staff. Con fechas: tarjetas por emitida_en.',
    run: purgeTarjetasRegalo,
  },
  {
    id: 'sucursales',
    title: 'Sucursales',
    detail: 'Desactiva todas las sucursales activas excepto la matriz. Sin filtro por fechas.',
    run: purgeSucursales,
  },
  {
    id: 'unete_equipo',
    title: 'Únete al equipo',
    detail: 'Solicitudes de reclutamiento. Con fechas: por created_at.',
    run: purgeUneteEquipo,
  },
  {
    id: 'basurero_local',
    title: 'Basurero local (teléfono)',
    detail: 'Copias en este dispositivo. Con fechas: solo entradas por fecha de borrado local.',
    run: purgeBasureroLocal,
    localOnly: true,
  },
  {
    id: 'reportes_local',
    title: 'Reportes generados (teléfono)',
    detail: 'Lista guardada en la pantalla Reportes de este dispositivo. Con fechas: por fecha de generación.',
    run: purgeReportesLocales,
    localOnly: true,
  },
];

function formatShortDate(d) {
  if (!d) return '—';
  try {
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function ControlPanelScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const [unlocked, setUnlocked] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [accessError, setAccessError] = useState('');
  const [panelTab, setPanelTab] = useState('purge');
  const [purgingId, setPurgingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [moduleSearch, setModuleSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [panelSucursales, setPanelSucursales] = useState([]);
  const [panelSucursalId, setPanelSucursalId] = useState(null);

  const sessionProfile = getSalonSessionProfile();
  const isGlobalAdmin = isSalonGlobalAdmin(sessionProfile?.role);

  const styles = useMemo(() => createStyles(), []);

  const matrizSucursalId = useMemo(
    () => panelSucursales.find((s) => s.es_matriz)?.id || panelSucursales[0]?.id || null,
    [panelSucursales],
  );

  const panelSucursalNombre = useMemo(() => {
    if (!panelSucursalId) return null;
    return panelSucursales.find((s) => String(s.id) === String(panelSucursalId))?.nombre || 'Sucursal';
  }, [panelSucursalId, panelSucursales]);

  const panelScope = useMemo(
    () => panelScopeFrom({ sucursalId: panelSucursalId, matrizId: matrizSucursalId }),
    [panelSucursalId, matrizSucursalId],
  );

  const rangeActive = !!(dateFrom && dateTo);

  const buildOpts = useCallback(() => {
    const base = panelSucursalId ? { sucursalId: panelSucursalId, matrizId: matrizSucursalId } : {};
    if (!dateFrom || !dateTo) return base;
    return { ...base, dateFrom, dateTo };
  }, [dateFrom, dateTo, panelSucursalId, matrizSucursalId]);

  useEffect(() => {
    if (isGlobalAdmin) {
      let cancelled = false;
      void db.sucursales.listActivas().then(({ data, error }) => {
        if (cancelled || error) return;
        const list = Array.isArray(data) ? data : [];
        setPanelSucursales(list);
        const matrizId = list.find((s) => s.es_matriz)?.id || list[0]?.id || null;
        setPanelSucursalId((prev) => prev || matrizId);
      });
      return () => {
        cancelled = true;
      };
    }
    const sid = sessionProfile?.sucursal_id || getSalonSucursalScope().sucursalId || null;
    if (sid) {
      setPanelSucursalId(sid);
      if (sessionProfile?.sucursal_nombre) {
        setPanelSucursales([
          {
            id: sid,
            nombre: sessionProfile.sucursal_nombre,
            es_matriz: false,
          },
        ]);
      }
    }
    return undefined;
  }, [isGlobalAdmin, sessionProfile?.sucursal_id, sessionProfile?.sucursal_nombre]);

  useEffect(() => {
    if (!expandedId || !moduleSupportsSearch(expandedId)) {
      setSearchResults([]);
      return undefined;
    }
    const q = moduleSearch.trim();
    if (!moduleListsOnExpand(expandedId) && q.length < 2) {
      setSearchResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchBusy(true);
      try {
        const rows = await listModuleItems(expandedId, q, panelScope);
        if (!cancelled) setSearchResults(rows);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchBusy(false);
      }
    }, moduleListsOnExpand(expandedId) && q.length < 2 ? 0 : 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [expandedId, moduleSearch, panelScope]);

  const reloadPanel = useCallback(async () => {
    if (!expandedId || !moduleSupportsSearch(expandedId)) return;
    const q = moduleSearch.trim();
    if (!moduleListsOnExpand(expandedId) && q.length < 2) return;
    setSearchBusy(true);
    try {
      const rows = await listModuleItems(expandedId, q, panelScope);
      setSearchResults(rows);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchBusy(false);
    }
  }, [expandedId, moduleSearch, panelScope]);

  const { refreshing, onRefresh } = useSalonPullRefresh(reloadPanel);

  const toggleExpanded = useCallback((actionId) => {
    setExpandedId((prev) => {
      if (prev === actionId) return null;
      return actionId;
    });
    setModuleSearch('');
    setSearchResults([]);
  }, []);

  const finishPurgeMessage = useCallback((action, n) => {
    if (action.id === 'basurero_local') {
      return typeof n === 'number' && n > 0
        ? `Se eliminaron ${n} entradas del basurero local.`
        : rangeActive
          ? 'No había entradas locales en ese rango.'
          : 'Se vació la copia local del basurero en este dispositivo.';
    }
    if (action.id === 'reportes_local') {
      if (typeof n === 'number' && n > 0) {
        return `Se eliminaron ${n} reporte(s) guardados en este dispositivo.`;
      }
      if (rangeActive) return 'No había reportes guardados en ese rango de fechas.';
      return 'No había reportes guardados en este dispositivo.';
    }
    if (action.outcome === 'bulk' && !rangeActive) {
      return 'Borrado masivo enviado. Si RLS o FK lo impiden, verás error arriba; si no, las tablas quedaron vacías.';
    }
    if (typeof n === 'number' && n > 0) return `Se eliminaron ${n} registros.`;
    if (typeof n === 'number') return 'No había registros que borrar en ese criterio.';
    return 'Operación completada.';
  }, [rangeActive]);

  const confirmPurge = useCallback(
    (action) => {
      let rangeNote = '';
      if (rangeActive) {
        try {
          normalizeDateRangeOpts({ dateFrom, dateTo });
          rangeNote = action.localOnly
            ? `\n\nSolo entradas de este teléfono entre ${formatShortDate(dateFrom)} y ${formatShortDate(
                dateTo,
              )} (fecha de generación o borrado local).`
            : `\n\nSolo se eliminarán registros entre ${formatShortDate(dateFrom)} y ${formatShortDate(
                dateTo,
              )} (según la fecha de cada tabla, donde aplique).`;
        } catch (err) {
          Alert.alert('Fechas inválidas', err?.message || 'Revisá el rango.');
          return;
        }
      }
      if (panelSucursalNombre) {
        rangeNote += `\n\nSucursal: ${panelSucursalNombre}.`;
      }
      const msg = `${action.detail}${rangeNote}\n\nEsta acción no se puede deshacer.`;
      Alert.alert(`Borrar todo: ${action.title}`, msg, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            setPurgingId(action.id);
            try {
              const n = await action.run(buildOpts());
              Alert.alert('Listo', finishPurgeMessage(action, n));
              if (expandedId === action.id) {
                setModuleSearch('');
                if (moduleSupportsSearch(action.id)) {
                  const rows = await listModuleItems(action.id, '', panelScope);
                  setSearchResults(rows);
                } else {
                  setSearchResults([]);
                }
              }
            } catch (e) {
              Alert.alert(
                'Error',
                e?.message || 'No se pudo completar el borrado. Revisá dependencias (FK) o permisos RLS.',
              );
            } finally {
              setPurgingId(null);
            }
          },
        },
      ]);
    },
    [buildOpts, dateFrom, dateTo, expandedId, finishPurgeMessage, moduleSearch, panelScope, panelSucursalNombre, rangeActive],
  );

  const confirmDeleteItem = useCallback(
    (action, item) => {
      Alert.alert('Borrar registro', `¿Eliminar «${item.label}»?\n\nSolo este registro. No se puede deshacer.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            setPurgingId(action.id);
            try {
              const err = await deleteModuleItem(action.id, item.id);
              if (err?.message) {
                Alert.alert('Error', err.message);
              } else {
                setSearchResults((prev) => prev.filter((r) => String(r.id) !== String(item.id)));
                Alert.alert('Listo', 'Registro eliminado.');
                if (expandedId === action.id) {
                  const rows = await listModuleItems(action.id, moduleSearch, panelScope);
                  setSearchResults(rows);
                }
              }
            } catch (e) {
              Alert.alert('Error', e?.message || 'No se pudo borrar el registro.');
            } finally {
              setPurgingId(null);
            }
          },
        },
      ]);
    },
    [expandedId, moduleSearch, panelScope],
  );

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      if (event?.type === 'dismissed') {
        setPickerTarget(null);
        return;
      }
      if (selectedDate && pickerTarget) {
        if (pickerTarget === 'from') setDateFrom(selectedDate);
        if (pickerTarget === 'to') setDateTo(selectedDate);
      }
      setPickerTarget(null);
      return;
    }
    if (event?.type === 'dismissed') {
      setPickerTarget(null);
      return;
    }
    if (!selectedDate || !pickerTarget) return;
    if (pickerTarget === 'from') setDateFrom(selectedDate);
    if (pickerTarget === 'to') setDateTo(selectedDate);
  };

  const tryUnlock = () => {
    if (accessPassword === CONTROL_PANEL_PASSWORD) {
      setAccessError('');
      setAccessPassword('');
      setUnlocked(true);
      return;
    }
    setAccessError('Contraseña incorrecta.');
  };

  if (!unlocked) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SubScreenChrome
          title="Panel de control"
          subtitle="Acceso restringido"
          onBack={onBack}
          edgeToEdge={false}
        >
          <Text style={[styles.gateHint, { color: c.foregroundMuted }]}>
            Ingresá la contraseña para abrir borrado masivo y basurero.
          </Text>
          <PinField
            label="Contraseña"
            value={accessPassword}
            onChangeText={(t) => {
              setAccessPassword(t.replace(/\D/g, '').slice(0, 6));
              if (accessError) setAccessError('');
            }}
            placeholder="6 números"
            maxLength={6}
            showMismatch={!!accessError}
            mismatchText={accessError}
          />
          <SalonButton
            title="Entrar"
            variant="heroGold"
            fullWidth
            onPress={tryUnlock}
            disabled={accessPassword.length < 6}
            style={{ marginTop: spacing.sm }}
          />
        </SubScreenChrome>
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        hideTitles
        onBack={onBack}
        disableBodyScroll
        edgeToEdge={false}
        bottomPadding={0}
        refreshing={panelTab === 'purge' ? refreshing : false}
        onRefresh={panelTab === 'purge' ? onRefresh : undefined}
      >
        {isGlobalAdmin && panelSucursales.length > 0 ? (
          <SalonSucursalSelect
            sucursales={panelSucursales}
            selectedId={panelSucursalId}
            variant="field"
            onSelect={(id) => {
              setPanelSucursalId(id);
              setExpandedId(null);
              setModuleSearch('');
              setSearchResults([]);
            }}
            label="Sucursal"
          />
        ) : panelSucursalNombre ? (
          <Text style={[styles.branchLabel, { color: c.foregroundMuted }]} numberOfLines={1}>
            SUCURSAL · {panelSucursalNombre}
          </Text>
        ) : null}

        {panelTab === 'basurero' ? (
          <BasureroScreen
            embedded
            branchScope={panelScope}
            panelTab={panelTab}
            onPanelTabChange={(tab) => {
              setPanelTab(tab);
              if (tab !== 'purge') {
                setExpandedId(null);
                setModuleSearch('');
                setSearchResults([]);
              }
            }}
          />
        ) : (
          <>
        <ControlPanelOrdenarFiltros
          actions={PURGE_ACTIONS}
          panelTab={panelTab}
          onPanelTabChange={(tab) => {
            setPanelTab(tab);
            if (tab !== 'purge') {
              setExpandedId(null);
              setModuleSearch('');
              setSearchResults([]);
            }
          }}
          panelSucursalNombre={panelSucursalNombre}
          dateFrom={dateFrom}
          dateTo={dateTo}
          pickerTarget={pickerTarget}
          onPickerTargetChange={setPickerTarget}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClearDates={() => {
            setDateFrom(null);
            setDateTo(null);
            setPickerTarget(null);
          }}
          rangeActive={rangeActive}
          purgingId={purgingId}
          expandedId={expandedId}
          moduleSearch={moduleSearch}
          onModuleSearchChange={setModuleSearch}
          searchResults={searchResults}
          searchBusy={searchBusy}
          onToggleExpanded={toggleExpanded}
          onConfirmPurge={confirmPurge}
          onConfirmDeleteItem={confirmDeleteItem}
        />

        {Platform.OS === 'ios' ? <View style={{ height: spacing.lg }} /> : null}
          </>
        )}
      </SubScreenChrome>
    </>
  );
}

function createStyles() {
  return StyleSheet.create({
    gateHint: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    branchLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
  });
}
