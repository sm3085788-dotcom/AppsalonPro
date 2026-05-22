import { useEffect, useMemo, useState } from 'react';
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
}) {
  const styles = useMemo(() => createFichaStyles(c), [c]);
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) {
      setEditingKey(null);
      setDraft('');
    }
  }, [visible]);

  if (!record) return null;

  const beginEdit = (field) => {
    if (field.type === 'switch') {
      const raw = field.getValue(record);
      const next = !(raw === true || raw === 'true' || raw === 1);
      void (async () => {
        const res = await onSaveField(field.key, next, field);
        if (!res?.ok && res?.error) {
          /* el padre muestra Alert */
        }
      })();
      return;
    }
    const raw = field.getValue(record);
    const display =
      field.getEditDraft != null
        ? field.getEditDraft(record)
        : field.formatDisplay != null
          ? field.formatDisplay(raw)
          : raw != null && raw !== ''
            ? String(raw)
            : '';
    setEditingKey(field.key);
    setDraft(display);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraft('');
  };

  const commitEdit = async (field) => {
    let parsed = draft;
    if (field.parse) {
      parsed = field.parse(draft);
    } else {
      const t = String(draft ?? '').trim();
      parsed = t.length ? t : null;
    }
    if (field.required && (parsed == null || parsed === '')) {
      setEditingKey(null);
      setDraft('');
      await onSaveField(field.key, parsed, field);
      return;
    }
    setEditingKey(null);
    setDraft('');
    await onSaveField(field.key, parsed, field);
  };

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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.pad, { paddingBottom: modalScrollBottomPad(insets) }]}
        >
          <View style={[styles.card, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

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
                <TouchableOpacity
                  key={field.key}
                  style={[styles.row, isEditing && { backgroundColor: c.surfaceMuted, borderRadius: radii.sm }]}
                  onPress={() => !isEditing && beginEdit(field)}
                  disabled={isEditing || isSaving}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${field.label}`}
                >
                  <Text style={styles.lbl}>{field.label}</Text>
                  {isEditing ? (
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
                      keyboardType={field.keyboardType || 'default'}
                      autoCapitalize={field.autoCapitalize ?? 'sentences'}
                      autoCorrect={field.autoCorrect ?? true}
                      onBlur={() => void commitEdit(field)}
                      onSubmitEditing={() => void commitEdit(field)}
                      returnKeyType={field.multiline ? 'default' : 'done'}
                    />
                  ) : (
                    <View style={styles.valRow}>
                      <Text style={[styles.val, displayVal === emptyDisplay && { color: c.foregroundSubtle }]}>
                        {displayVal}
                      </Text>
                      {isSaving ? <ActivityIndicator color={c.primary} size="small" style={{ marginLeft: 8 }} /> : null}
                    </View>
                  )}
                  {!isEditing ? (
                    <Text style={[styles.tapHint, { color: c.foregroundSubtle }]}>Tocá para editar</Text>
                  ) : null}
                </TouchableOpacity>
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
    },
  });
}
