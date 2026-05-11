import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, useSubStyles, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

const PROP_TYPES = [
  { id: 'global_mensual', label: 'Global mensual', hint: 'Facturación u objetivo único del salón', symbol: 'Q', progress: 72 },
  { id: 'clientes_nuevos', label: 'Clientes nuevos', hint: 'Altas o primeras visitas del mes', symbol: '#', progress: 64 },
  { id: 'suscripciones', label: 'Suscripciones', hint: 'Planes activos o renovaciones', symbol: '#', progress: 58 },
  { id: 'individual', label: 'Por empleado', hint: 'Meta personalizada a una persona', symbol: '#', progress: 69 },
  { id: 'ventas_pred', label: 'Ventas predeterminadas', hint: 'Metas base por paquete o servicio', symbol: 'Q', progress: 61 },
  { id: 'eventos', label: 'Eventos', hint: 'Objetivos para temporadas o campañas', symbol: '#', progress: 47 },
];

export function MetasScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [modalProp, setModalProp] = useState(false);
  const [propTipo, setPropTipo] = useState('global_mensual');
  const [propValor, setPropValor] = useState('');
  const [propNota, setPropNota] = useState('');
  const [empleadoSearch, setEmpleadoSearch] = useState('');

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl * 1.5);
  const selectedType = PROP_TYPES.find((x) => x.id === propTipo);

  const abrirPropuesta = (tipoId) => {
    setPropTipo(tipoId);
    setPropValor('');
    setPropNota('');
    setEmpleadoSearch('');
    setModalProp(true);
  };

  const enviarPropuesta = () => {
    const v = Number(String(propValor).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(v) || v <= 0) {
      Alert.alert('Valor', 'Ingresá un número objetivo mayor a 0.');
      return;
    }
    if (propTipo === 'individual' && !empleadoSearch.trim()) {
      Alert.alert('Por empleado', 'Ingresá al menos un criterio en el buscador de empleado.');
      return;
    }
    Alert.alert(
      'Demo',
      'Propuesta creada en modo demo. No se guarda nada todavía.',
    );
    setModalProp(false);
  };

  const renderProgressBar = (ratio) => (
    <View style={[styles.progressTrack, { backgroundColor: c.surfaceMuted }]}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, ratio * 100))}%`, backgroundColor: c.primary }]} />
    </View>
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome title="Metas" onBack={onBack} bottomPadding={0} disableBodyScroll>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: padBottom }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.propGrid}>
            {PROP_TYPES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.propTile, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                onPress={() => abrirPropuesta(p.id)}
                activeOpacity={0.88}
              >
                <View style={styles.propHead}>
                  <Text style={styles.propTileTitle}>{p.label}</Text>
                  <View style={[styles.symbolChip, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                    <Text style={[styles.symbolChipTxt, { color: c.foregroundMuted }]}>{p.symbol}</Text>
                  </View>
                </View>
                <Text style={[subStyles.muted, styles.propTileHint]} numberOfLines={2}>
                  {p.hint}
                </Text>
                <Text style={styles.progressLabel}>Avance {p.progress}%</Text>
                {renderProgressBar(p.progress / 100)}
                <View style={styles.propTileFoot}>
                  <Text style={[styles.propLink, { color: c.primary }]}>Proponer</Text>
                  <ChevronRight size={16} color={c.primary} strokeWidth={2.2} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SubScreenChrome>

      <Modal visible={modalProp} animationType="slide" transparent onRequestClose={() => setModalProp(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={12}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ width: '100%', paddingBottom: insets.bottom + spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalCard, { backgroundColor: c.background }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Nueva propuesta</Text>
              <TouchableOpacity onPress={() => setModalProp(false)} hitSlop={12} accessibilityLabel="Cerrar">
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLbl}>Tipo</Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.md }]}>
              {selectedType?.label}
            </Text>

            <Text style={styles.fieldLbl}>Objetivo numérico</Text>
            <View style={[styles.inputRow, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <Text style={[styles.inputPrefix, { color: c.foregroundMuted }]}>{selectedType?.symbol || '#'}</Text>
              <TextInput
                style={[styles.input, styles.inputNoMargin, { color: c.foreground }]}
                placeholder={propTipo === 'global_mensual' ? '0.00' : '0'}
                placeholderTextColor={c.foregroundSubtle}
                keyboardType="decimal-pad"
                value={propValor}
                onChangeText={(v) => setPropValor(v.replace(/[^\d.,]/g, ''))}
              />
            </View>

            {propTipo === 'individual' ? (
              <>
                <Text style={styles.fieldLbl}>Empleado</Text>
                <TextInput
                  style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  placeholder="Buscar empleado por nombre, rol o código…"
                  placeholderTextColor={c.foregroundSubtle}
                  value={empleadoSearch}
                  onChangeText={setEmpleadoSearch}
                />
                <View style={styles.filterRow}>
                  <Text style={styles.filterMeta}>Resultados de búsqueda</Text>
                  <TouchableOpacity hitSlop={12} accessibilityRole="button" accessibilityLabel="Ordenar y filtros">
                    <Text style={[styles.filterLink, { color: c.primary }]}>Ordenar · filtros</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            <Text style={styles.fieldLbl}>Nota (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              placeholder="Contexto o acuerdo con gerencia"
              placeholderTextColor={c.foregroundSubtle}
              value={propNota}
              onChangeText={setPropNota}
              multiline
            />

            <View style={styles.actionStack}>
              <SalonButton title="Enviar propuesta" variant="heroGold" fullWidth onPress={enviarPropuesta} />
              <SalonButton
                title="Cancelar"
                variant="outlineGray"
                fullWidth
                onPress={() => setModalProp(false)}
              />
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    propGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    propTile: {
      width: '48%',
      flexGrow: 1,
      minWidth: 148,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.md,
    },
    propHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
      gap: spacing.sm,
    },
    propTileTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      color: c.foreground,
      flex: 1,
    },
    symbolChip: {
      borderWidth: 1,
      borderRadius: radii.pill,
      minWidth: 26,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignItems: 'center',
    },
    symbolChipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    propTileHint: {
      fontSize: 12,
      lineHeight: 17,
      minHeight: 32,
    },
    progressLabel: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foregroundMuted,
      marginTop: spacing.sm,
      marginBottom: 6,
    },
    progressTrack: {
      height: 6,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    progressFill: {
      height: 6,
      borderRadius: radii.pill,
    },
    propTileFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      gap: 2,
    },
    propLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    modalCard: {
      borderRadius: radii.lg,
      padding: spacing.lg,
      overflow: 'hidden',
    },
    modalHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    input: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 44,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    inputNoMargin: {
      marginBottom: 0,
      flex: 1,
      paddingHorizontal: spacing.xs,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    inputPrefix: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      minWidth: 20,
      textAlign: 'center',
    },
    inputArea: {
      minHeight: 88,
      paddingTop: spacing.sm,
      textAlignVertical: 'top',
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: -spacing.xs,
      marginBottom: spacing.md,
    },
    filterMeta: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    filterLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    actionStack: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
  });
}
