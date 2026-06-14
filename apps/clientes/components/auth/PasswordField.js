import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { CLIENT_ALERT_BELL_RED } from '../../constants/clientAlertColors';

export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  showMismatch,
  mismatchText = 'Las contraseñas no coinciden.',
  wrapRef,
  onInputFocus,
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
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: showMismatch ? CLIENT_ALERT_BELL_RED : c.cardBorder,
          borderRadius: radii.sm,
          backgroundColor: c.card,
          marginBottom: spacing.xs,
        },
        input: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foreground,
          paddingHorizontal: spacing.md,
          paddingVertical: 14,
        },
        eyeBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
        },
        mismatch: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: CLIENT_ALERT_BELL_RED,
          marginBottom: spacing.md,
        },
      }),
    [c, showMismatch],
  );

  return (
    <View
      ref={wrapRef}
      collapsable={false}
      style={{ marginBottom: showMismatch ? 0 : spacing.md }}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.foregroundSubtle}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={onInputFocus}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
