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
import { colors, spacing, typography, radii } from '@appsalon/design-tokens';

function computeAge(birth) {
  if (!birth) return null;
  const t = new Date();
  let a = t.getFullYear() - birth.getFullYear();
  const m = t.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < birth.getDate())) a -= 1;
  return Math.max(0, a);
}

export function ProfileEditForm({ onClose }) {
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
      <View style={card}>
        <Field label="Nombre" value={nombre} onChange={setNombre} placeholder="Tu nombre" />

        <Text style={fieldLabel}>Teléfono (Guatemala)</Text>
        <View style={phoneRow}>
          <View style={prefixBox}>
            <Text style={prefixText}>+502</Text>
          </View>
          <TextInput
            style={[input, inputFlex]}
            value={telLocal}
            onChangeText={setTelLocal}
            placeholder="1234 5678"
            placeholderTextColor={colors.foregroundSubtle}
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

        <Text style={fieldLabel}>Fecha de nacimiento · edad</Text>
        <Text style={hintSmall}>
          Calculamos tu edad desde la fecha; el calendario es nativo en iOS y Android.
        </Text>
        {Platform.OS === 'web' ? (
          <Text style={[hintSmall, { marginTop: spacing.sm }]}>
            El selector de calendario está disponible en la app en dispositivos móviles.
          </Text>
        ) : (
          <>
            <TouchableOpacity
              style={dateTrigger}
              onPress={openBirth}
              activeOpacity={0.85}
            >
              <Text style={dateTriggerText}>{birthLabel}</Text>
              <Text style={dateTriggerHint}>Toca para cambiar</Text>
            </TouchableOpacity>
            {age != null ? (
              <Text style={ageLine}>Edad: {age} años</Text>
            ) : null}
          </>
        )}

        {Platform.OS === 'ios' && showBirthPicker ? (
          <Modal transparent animationType="fade" visible={showBirthPicker}>
            <View style={modalBackdrop}>
              <View style={modalCard}>
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

        <Text style={footnote}>
          Solo maquetación; guardar y validación se conectarán después.
        </Text>
      </View>
      <SalonButton variant="heroGold" title="Guardar · demo" fullWidth onPress={onClose} />
    </>
  );
}

const fieldLabel = {
  fontFamily: typography.fontSansMedium,
  fontSize: 13,
  color: colors.foreground,
  marginBottom: spacing.xs,
};

function Field({ label, value, onChange, placeholder, keyboardType, autoCapitalize }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={fieldLabel}>{label}</Text>
      <TextInput
        style={input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.foregroundSubtle}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

const input = {
  fontFamily: typography.fontSans,
  fontSize: 15,
  color: colors.foreground,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  borderRadius: radii.sm,
  paddingHorizontal: spacing.md,
  paddingVertical: 12,
  backgroundColor: colors.card,
  minHeight: 48,
};

const inputFlex = { flex: 1 };

const phoneRow = {
  flexDirection: 'row',
  alignItems: 'stretch',
  gap: spacing.sm,
  marginBottom: spacing.md,
};

const prefixBox = {
  justifyContent: 'center',
  paddingHorizontal: spacing.md,
  borderRadius: radii.sm,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  backgroundColor: colors.iconCircleBg,
};

const prefixText = {
  fontFamily: typography.fontSansMedium,
  fontSize: 15,
  color: colors.foreground,
};

const hintSmall = {
  fontFamily: typography.fontSans,
  fontSize: 12,
  color: colors.foregroundMuted,
  lineHeight: 17,
  marginBottom: spacing.sm,
};

const dateTrigger = {
  borderWidth: 1,
  borderColor: colors.cardBorder,
  borderRadius: radii.sm,
  padding: spacing.md,
  backgroundColor: colors.card,
};

const dateTriggerText = {
  fontFamily: typography.fontSansMedium,
  fontSize: 15,
  color: colors.foreground,
};

const dateTriggerHint = {
  fontFamily: typography.fontSans,
  fontSize: 12,
  color: colors.foregroundSubtle,
  marginTop: 4,
};

const ageLine = {
  marginTop: spacing.sm,
  fontFamily: typography.fontSans,
  fontSize: 13,
  color: colors.primary,
};

const footnote = {
  marginTop: spacing.md,
  fontFamily: typography.fontSans,
  fontSize: 12,
  color: colors.foregroundSubtle,
  lineHeight: 18,
};

const card = {
  backgroundColor: colors.card,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  padding: spacing.lg,
  marginBottom: spacing.md,
};

const modalBackdrop = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'flex-end',
};

const modalCard = {
  backgroundColor: colors.card,
  padding: spacing.lg,
  paddingBottom: spacing.xl,
  borderTopLeftRadius: radii.xl,
  borderTopRightRadius: radii.xl,
};
