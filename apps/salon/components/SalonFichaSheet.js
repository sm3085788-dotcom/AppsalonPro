import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { modalSheetBottomPad, modalScrollBottomPad } from './luxury';

function getEditableFields(fields) {
  return fields.filter((f) => f.type !== 'switch');
}

function getNextFieldKey(fields, currentKey) {
  const editable = getEditableFields(fields);
  const i = editable.findIndex((f) => f.key === currentKey);
  if (i < 0 || i >= editable.length - 1) return null;
  return editable[i + 1].key;
}

function draftForField(field, record) {
  const raw = field.getValue(record);
  if (field.getEditDraft != null) return field.getEditDraft(record);
  if (field.formatDisplay != null) return field.formatDisplay(raw);
  return raw != null && raw !== '' ? String(raw) : '';
}

/**
 * Ficha tipo «cliente»: foto arriba, etiquetas en mayúsculas y valor editable al tocar.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {object} props.colors - tokens del tema
 * @param {object} props.insets - safe area
 * @param {object|null} props.record
 * @param {Array} props.fields - ver FichaFieldDef en JSDoc del export
 * @param {{ uri?: string, letter?: string, onPress?: () => void }} [props.photo]
 * @param {(key: string, value: unknown, field: object) => Promise<{ ok: boolean, record?: object, error?: string }>} props.onSaveField
 * @param {string|null} [props.savingKey]
 * @param {React.ReactNode} [props.extraContent]
 * @param {React.ReactNode} [props.footer]
 * @param {string} [props.emptyDisplay]
 * @param {boolean} [props.isNew] - ficha sin id en base de datos
 * @param {string} [props.initialEditKey] - abre ese campo al abrir (ej. nombre)
 * @param {string} [props.newHint] - texto bajo el título para altas nuevas
 * @param {boolean} [props.advanceOnEnter] - Enter / «siguiente» pasa al siguiente campo (clientes, empleados)
 */
