import { View, Text, TextInput, StyleSheet } from 'react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCardExpDisplay, formatCardNumberDisplay } from '@appsalon/shared-config';

export function TarjetaPagoForm({
  holder,
  onHolderChange,
  number,
  onNumberChange,
  exp,
  onExpChange,
  cvv,
  onCvvChange,
  compact = false,
}) {
  const { colors: c } = useTheme();
  const styles = createStyles(c);

  return (
    <View style={compact ? null : styles.wrap}>
      {!compact ? (
        <Text style={styles.lead}>Datos de la tarjeta</Text>
      ) : null}
      <Text style={styles.label}>Nombre del titular</Text>
      <TextInput
        style={styles.field}
        value={holder}
        onChangeText={onHolderChange}
        autoCapitalize="words"
        autoCorrect={false}
        placeholder="Como figura en la tarjeta"
        placeholderTextColor={c.foregroundSubtle}
      />
      <Text style={styles.label}>Número de tarjeta</Text>
      <TextInput
        style={styles.field}
        value={number}
        onChangeText={(t) => onNumberChange(formatCardNumberDisplay(t))}
        keyboardType="number-pad"
        maxLength={23}
        placeholder="0000 0000 0000 0000"
        placeholderTextColor={c.foregroundSubtle}
      />
      <View style={styles.duoRow}>
        <View style={styles.duoCell}>
          <Text style={styles.label}>MM/AA</Text>
          <TextInput
            style={styles.field}
            value={exp}
            onChangeText={(t) => onExpChange(formatCardExpDisplay(t))}
            keyboardType="number-pad"
            maxLength={5}
            placeholder="08/29"
            placeholderTextColor={c.foregroundSubtle}
          />
        </View>
        <View style={styles.duoCell}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            style={styles.field}
            value={cvv}
            onChangeText={(t) => onCvvChange(t.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="•••"
            placeholderTextColor={c.foregroundSubtle}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    wrap: {
      marginTop: spacing.sm,
    },
    lead: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foregroundMuted,
      marginBottom: spacing.xs,
    },
    label: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      color: c.foregroundMuted,
      marginTop: spacing.sm,
      marginBottom: 4,
    },
    field: {
      minHeight: 48,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
      fontFamily: typography.fontSans,
      fontSize: 15,
      color: c.foreground,
    },
    duoRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    duoCell: {
      flex: 1,
    },
  });
}
