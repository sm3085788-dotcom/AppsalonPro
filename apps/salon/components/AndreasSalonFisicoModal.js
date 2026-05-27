import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { X, Store, Plus, Minus } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, parseSalonFisicoUnidades, ANDREAS_META } from '@appsalon/shared-config';
import { SalonButton } from './luxury/SalonButton';
import { modalSheetBottomPad } from './luxury';

export function AndreasSalonFisicoModal({
  visible,
  onClose,
  colors: c,
  insets,
  clientes,
  initialCliente,
  onSaved,
}) {
  const [picked, setPicked] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [unidades, setUnidades] = useState('0');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const row = initialCliente?.id ? initialCliente : null;
    setPicked(row);
    setBusqueda('');
    setErr(null);
    if (row) {
      setUnidades(String(parseSalonFisicoUnidades(row.andreas_premios)));
    } else {
      setUnidades('0');
    }
  }, [visible, initialCliente]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const list = Array.isArray(clientes) ? clientes : [];
    if (!q) return list.slice(0, 30);
    return list
      .filter((cl) => {
        const hay = [cl.nombre, cl.telefono, cl.email]
          .map((x) => String(x || '').toLowerCase())
          .join(' ');
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [clientes, busqueda]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
        card: {
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          maxHeight: '88%',
        },
        head: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        title: { fontFamily: typography.fontSansMedium, fontSize: 17, color: c.foreground, flex: 1 },
        lead: {
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foregroundMuted,
          lineHeight: 19,
          marginBottom: spacing.md,
        },
        search: {
          minHeight: 44,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
          color: c.foreground,
          paddingHorizontal: spacing.md,
          fontFamily: typography.fontSans,
          fontSize: 14,
          marginBottom: spacing.sm,
        },
        pickRow: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          marginBottom: spacing.xs,
          backgroundColor: c.card,
        },
        pickRowOn: { borderColor: c.primary, backgroundColor: c.surfaceMuted },
        pickName: { fontFamily: typography.fontSansMedium, fontSize: 14, color: c.foreground },
        pickSub: { fontFamily: typography.fontSans, fontSize: 12, color: c.foregroundMuted, marginTop: 2 },
        counterRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
          marginVertical: spacing.md,
        },
        counterBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: c.cardBorder,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.card,
        },
        counterInput: {
          minWidth: 72,
          textAlign: 'center',
          fontFamily: typography.fontDisplay,
          fontSize: 28,
          color: c.foreground,
          borderBottomWidth: 1,
          borderBottomColor: c.cardBorder,
          paddingVertical: 4,
        },
        meta: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundSubtle,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        err: { fontFamily: typography.fontSans, fontSize: 12, color: c.error, marginBottom: spacing.sm },
      }),
    [c],
  );

  const guardar = useCallback(async () => {
    if (!picked?.id) {
      setErr('Elegí un cliente de la lista.');
      return;
    }
    const n = parseInt(String(unidades).replace(/\D/g, ''), 10);
    if (!Number.isFinite(n) || n < 0) {
      setErr('Ingresá un número válido (0 o más).');
      return;
    }
    setSaving(true);
    setErr(null);
    const { data, error } = await db.premiosAndreas.updateSalonFisicoUnidades(picked.id, n);
    setSaving(false);
    if (error) {
      const msg = String(error.message || '');
      if (/andreas_premios|column/i.test(msg)) {
        setErr('Falta la migración SQL. Ejecutá supabase-andreas-premios.sql en Supabase.');
      } else {
        setErr(msg || 'No se pudo guardar.');
      }
      return;
    }
    onSaved?.(data);
    onClose?.();
  }, [picked, unidades, onSaved, onClose]);

  const sumar = useCallback(
    async (delta) => {
      if (!picked?.id) {
        setErr('Elegí un cliente primero.');
        return;
      }
      setSaving(true);
      setErr(null);
      const { data, error } = await db.premiosAndreas.addSalonFisicoUnidades(picked.id, delta);
      setSaving(false);
      if (error) {
        setErr(error.message || 'No se pudo sumar.');
        return;
      }
      const next = parseSalonFisicoUnidades(data?.andreas_premios);
      setUnidades(String(next));
      setPicked((prev) => (prev ? { ...prev, andreas_premios: data?.andreas_premios } : prev));
      onSaved?.(data);
    },
    [picked, onSaved],
  );

  const cur = parseInt(String(unidades).replace(/\D/g, ''), 10);
  const curSafe = Number.isFinite(cur) && cur >= 0 ? cur : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
          <View style={styles.head}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Store size={20} color={c.primary} strokeWidth={2} />
              <Text style={styles.title}>ANDREAS · Salón físico</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
              <X size={22} color={c.foregroundMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lead}>
            Registrá compras de producto en el salón. Cada unidad suma 1 punto; con {ANDREAS_META.salon} puntos el
            cliente puede canjear 19,99% en la siguiente compra física.
          </Text>

          {!picked ? (
            <>
              <TextInput
                style={styles.search}
                placeholder="Buscar cliente…"
                placeholderTextColor={c.foregroundSubtle}
                value={busqueda}
                onChangeText={setBusqueda}
              />
              <FlatList
                data={filtrados}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 220 }}
                ListEmptyComponent={
                  <Text style={[styles.lead, { marginBottom: 0 }]}>Sin resultados.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickRow}
                    onPress={() => {
                      setPicked(item);
                      setUnidades(String(parseSalonFisicoUnidades(item.andreas_premios)));
                      setErr(null);
                    }}
                  >
                    <Text style={styles.pickName}>{item.nombre || 'Sin nombre'}</Text>
                    <Text style={styles.pickSub}>
                      {parseSalonFisicoUnidades(item.andreas_premios)} / {ANDREAS_META.salon} unidades · salón físico
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  setPicked(null);
                  setUnidades('0');
                }}
              >
                <Text style={{ fontFamily: typography.fontSansMedium, fontSize: 13, color: c.primary }}>
                  ← Cambiar cliente
                </Text>
              </TouchableOpacity>
              <Text style={[styles.pickName, { marginTop: spacing.sm, marginBottom: spacing.xs }]}>
                {picked.nombre}
              </Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setUnidades(String(Math.max(0, curSafe - 1)))}
                  disabled={saving}
                >
                  <Minus size={20} color={c.foreground} />
                </TouchableOpacity>
                <TextInput
                  style={styles.counterInput}
                  value={unidades}
                  onChangeText={setUnidades}
                  keyboardType="number-pad"
                  editable={!saving}
                />
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setUnidades(String(curSafe + 1))}
                  disabled={saving}
                >
                  <Plus size={20} color={c.foreground} />
                </TouchableOpacity>
              </View>
              <Text style={styles.meta}>
                {curSafe} de {ANDREAS_META.salon} unidades verificadas en salón físico
              </Text>
              <SalonButton
                title={saving ? '…' : '+1 producto comprado hoy'}
                variant="outlineGold"
                fullWidth
                disabled={saving}
                onPress={() => void sumar(1)}
              />
            </>
          )}

          {err ? <Text style={styles.err}>{err}</Text> : null}

          {picked ? (
            <SalonButton
              title={saving ? 'Guardando…' : 'Guardar total'}
              variant="heroGold"
              fullWidth
              disabled={saving}
              onPress={() => void guardar()}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}

          {saving ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={c.primary} /> : null}
        </View>
      </View>
    </Modal>
  );
}