export function SalonFichaSheet({
  visible,
  onClose,
  title,
  colors: c,
  insets,
  record,
  fields = [],
  photo,
  onSaveField,
  savingKey = null,
  extraContent = null,
  footer = null,
  emptyDisplay = '—',
  isNew = false,
  initialEditKey = null,
  newHint = null,
  advanceOnEnter = false,
}) {
  const styles = useMemo(() => createFichaStyles(c), [c]);
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState('');
  const committingRef = useRef(false);
  const skipBlurRef = useRef(false);

  const editingKeyRef = useRef(editingKey);
  const draftRef = useRef(draft);
  const recordRef = useRef(record);
  const fieldsRef = useRef(fields);
  editingKeyRef.current = editingKey;
  draftRef.current = draft;
  recordRef.current = record;
  fieldsRef.current = fields;

  const parseDraft = (field, text) => {
    if (field.parse) return field.parse(text);
    if (field.multiline) {
      const t = String(text ?? '');
      return t.trim().length ? t.trim() : null;
    }
    const t = String(text ?? '').trim();
    return t.length ? t : null;
  };

  const valueUnchanged = (field, parsed, rec = record) => {
    const raw = field.getValue(rec);
    if (field.type === 'switch') {
      const on = raw === true || raw === 'true' || raw === 1;
      return parsed === on;
    }
    const norm = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());
    return norm(parsed) === norm(raw);
  };

  const commitEdit = async (field, draftOverride) => {
    if (committingRef.current || editingKey !== field.key) return { skipped: true };
    committingRef.current = true;
    const text = draftOverride != null ? draftOverride : draft;
    const parsed = parseDraft(field, text);
    if (valueUnchanged(field, parsed)) {
      setEditingKey(null);
      setDraft('');
      committingRef.current = false;
      return { ok: true, unchanged: true };
    }
    const savedDraft = text;
    setEditingKey(null);
    setDraft('');
    try {
      const res = await onSaveField(field.key, parsed, field);
      if (res?.ok === false) {
        setEditingKey(field.key);
        setDraft(savedDraft);
        return { ok: false };
      }
      return { ok: true };
    } finally {
      committingRef.current = false;
    }
  };

  const focusField = (field, rec = record) => {
    setEditingKey(field.key);
    setDraft(draftForField(field, rec));
  };

  const beginEdit = (field) => {
    if (field.type === 'switch') {
      const raw = field.getValue(record);
      const next = !(raw === true || raw === 'true' || raw === 1);
      void (async () => {
        await onSaveField(field.key, next, field);
      })();
      return;
    }
    if (editingKey && editingKey !== field.key) {
      const prev = fields.find((f) => f.key === editingKey);
      if (prev) void commitEdit(prev);
    }
    focusField(field);
  };

  const submitFieldAndAdvance = async (field) => {
    if (field.type === 'switch') return;
    if (!advanceOnEnter || field.multiline) {
      await commitEdit(field);
      return;
    }
    const nextKey = getNextFieldKey(fields, field.key);
    skipBlurRef.current = true;
    const res = await commitEdit(field);
    skipBlurRef.current = false;
    if (!res || res.ok === false) return;
    if (nextKey) {
      const next = fields.find((f) => f.key === nextKey);
      if (next && next.type !== 'switch') {
        focusField(next, recordRef.current ?? record);
      }
    }
  };

  const prevVisibleRef = useRef(false);
  useEffect(() => {
    if (!visible) {
      prevVisibleRef.current = false;
      return;
    }
    const opening = !prevVisibleRef.current;
    prevVisibleRef.current = true;
    if (!opening) return;
    if (isNew && initialEditKey && record) {
      const field = fields.find((f) => f.key === initialEditKey);
      if (field) focusField(field, record);
      return;
    }
    setEditingKey(null);
    setDraft('');
  }, [visible, isNew, initialEditKey, record, fields]);

  useEffect(() => {
    if (visible) return undefined;
    const key = editingKeyRef.current;
    if (!key) return undefined;
    const rec = recordRef.current;
    const field = fieldsRef.current.find((f) => f.key === key);
    if (!field || field.type === 'switch' || !rec) return undefined;
    void (async () => {
      if (committingRef.current) return;
      committingRef.current = true;
      try {
        const parsed = parseDraft(field, draftRef.current);
        if (!valueUnchanged(field, parsed, rec)) {
          await onSaveField(field.key, parsed, field);
        }
      } finally {
        committingRef.current = false;
        setEditingKey(null);
        setDraft('');
      }
    })();
    return undefined;
  }, [visible, onSaveField]);

  if (!record) return null;

  const letter =
    photo?.letter ??
    (typeof record?.nombre === 'string'
      ? record.nombre.trim().charAt(0).toUpperCase()
      : typeof record?.nombre_compania === 'string'
        ? record.nombre_compania.trim().charAt(0).toUpperCase()
        : '?');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.pad, { paddingBottom: modalScrollBottomPad(insets) }]}
        >
          <View style={[styles.card, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

            {isNew && newHint ? (
              <Text style={[styles.newHint, { color: c.foregroundMuted }]}>{newHint}</Text>
            ) : null}

            {photo !== false ? (
              <TouchableOpacity
                style={styles.photoWrap}
                onPress={photo?.onPress}
                disabled={!photo?.onPress}
                activeOpacity={photo?.onPress ? 0.85 : 1}
                accessibilityLabel={photo?.onPress ? 'Cambiar foto' : undefined}
              >
                {photo?.uri ? (
                  <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
                ) : (
                  <View style={[styles.photo, styles.photoEmpty, { backgroundColor: c.surfaceMuted }]}>
                    <Text style={styles.photoLetter}>{letter}</Text>
                  </View>
                )}
                {photo?.onPress ? (
                  <Text style={[styles.photoHint, { color: c.foregroundMuted }]}>Tocá para cambiar foto</Text>
                ) : null}
              </TouchableOpacity>
            ) : null}

            {fields.map((field) => {
              const raw = field.getValue(record);
              const show =
                field.alwaysShow ||
                (raw != null && raw !== '' && String(raw).trim() !== '') ||
                editingKey === field.key;
              if (!show) return null;

              const isEditing = editingKey === field.key;
              const isSaving = savingKey === field.key;
              const nextFieldKey =
                advanceOnEnter && !field.multiline ? getNextFieldKey(fields, field.key) : null;
              const enterReturnKey =
                advanceOnEnter && !field.multiline ? (nextFieldKey ? 'next' : 'done') : field.multiline ? 'default' : 'done';
              const displayVal =
                field.type === 'switch'
                  ? raw === true || raw === 'true' || raw === 1
                    ? 'Sí'
                    : 'No'
                  : field.formatDisplay
                    ? field.formatDisplay(raw)
                    : raw != null && raw !== ''
                      ? String(raw)
                      : emptyDisplay;

              if (field.type === 'switch') {
                return (
                  <View key={field.key} style={styles.row}>
                    <Text style={styles.lbl}>{field.label}</Text>
                    <View style={styles.switchRow}>
                      <Text style={styles.val}>{displayVal}</Text>
                      {isSaving ? (
                        <ActivityIndicator color={c.primary} size="small" />
                      ) : (
                        <Switch
                          value={raw === true || raw === 'true' || raw === 1}
                          onValueChange={() => beginEdit(field)}
                          trackColor={{ false: c.cardBorder, true: c.primary }}
                          thumbColor={c.foreground}
                        />
                      )}
                    </View>
                  </View>
                );
              }

              return (
                <View
                  key={field.key}
                  style={[styles.row, isEditing && { backgroundColor: c.surfaceMuted, borderRadius: radii.sm }]}
                >
                  <Text style={styles.lbl}>{field.label}</Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        style={[
                          styles.inp,
                          field.multiline && styles.inpArea,
                          { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card },
                        ]}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={field.placeholder || `Editar ${field.label.toLowerCase()}`}
                        placeholderTextColor={c.foregroundSubtle}
                        autoFocus
                        multiline={!!field.multiline}
                        blurOnSubmit={!field.multiline}
                        keyboardType={field.keyboardType || 'default'}
                        autoCapitalize={field.autoCapitalize ?? 'sentences'}
                        autoCorrect={field.autoCorrect ?? true}
                        onBlur={() => {
                          if (skipBlurRef.current) return;
                          void commitEdit(field);
                        }}
                        onSubmitEditing={() =>
                          void (advanceOnEnter && !field.multiline
                            ? submitFieldAndAdvance(field)
                            : commitEdit(field))
                        }
                        returnKeyType={enterReturnKey}
                        enablesReturnKeyAutomatically={!!nextFieldKey}
                      />
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => beginEdit(field)}
                      disabled={isSaving}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${field.label}`}
                    >
                      <View style={styles.valRow}>
                        <Text style={[styles.val, displayVal === emptyDisplay && { color: c.foregroundSubtle }]}>
                          {displayVal}
                        </Text>
                        {isSaving ? (
                          <ActivityIndicator color={c.primary} size="small" style={{ marginLeft: 8 }} />
                        ) : null}
                      </View>
                      <Text style={[styles.tapHint, { color: c.foregroundSubtle }]}>
                        {advanceOnEnter
                          ? 'Tocá para editar · Enter siguiente (dirección: nueva línea)'
                          : 'Tocá para editar · se guarda al salir del campo'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {extraContent}
            {footer}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createFichaStyles(c) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pad: { padding: spacing.md },
    card: {
      borderRadius: radii.lg,
      padding: spacing.lg,
      overflow: 'hidden',
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
      flex: 1,
      marginRight: spacing.sm,
    },
    newHint: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.md,
    },
    photoWrap: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    photo: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    photoEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoLetter: {
      fontFamily: typography.fontDisplay,
      fontSize: 36,
      color: c.foregroundMuted,
      lineHeight: 40,
    },
    photoHint: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      marginTop: spacing.xs,
    },
    row: {
      marginBottom: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    lbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      color: c.foregroundMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    val: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      color: c.foreground,
      lineHeight: 21,
      flex: 1,
    },
    valRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    inp: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 44,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    inpArea: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    tapHint: {
      fontFamily: typography.fontSans,
      fontSize: 10,
      marginTop: 2,
      lineHeight: 13,
    },
  });
}
