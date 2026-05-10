import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SalonButton } from '../components/luxury/SalonButton';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';

function computeAge(birth) {
  if (!birth) return null;
  const t = new Date();
  let a = t.getFullYear() - birth.getFullYear();
  const m = t.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < birth.getDate())) a -= 1;
  return Math.max(0, a);
}

function Field({ label, value, onChange, placeholder, keyboardType, autoCapitalize }) {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        fieldLabel: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.foreground,
          marginBottom: spacing.xs,
        },
        input: {
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foreground,
          borderWidth: 1,
          borderColor: c.cardBorder,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          backgroundColor: c.card,
          minHeight: 48,
        },
      }),
    [c],
  );

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.foregroundSubtle}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

export function ProfileEditForm({ onClose }) {
  const { colors: c } = useTheme();
  const [nombre, setNombre] = useState('');
  const [telLocal, setTelLocal] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [birth, setBirth] = useState(() => new Date(1995, 0, 15));
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  const age = useMemo(() => computeAge(birth), [birth]);
  const birthLabel =
    birth?.toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) ?? '';

  const st = useMemo(
    () =>
      StyleSheet.create({
        phoneRow: {
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        prefixBox: {
          justifyContent: 'center',
          paddingHorizontal: spacing.md,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.iconCircleBg,
        },
        prefixText: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: c.foreground,
        },
        hintSmall: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundMuted,
          lineHeight: 17,
          marginBottom: spacing.sm,
        },
        dateTrigger: {
          borderWidth: 1,
          borderColor: c.cardBorder,
          borderRadius: radii.sm,
          padding: spacing.md,
          backgroundColor: c.card,
        },
        dateTriggerText: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: c.foreground,
        },
        dateTriggerHint: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundSubtle,
          marginTop: 4,
        },
        ageLine: {
          marginTop: spacing.sm,
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.primary,
        },
        footnote: {
          marginTop: spacing.md,
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundSubtle,
          lineHeight: 18,
        },
        card: {
          backgroundColor: c.card,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: c.cardBorder,
          padding: spacing.lg,
          marginBottom: spacing.md,
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'flex-end',
        },
        modalCard: {
          backgroundColor: c.card,
          padding: spacing.lg,
          paddingBottom: spacing.xl,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
        },
        inputFlex: { flex: 1 },
      }),
    [c],
  );

  const onBirthChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setShowBirthPicker(false);
    }
    if (event.type === 'dismissed') {
      return;
    }
    if (selected) {
      setBirth(selected);
    }
  };

  const openBirth = () => {
    if (Platform.OS === 'web') return;
    setShowBirthPicker(true);
  };

  return (
    <>
      <View style={st.card}>
        <Field label="Nombre" value={nombre} onChange={setNombre} placeholder="Tu nombre" />

        <Text
          style={{
            fontFamily: typography.fontSansMedium,
            fontSize: 13,
            color: c.foreground,
            marginBottom: spacing.xs,
          }}
        >
          Teléfono (Guatemala)
        </Text>
        <View style={st.phoneRow}>
          <View style={st.prefixBox}>
            <Text style={st.prefixText}>+502</Text>
          </View>
          <TextInput
            style={[st.inputFlex, {
              fontFamily: typography.fontSans,
              fontSize: 15,
              color: c.foreground,
              borderWidth: 1,
              borderColor: c.cardBorder,
              borderRadius: radii.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: 12,
              backgroundColor: c.card,
              minHeight: 48,
            }]}
            value={telLocal}
            onChangeText={setTelLocal}
            placeholder="1234 5678"
            placeholderTextColor={c.foregroundSubtle}
            keyboardType="phone-pad"
          />
        </View>

        <Field
          label="Correo"
          value={correo}
          onChange={setCorreo}
          placeholder="tu@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Field
          label="Dirección"
          value={direccion}
          onChange={setDireccion}
          placeholder="Zona, calle, ciudad"
        />

        <Text
          style={{
            fontFamily: typography.fontSansMedium,
            fontSize: 13,
            color: c.foreground,
            marginBottom: spacing.xs,
          }}
        >
          Fecha de nacimiento · edad
        </Text>
        <Text style={st.hintSmall}>
          Calculamos tu edad desde la fecha; el calendario es nativo en iOS y Android.
        </Text>
        {Platform.OS === 'web' ? (
          <Text style={[st.hintSmall, { marginTop: spacing.sm }]}>
            El selector de calendario está disponible en la app en dispositivos móviles.
          </Text>
        ) : (
          <>
            <TouchableOpacity style={st.dateTrigger} onPress={openBirth} activeOpacity={0.85}>
              <Text style={st.dateTriggerText}>{birthLabel}</Text>
              <Text style={st.dateTriggerHint}>Toca para cambiar</Text>
            </TouchableOpacity>
            {age != null ? <Text style={st.ageLine}>Edad: {age} años</Text> : null}
          </>
        )}

        {Platform.OS === 'ios' && showBirthPicker ? (
          <Modal transparent animationType="fade" visible={showBirthPicker}>
            <View style={st.modalBackdrop}>
              <View style={st.modalCard}>
                <DateTimePicker
                  value={birth}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => d && setBirth(d)}
                  maximumDate={new Date()}
                  locale="es-GT"
                />
                <SalonButton
                  title="Listo"
                  variant="heroGold"
                  fullWidth
                  onPress={() => setShowBirthPicker(false)}
                />
              </View>
            </View>
          </Modal>
        ) : null}

        {Platform.OS === 'android' && showBirthPicker ? (
          <DateTimePicker
            value={birth}
            mode="date"
            display="default"
            onChange={onBirthChange}
            maximumDate={new Date()}
          />
        ) : null}

        <Text style={st.footnote}>
          Solo maquetación; guardar y validación se conectarán después.
        </Text>
      </View>
      <SalonButton variant="heroGold" title="Guardar · demo" fullWidth onPress={onClose} />
    </>
  );
}
