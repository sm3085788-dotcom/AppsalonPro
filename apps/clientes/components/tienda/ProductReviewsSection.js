import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Star, Camera, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, uploadResenaFotoFromUri } from '@appsalon/shared-config';
import { SalonButton } from '../luxury/SalonButton';
import { createSubStyles } from '../luxury/SubScreenChrome';
import { useTheme } from '../../theme/ThemeProvider';

const STAR_GOLD = '#FFB800';

function RatingStars({ rating, onPress, emptyColor }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onPress?.(star)}
          disabled={!onPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${star} estrellas`}
        >
          <Star
            size={20}
            color={star <= rating ? STAR_GOLD : emptyColor}
            fill={star <= rating ? STAR_GOLD : emptyColor}
            strokeWidth={0}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-GT', { dateStyle: 'medium' });
  } catch {
    return '';
  }
}

function reviewAuthorLabel(review) {
  const name = String(review?.autor_nombre || '').trim();
  return name || 'Cliente verificado';
}

export function ProductReviewsSection({
  inventarioId,
  clienteId,
  clientUserId,
  autorNombre,
  ratingSummary = 0,
  reviewCount = 0,
  onMetaUpdated,
}) {
  const { colors: c, isDark } = useTheme();
  const subStyles = useMemo(() => createSubStyles(c), [c]);
  const styles = useMemo(() => createStyles(c), [c]);
  const starEmpty = isDark ? '#525252' : '#E3E3E3';

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comentario, setComentario] = useState('');
  const [fotos, setFotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxUri, setLightboxUri] = useState(null);
  const { width: winW, height: winH } = useWindowDimensions();

  const load = useCallback(async () => {
    if (!inventarioId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [listRes, canRes] = await Promise.all([
      db.inventarioResenas.listByInventario(inventarioId),
      clientUserId ? db.inventarioResenas.canReview(inventarioId) : Promise.resolve({ ok: true, allowed: false }),
    ]);
    setReviews(Array.isArray(listRes.data) ? listRes.data : []);
    setCanReview(Boolean(canRes?.allowed));
    setLoading(false);
  }, [inventarioId, clientUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickPhoto = async () => {
    if (fotos.length >= 2) {
      Alert.alert('Límite de fotos', 'Podés agregar hasta 2 fotos por reseña.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso', 'Necesitamos acceso a tus fotos para adjuntar imágenes.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    setFotos((prev) => [...prev, picked.assets[0].uri].slice(0, 2));
  };

  const removePhoto = (idx) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitReview = async () => {
    if (!clientUserId) {
      Alert.alert('Iniciá sesión', 'Necesitás una cuenta para publicar reseñas.');
      return;
    }
    if (!canReview) {
      Alert.alert(
        'Compra verificada',
        'Solo podés reseñar productos que ya recibiste (pedido entregado).',
      );
      return;
    }
    if (!String(comentario).trim()) {
      Alert.alert('Comentario', 'Escribí un comentario sobre el producto.');
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = [];
      for (const uri of fotos) {
        const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpg';
        const { publicUrl, error } = await uploadResenaFotoFromUri(uri, {
          extension: ext,
          contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        });
        if (error || !publicUrl) {
          Alert.alert('Foto', error?.message || 'No se pudo subir una imagen.');
          setSubmitting(false);
          return;
        }
        uploaded.push(publicUrl);
      }
      const { error } = await db.inventarioResenas.submit({
        inventarioId,
        clienteId,
        rating,
        comentario,
        fotoUrls: uploaded,
        autorNombre,
      });
      if (error) {
        Alert.alert('Reseña', error.message || 'No se pudo publicar.');
        return;
      }
      setFormOpen(false);
      setComentario('');
      setFotos([]);
      setRating(5);
      await load();
      onMetaUpdated?.();
      Alert.alert('Gracias', 'Tu reseña fue publicada.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[subStyles.card, styles.wrap]}>
      <Text style={subStyles.rowLabel}>Opiniones de clientes</Text>
      <View style={styles.summaryRow}>
        <RatingStars rating={Math.round(ratingSummary)} emptyColor={starEmpty} />
        <Text style={styles.summaryTxt}>
          {Number(ratingSummary || 0).toFixed(1)} · {reviewCount} opiniones
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} />
      ) : (
        <>
          {reviews.map((r) => (
            <View key={r.id} style={[styles.reviewItem, { borderTopColor: c.cardBorder }]}>
              <View style={styles.reviewAuthorRow}>
                <Text style={[styles.reviewAuthor, { color: c.foreground }]} numberOfLines={1}>
                  {reviewAuthorLabel(r)}
                </Text>
                <Text style={[styles.reviewDate, { color: c.foregroundMuted }]}>
                  {formatWhen(r.created_at)}
                </Text>
              </View>
              <View style={styles.reviewHead}>
                <RatingStars rating={r.rating} emptyColor={starEmpty} />
              </View>
              {r.comentario ? (
                <Text style={[styles.reviewBody, { color: c.foreground }]}>{r.comentario}</Text>
              ) : null}
              {Array.isArray(r.foto_urls) && r.foto_urls.length > 0 ? (
                <View style={styles.photoRow}>
                  {r.foto_urls.map((uri) => (
                    <TouchableOpacity
                      key={uri}
                      onPress={() => setLightboxUri(uri)}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityLabel="Ampliar foto de reseña"
                    >
                      <Image source={{ uri }} style={styles.reviewPhoto} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          ))}

          {clientUserId && canReview ? (
            formOpen ? (
              <View style={[styles.form, { borderTopColor: c.cardBorder }]}>
                <Text style={styles.formStep}>Tu calificación</Text>
                <RatingStars rating={rating} onPress={setRating} emptyColor={starEmpty} />
                <Text style={[styles.formStep, { marginTop: spacing.sm }]}>Comentario</Text>
                <TextInput
                  style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={comentario}
                  onChangeText={setComentario}
                  placeholder="Contanos tu experiencia con el producto"
                  placeholderTextColor={c.foregroundSubtle}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={[styles.formStep, { marginTop: spacing.sm }]}>Fotos (máx. 2)</Text>
                <View style={styles.photoPickRow}>
                  {fotos.map((uri, idx) => (
                    <View key={uri} style={styles.pickWrap}>
                      <Image source={{ uri }} style={styles.reviewPhoto} />
                      <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(idx)}>
                        <X size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {fotos.length < 2 ? (
                    <TouchableOpacity style={[styles.addPhoto, { borderColor: c.cardBorder }]} onPress={() => void pickPhoto()}>
                      <Camera size={20} color={c.foregroundMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <SalonButton
                  title={submitting ? 'Publicando…' : 'Publicar reseña'}
                  variant="heroGold"
                  fullWidth
                  disabled={submitting}
                  onPress={() => void submitReview()}
                />
                <SalonButton
                  title="Cancelar"
                  variant="outlineGray"
                  fullWidth
                  style={{ marginTop: spacing.sm }}
                  onPress={() => setFormOpen(false)}
                />
              </View>
            ) : (
              <SalonButton
                title="Escribir reseña"
                variant="outlineGold"
                fullWidth
                style={{ marginTop: spacing.md }}
                onPress={() => setFormOpen(true)}
              />
            )
          ) : clientUserId ? (
            <Text style={[subStyles.rowSub, { marginTop: spacing.sm }]}>
              Podés reseñar cuando recibas este producto en un pedido entregado.
            </Text>
          ) : null}
        </>
      )}
      <Modal
        visible={Boolean(lightboxUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxUri(null)}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setLightboxUri(null)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cerrar imagen"
          >
            <X size={28} color="#FFF" strokeWidth={2} />
          </TouchableOpacity>
          {lightboxUri ? (
            <Pressable onPress={(e) => e.stopPropagation?.()}>
              <Image
                source={{ uri: lightboxUri }}
                style={{ width: winW - spacing.lg * 2, height: winH * 0.72 }}
                resizeMode="contain"
              />
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    wrap: { marginTop: spacing.md },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    summaryTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    reviewItem: {
      paddingTop: spacing.md,
      marginTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    reviewAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    reviewAuthor: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    reviewHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    reviewDate: { fontFamily: typography.fontSans, fontSize: 12 },
    reviewBody: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      lineHeight: 21,
      marginTop: spacing.xs,
    },
    photoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    reviewPhoto: { width: 72, height: 72, borderRadius: radii.sm },
    form: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    formStep: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderRadius: radii.sm,
      padding: spacing.md,
      minHeight: 96,
      fontFamily: typography.fontSans,
      fontSize: 14,
    },
    photoPickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    pickWrap: { position: 'relative' },
    removePhoto: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPhoto: {
      width: 72,
      height: 72,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lightboxBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    lightboxClose: {
      position: 'absolute',
      top: spacing.xl + 8,
      right: spacing.lg,
      zIndex: 2,
    },
  });
}
