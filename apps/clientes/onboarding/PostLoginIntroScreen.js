import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury/SalonButton';
import { AuraLogoMark } from '../components/AuraLogoMark';

/**
 * Pantalla breve tras iniciar sesión: logo + bienvenida antes del tour.
 */
export function PostLoginIntroScreen({ profile, onContinue }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.background,
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
          justifyContent: 'space-between',
        },
        center: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        logoShadow: {
          marginBottom: spacing.xl,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 6,
        },
        welcome: {
          fontFamily: typography.fontDisplay,
          fontSize: 28,
          color: c.foreground,
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        name: {
          fontFamily: typography.fontSansMedium,
          fontSize: 18,
          color: c.primary,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        lead: {
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foregroundMuted,
          textAlign: 'center',
          lineHeight: 22,
          maxWidth: 320,
        },
        refNote: {
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foregroundSubtle,
          textAlign: 'center',
          marginTop: spacing.md,
          lineHeight: 18,
        },
      }),
    [c, insets.bottom, insets.top],
  );

  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? 'Cliente';

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <View style={styles.logoShadow}>
          <AuraLogoMark diameter={156} />
        </View>
        <Text style={styles.welcome}>¡Bienvenida a Salón Andreas!</Text>
        <Text style={styles.name}>{firstName}</Text>
        <Text style={styles.lead}>
          Tu espacio en el salón: tienda, citas, premios ANDREAS, eventos profesionales y mensajes con Andreas Pro.
          Pagos con tarjeta seguros (QPayPro). Elegí sucursal, idioma y tema en Configuración. Recorrido breve por lo esencial.
        </Text>
        {profile?.referralCode ? (
          <Text style={styles.refNote}>
            Código de referido guardado: {profile.referralCode}
          </Text>
        ) : null}
      </View>
      <SalonButton title="Continuar" variant="heroGold" fullWidth onPress={onContinue} />
    </View>
  );
}
