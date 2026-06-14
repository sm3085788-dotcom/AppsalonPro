import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

const MISMATCH_RED = '#c0392b';

export function PinField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength = 10,
  showMismatch,
  mismatchText = 'Los PIN no coinciden.',
  editable = true,
}) {
  const { colors: c } = useTheme();
  const [visible, setVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.foreground,
          marginBottom: spacing.xs,
          marginTop: spacing.sm,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          borderWidth: 1,
          borderColor: showMismatch ? c.error || MISMATCH_RED : c.cardBorder,
          borderRadius: radii.lg,
          backgroundColor: c.card,
          marginBottom: spacing.xs,
        },
        input: {
          flex: 1,
          fontFamily: typography.fontSansMedium,
          fontSize: 16,
          letterSpacing: 4,
          color: c.foreground,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
        },
        eyeBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
        },
        mismatch: {
          fontFamily: typography.fontSans,
          fontSize: 11,
          lineHeight: 16,
          color: c.error || MISMATCH_RED,
          marginTop: 2,
          marginBottom: spacing.xs,
        },
      }),
    [c, showMismatch],
  );

  return (
    <View style={{ marginBottom: showMismatch ? 0 : spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.foregroundSubtle}
          keyboardType="number-pad"
          maxLength={maxLength}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar PIN' : 'Mostrar PIN'}
        >
          {visible ? (
            <EyeOff size={20} color={c.foregroundMuted} strokeWidth={1.8} />
          ) : (
            <Eye size={20} color={c.foregroundMuted} strokeWidth={1.8} />
          )}
        </TouchableOpacity>
      </View>
      {showMismatch ? <Text style={styles.mismatch}>{mismatchText}</Text> : null}
    </View>
  );
}
