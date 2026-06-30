import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Check, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, uploadEventoProfesionalMediaFromUri } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

const HERO_ASPECT = [626, 417];

function emptyEvento() {
  return {
    id: null,
    titulo: '',
    descripcion: '',
    categoria: 'Evento',
    imagen_url: '',
    precio_label: '',
    badge: '',
    compare_at_label: '',
    activo: true,
    orden: 0,
  };
}

export function EventosProfesionalesScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [tab, setTab] = useState('eventos');
  const [eventos, setEventos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyEvento());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, solRes] = await Promise.all([
      db.eventosProfesionales.listAll(),
      db.eventosProfesionales.listSolicitudes(),
    ]);
    setEventos(Array.isArray(evRes.data) ? evRes.data : []);
    setSolicitudes(Array.isArray(solRes.data) ? solRes.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso', 'Necesitamos acceso a fotos para la imagen del evento (626×417).');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: HERO_ASPECT,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    setSaving(true);
    const uri = picked.assets[0].uri;
    const { publicUrl, error } = await uploadEventoProfesionalMediaFromUri(uri, {
      extension: 'jpg',
      contentType: 'image/jpeg',
    });
    setSaving(false);
    if (error || !publicUrl) {
      Alert.alert('Imagen', error?.message || 'No se pudo subir.');
      return;
    }
    setForm((f) => ({ ...f, imagen_url: publicUrl }));
  };

  const saveEvento = async () => {
    if (!String(form.titulo).trim()) {
      Alert.alert('Título', 'Ingresá un título para el evento.');
      return;
    }
    setSaving(true);
    const payload = {
      titulo: String(form.titulo).trim(),
      descripcion: String(form.descripcion || '').trim(),
      categoria: String(form.categoria || 'Evento').trim(),
      imagen_url: form.imagen_url || null,
      precio_label: form.precio_label || null,
      badge: form.badge || null,
      compare_at_label: form.compare_at_label || null,
      activo: !!form.activo,
      orden: Number(form.orden) || 0,
    };
    const res = form.id
      ? await db.eventosProfesionales.update(form.id, payload)
      : await db.eventosProfesionales.create(payload);
    setSaving(false);
    if (res.error) {
      Alert.alert('Guardar', res.error.message || 'No se pudo guardar.');
      return;
    }
    setEditing(false);
    setForm(emptyEvento());
    await load();
  };

  const updateSolicitud = async (id, estado) => {
    const { error } = await db.eventosProfesionales.updateSolicitudEstado(id, estado);
    if (error) Alert.alert('Solicitud', error.message || 'No se pudo actualizar.');
    else await load();
  };

  const body = editing ? (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>{form.id ? 'Editar evento' : 'Nuevo evento'}</Text>
      {form.imagen_url ? (
        <Image source={{ uri: form.imagen_url }} style={styles.heroPreview} resizeMode="cover" />
      ) : null}
      <SalonButton title="Imagen hero (626×417)" variant="outlineGold" fullWidth onPress={() => void pickImage()} />
      <Field label="Título" value={form.titulo} onChange={(t) => setForm((f) => ({ ...f, titulo: t }))} />
      <Field label="Categoría" value={form.categoria} onChange={(t) => setForm((f) => ({ ...f, categoria: t }))} />
      <Field label="Precio (texto)" value={form.precio_label} onChange={(t) => setForm((f) => ({ ...f, precio_label: t }))} />
      <Field label="Badge" value={form.badge} onChange={(t) => setForm((f) => ({ ...f, badge: t }))} />
      <Field
        label="Descripción"
        value={form.descripcion}
        onChange={(t) => setForm((f) => ({ ...f, descripcion: t }))}
        multiline
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Activo en App Clientes</Text>
        <Switch value={form.activo} onValueChange={(v) => setForm((f) => ({ ...f, activo: v }))} />
      </View>
      <SalonButton title={saving ? 'Guardando…' : 'Guardar'} variant="heroGold" fullWidth disabled={saving} onPress={() => void saveEvento()} />
      <SalonButton title="Cancelar" variant="outlineGray" fullWidth style={{ marginTop: spacing.sm }} onPress={() => { setEditing(false); setForm(emptyEvento()); }} />
    </View>
  ) : tab === 'eventos' ? (
    <>
      <SalonButton title="Nuevo evento" variant="heroGold" fullWidth onPress={() => { setForm(emptyEvento()); setEditing(true); }} />
      <FlatList
        data={eventos}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.primary} />}
        contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.sm, marginTop: spacing.md }}
        ListEmptyComponent={loading ? <ActivityIndicator color={c.primary} /> : <Text style={styles.empty}>Sin eventos</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.rowCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}
            onPress={() => { setForm({ ...emptyEvento(), ...item }); setEditing(true); }}
          >
            {item.imagen_url ? <Image source={{ uri: item.imagen_url }} style={styles.thumb} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.titulo}</Text>
              <Text style={styles.rowSub}>{item.categoria} · {item.activo ? 'Activo' : 'Oculto'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </>
  ) : (
    <FlatList
      data={solicitudes}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.primary} />}
      contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.sm }}
      ListEmptyComponent={loading ? <ActivityIndicator color={c.primary} /> : <Text style={styles.empty}>Sin solicitudes</Text>}
      renderItem={({ item }) => (
        <View style={[styles.rowCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
          <Text style={styles.rowTitle}>{item.evento?.titulo || 'Evento'}</Text>
          <Text style={styles.rowSub}>
            {item.cliente?.nombre || 'Cliente'} · {item.estado}
          </Text>
          {item.mensaje ? <Text style={styles.rowMsg}>{item.mensaje}</Text> : null}
          {item.estado === 'pending' ? (
            <View style={styles.solActions}>
              <TouchableOpacity onPress={() => void updateSolicitud(item.id, 'accepted')} style={styles.acceptBtn}>
                <Check size={16} color="#2E7D32" />
                <Text style={styles.acceptTxt}>Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void updateSolicitud(item.id, 'rejected')} style={styles.rejectBtn}>
                <X size={16} color="#B00020" />
                <Text style={styles.rejectTxt}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    />
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Eventos Profesionales"
        subtitle="Paquetes para bodas, fiestas y sesiones · solicitudes de clientes"
        onBack={onBack}
        disableBodyScroll
      >
        {!editing ? (
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, tab === 'eventos' && styles.tabOn]} onPress={() => setTab('eventos')}>
              <Text style={[styles.tabTxt, tab === 'eventos' && styles.tabTxtOn]}>Eventos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'solicitudes' && styles.tabOn]} onPress={() => setTab('solicitudes')}>
              <Text style={[styles.tabTxt, tab === 'solicitudes' && styles.tabTxtOn]}>
                Solicitudes{solicitudes.filter((s) => s.estado === 'pending').length ? ` (${solicitudes.filter((s) => s.estado === 'pending').length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.bodyPad}>{body}</View>
      </SubScreenChrome>
    </View>
  );
}

function Field({ label, value, onChange, multiline }) {
  const { colors: c } = useTheme();
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={{ fontFamily: typography.fontSansMedium, fontSize: 13, color: c.foreground, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: c.cardBorder,
          borderRadius: radii.sm,
          padding: spacing.md,
          color: c.foreground,
          backgroundColor: c.card,
          minHeight: multiline ? 88 : 44,
          textAlignVertical: multiline ? 'top' : 'center',
          fontFamily: typography.fontSans,
        }}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
      />
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    bodyPad: { flex: 1 },
    tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    tab: { flex: 1, paddingVertical: 10, borderRadius: radii.sm, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
    tabOn: { borderColor: c.primary, backgroundColor: c.surfaceMuted },
    tabTxt: { fontFamily: typography.fontSansMedium, fontSize: 13, color: c.foregroundMuted },
    tabTxtOn: { color: c.primary },
    formCard: { paddingBottom: spacing.xl },
    formTitle: { fontFamily: typography.fontDisplay, fontSize: 22, color: c.foreground, marginBottom: spacing.md },
    heroPreview: { width: '100%', height: 180, borderRadius: radii.md, marginBottom: spacing.sm },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.md },
    switchLabel: { fontFamily: typography.fontSans, fontSize: 14, color: c.foreground },
    rowCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, alignItems: 'center' },
    thumb: { width: 56, height: 38, borderRadius: radii.sm },
    rowTitle: { fontFamily: typography.fontSansMedium, fontSize: 15, color: c.foreground },
    rowSub: { fontFamily: typography.fontSans, fontSize: 12, color: c.foregroundMuted, marginTop: 2 },
    rowMsg: { fontFamily: typography.fontSans, fontSize: 13, color: c.foreground, marginTop: spacing.xs },
    empty: { textAlign: 'center', color: c.foregroundMuted, marginTop: spacing.lg },
    solActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    acceptTxt: { color: '#2E7D32', fontFamily: typography.fontSansMedium, fontSize: 13 },
    rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rejectTxt: { color: '#B00020', fontFamily: typography.fontSansMedium, fontSize: 13 },
  });
}
