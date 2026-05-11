import { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Empleados: listado de perfiles (datos en siguiente fase).
 * Por ahora solo buscador y barra Ordenar · filtros, alineado a Agenda / Clientes.
 */
export function EmpleadosScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);
  const [search, setSearch] = useState('');

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome title="Empleados" onBack={onBack} disableBodyScroll bottomPadding={0}>
        <View style={styles.body}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar empleados…"
            placeholderTextColor={c.foregroundSubtle}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            accessibilityLabel="Buscar empleados"
          />

          <View style={styles.listShell}>
            <View style={styles.agendaToolbar}>
              <Text style={styles.agendaToolbarMeta}>Empleados del salón</Text>
              <TouchableOpacity hitSlop={12} accessibilityRole="button" accessibilityLabel="Ordenar y filtros">
                <Text style={styles.agendaToolbarLink}>Ordenar · filtros</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.fill, { paddingBottom: padBottom }]} />
          </View>
        </View>
      </SubScreenChrome>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    body: { flex: 1 },
    search: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    listShell: {
      flex: 1,
      paddingTop: spacing.xs,
    },
    agendaToolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    agendaToolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    agendaToolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.primary,
    },
    fill: { flex: 1 },
  });
}
