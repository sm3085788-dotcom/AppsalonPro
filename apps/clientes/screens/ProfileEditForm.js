import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SalonButton } from '../components/luxury/SalonButton';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { db } from '@appsalon/shared-config';
import { shareClienteFicha } from '../utils/shareClienteFicha';
import { splitFullName, joinFullName, profileNameFromClienteAndAuth } from '../utils/clientDisplayName';
import { useAuthKeyboardScroll } from '../utils/useAuthKeyboardScroll';

function computeAge(birth) {
  if (!birth) return null;
  const t = new Date();
  let a = t.getFullYear() - birth.getFullYear();
  const m = t.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < birth.getDate())) a -= 1;
  return Math.max(0, a);
}

function parseBirth(iso) {
  if (!iso) return new Date(1995, 0, 15);
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(1995, 0, 15) : d;
}

function Field({ label, value, onChange, placeholder, keyboardType, autoCapitalize, fieldBind }) {
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
    <View ref={fieldBind?.setRef} collapsable={false} style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.foregroundSubtle}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        onFocus={fieldBind?.onFocus}
      />
    </View>
  );
}

export function ProfileEditForm({ clienteRow, sessionUser, onClose, onSaved }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const { contentRef, keyboardOpen, keyboardHeight, bindField, onScroll } =
    useAuthKeyboardScroll(scrollRef, insets);
  const fieldNombre = bindField('nombre');
  const fieldApellido = bindField('apellido');
  const fieldTelefono = bindField('telefono');
  const fieldCorreo = bindField('correo');
  const fieldDireccion = bindField('direccion');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telLocal, setTelLocal] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [birth, setBirth] = useState(() => new Date(1995, 0, 15));
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const row = clienteRow || {};
    const { nombre: n, apellido: a } = profileNameFromClienteAndAuth(row, sessionUser);
    setNombre(n);
    setApellido(a);
    setCorreo(row.email || sessionUser?.email || '');
    setDireccion(row.direccion || '');
    setBirth(parseBirth(row.cumpleanos));
    const tel = String(row.telefono || '').replace(/\D/g, '');
    if (tel.startsWith('502')) setTelLocal(tel.slice(3, 11));
    else setTelLocal(tel.slice(0, 8));
  }, [clienteRow, sessionUser]);

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
    if (Platform.OS === 'android') setShowBirthPicker(false);
    if (event.type === 'dismissed') return;
    if (selected) setBirth(selected);
  };

  const openBirth = () => {
    if (Platform.OS === 'web') return;
    setShowBirthPicker(true);
  };

  const guardar = async () => {
    const nom = nombre.trim();
    const ape = apellido.trim();
    const fullName = joinFullName(nom, ape);
    if (nom.length < 2) {
      Alert.alert('Nombre', 'Ingresá tu nombre (mínimo 2 caracteres).');
      return;
    }
    if (ape.length < 2) {
      Alert.alert('Apellido', 'Ingresá tu apellido (mínimo 2 caracteres).');
      return;
    }
    if (!clienteRow?.id) {
      Alert.alert(
        'Sin ficha en el salón',
        'Tu cuenta aún no está enlazada en clientes. Cerrá sesión y volvé a entrar, o pedí ayuda en recepción.',
      );
      return;
    }
    const digits = telLocal.replace(/\D/g, '').slice(0, 8);
    const telefono = digits ? `+502${digits}` : null;
    setSaving(true);
    try {
      const { error } = await db.clientes.update(clienteRow.id, {
        nombre: fullName,
        telefono,
        email: correo.trim() || null,
        direccion: direccion.trim() || null,
        cumpleanos: birth.toISOString().split('T')[0],
      });
      if (error) {
        Alert.alert('No se guardó', error.message || 'Intentá de nuevo.');
        return;
      }
      onSaved?.();
      Alert.alert('Listo', 'Tu perfil quedó actualizado en el salón.');
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const exportar = async () => {
    const payload = {
      ...(clienteRow || {}),
      nombre: joinFullName(nombre, apellido) || clienteRow?.nombre,
      telefono: telLocal ? `+502${telLocal.replace(/\D/g, '').slice(0, 8)}` : clienteRow?.telefono,
      email: correo.trim() || clienteRow?.email,
      direccion: direccion.trim() || clienteRow?.direccion,
      cumpleanos: birth.toISOString().split('T')[0],
    };
    setExporting(true);
    try {
      await shareClienteFicha(payload);
    } catch (e) {
      Alert.alert('Exportar', e?.message || 'No se pudo compartir la ficha.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      contentContainerStyle={{
        paddingBottom:
          insets.bottom +
          spacing.xl +
          (keyboardOpen ? keyboardHeight + spacing.lg : 0),
      }}
    >
      <View ref={contentRef} collapsable={false}>
      <View style={st.card}>
        <Field
          label="Nombre"
          value={nombre}
          onChange={setNombre}
          placeholder="Nombre"
          fieldBind={fieldNombre}
        />
        <Field
          label="Apellido"
          value={apellido}
          onChange={setApellido}
          placeholder="Apellido"
          fieldBind={fieldApellido}
        />

        <View ref={fieldTelefono.setRef} collapsable={false}>
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
            style={[
              st.inputFlex,
              {
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
            ]}
            value={telLocal}
            onChangeText={setTelLocal}
            placeholder="1234 5678"
            placeholderTextColor={c.foregroundSubtle}
            keyboardType="phone-pad"
            onFocus={fieldTelefono.onFocus}
          />
        </View>
        </View>

        <Field
          label="Correo"
          value={correo}
          onChange={setCorreo}
          placeholder="tu@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          fieldBind={fieldCorreo}
        />

        <Field
          label="Dirección"
          value={direccion}
          onChange={setDireccion}
          placeholder="Zona, calle, ciudad"
          fieldBind={fieldDireccion}
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
        <Text style={st.hintSmall}>Se guarda en tu ficha del salón.</Text>
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
      </View>
      <SalonButton
        variant="heroGold"
        title={saving ? 'Guardando…' : 'Guardar'}
        fullWidth
        disabled={saving}
        onPress={guardar}
      />
      <SalonButton
        variant="outlineGray"
        title={exporting ? 'Exportando…' : 'Exportar mis datos y foto'}
        fullWidth
        disabled={exporting}
        onPress={exportar}
        style={{ marginTop: spacing.sm }}
      />
      </View>
    </ScrollView>
  );
}
