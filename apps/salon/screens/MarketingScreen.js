import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image as ImageIcon, Play, Trash2, Video as VideoIcon, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, uploadTendenciaMediaFromUri } from '@appsalon/shared-config';
import { recordSalonDeletion } from '../services/salonBasurero';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

/** Máximo de duración de video en Tendencias (picker iOS + validación cruzada). */
const MAX_VIDEO_SECONDS = 50;

/** Recomendación práctica para staff (no es límite técnico del código). */
const CAPACITY_HINT =
  'Recomendación: fotos hasta ~8 MB c/u; videos hasta 50 s (≈20–40 MB en 720p). No superar ~50 MB por archivo al subir. En Supabase Storage creá el bucket público `tendencias` y un límite de objeto (p. ej. 100 MB) según tu plan.';

function guessExtension(uri, mimeType, kind) {
  if (mimeType?.includes('jpeg')) return 'jpg';
  if (mimeType?.includes('jpg')) return 'jpg';
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('mp4')) return 'mp4';
  if (mimeType?.includes('quicktime')) return 'mov';
  if (mimeType?.includes('webm')) return 'webm';
  const u = String(uri || '');
  const m = u.match(/\.([a-z0-9]+)(\?|$)/i);
  if (m) return m[1].toLowerCase();
  return kind === 'video' ? 'mp4' : 'jpg';
}

function videoDurationSeconds(asset) {
  const d = asset?.duration;
  if (d == null || !Number.isFinite(d)) return null;
  if (d > 600) return d / 1000;
  return d;
}

function isTendenciasMediaPost(row) {
  const u = row?.media_url;
  if (!u || typeof u !== 'string') return false;
  const ct = String(row?.content_type || '').toLowerCase();
  if (ct === 'image' || ct === 'video') return true;
  return /\.(jpe?g|png|gif|webp|mp4|mov|webm|m4v)(\?|$)/i.test(u);
}

function formatPostDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

const stylesStatic = StyleSheet.create({
  thumbWrap: {
    width: 72,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  thumb: {
    width: 72,
    height: 96,
    backgroundColor: '#111',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8E8',
  },
  playBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    padding: 4,
  },
});

/** Miniatura de video (primer frame visible, sin reproducción). */
function MarketingVideoThumb({ uri, style }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = false;
    p.showNowPlayingNotification = false;
    p.pause();
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
    />
  );
}

function MarketingMediaThumb({ uri, contentType, placeholderBg, iconColor }) {
  const ct = String(contentType || '').toLowerCase();
  const u = String(uri || '');
  const isVideo =
    ct === 'video' || (!ct && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u)) || (ct !== 'image' && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u));
  const isImage = ct === 'image' || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(u);
  if (!uri) {
    return (
      <View style={[stylesStatic.thumb, stylesStatic.thumbPlaceholder, placeholderBg && { backgroundColor: placeholderBg }]}>
        <VideoIcon size={28} color={iconColor || '#888'} />
      </View>
    );
  }
  if (isVideo) {
    return (
      <View style={stylesStatic.thumbWrap}>
        <MarketingVideoThumb uri={u} style={stylesStatic.thumb} />
        <View style={stylesStatic.playBadge}>
          <Play size={14} color="#FFF" fill="#FFF" />
        </View>
      </View>
    );
  }
  if (isImage) {
    return (
      <View style={stylesStatic.thumbWrap}>
        <Image source={{ uri }} style={stylesStatic.thumb} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={[stylesStatic.thumb, stylesStatic.thumbPlaceholder, placeholderBg && { backgroundColor: placeholderBg }]}>
      <VideoIcon size={28} color={iconColor || '#888'} />
    </View>
  );
}

export function MarketingScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);
  const modalMaxHeight = Math.round(windowHeight * 0.88);

  const [posts, setPosts] = useState([]);
  const [carouselPosts, setCarouselPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [pendingKind, setPendingKind] = useState(null);
  const [pendingAsset, setPendingAsset] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');

  const [carAsset, setCarAsset] = useState(null);
  const [carTipo, setCarTipo] = useState('Publicidad');
  const [carTitle, setCarTitle] = useState('');
  const [carBody, setCarBody] = useState('');
  const [carPrice, setCarPrice] = useState('');
  const [carCta, setCarCta] = useState('Ver más');

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.marketingPosts.getAll();
      if (error) throw error;
      const all = data || [];
      const car = all
        .filter((r) => String(r?.audience || '') === 'home_carousel')
        .sort(
          (a, b) =>
            new Date(b.published_at || b.created_at).getTime() -
            new Date(a.published_at || a.created_at).getTime(),
        );
      setCarouselPosts(car);
      const list = all
        .filter((row) => {
          if (String(row?.audience || '') === 'home_carousel') return false;
          return isTendenciasMediaPost(row);
        })
        .sort((a, b) => {
          const ta = new Date(b.published_at || b.created_at).getTime();
          const tb = new Date(a.published_at || a.created_at).getTime();
          return ta - tb;
        });
      setPosts(list);
    } catch (e) {
      Alert.alert('Marketing', e?.message || 'No se pudieron cargar los contenidos.');
      setPosts([]);
      setCarouselPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const openPicker = async (kind) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Necesitamos acceso a la galería para subir fotos o videos.');
      return;
    }

    if (kind === 'image') {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setPendingKind('image');
      setPendingAsset(res.assets[0]);
      setTitle('');
      setCaption('');
      setComposerOpen(true);
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      videoMaxDuration: MAX_VIDEO_SECONDS,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const sec = videoDurationSeconds(asset);
    if (sec != null && sec > MAX_VIDEO_SECONDS + 0.5) {
      Alert.alert(
        'Video demasiado largo',
        `El video supera ${MAX_VIDEO_SECONDS} segundos. Elegí uno más corto.`,
      );
      return;
    }
    setPendingKind('video');
    setPendingAsset(asset);
    setTitle('');
    setCaption('');
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setPendingAsset(null);
    setPendingKind(null);
    setTitle('');
    setCaption('');
  };

  const closeCarouselComposer = () => {
    setCarouselOpen(false);
    setCarAsset(null);
    setCarTipo('Publicidad');
    setCarTitle('');
    setCarBody('');
    setCarPrice('');
    setCarCta('Ver más');
  };

  const openCarouselPicker = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Necesitamos acceso a la galería para subir la imagen del carrusel.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.88,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setCarAsset(res.assets[0]);
    setCarTipo('Publicidad');
    setCarTitle('');
    setCarBody('');
    setCarPrice('');
    setCarCta('Ver más');
    setCarouselOpen(true);
  };

  const confirmCarouselPublish = async () => {
    if (!carAsset?.uri) return;
    const headline = carTitle.trim() || 'Promoción';
    const overlay = {
      kicker: carTipo.trim() || 'Publicidad',
      headline,
      body: carBody.trim() || ' ',
      priceLabel: carPrice.trim() || undefined,
      buttonTitle: carCta.trim() || 'Ver más',
    };
    const bodyJson = JSON.stringify(overlay);
    setSaving(true);
    try {
      const ext = guessExtension(carAsset.uri, carAsset.mimeType, 'image');
      const { publicUrl, error: upErr } = await uploadTendenciaMediaFromUri(carAsset.uri, {
        extension: ext,
        contentType: carAsset.mimeType || 'image/jpeg',
      });
      if (upErr) {
        Alert.alert(
          'No se pudo subir',
          `${upErr.message || 'Error de Storage'}\n\nUsá el bucket "tendencias" en Supabase Storage.`,
        );
        return;
      }
      const payload = {
        title: headline.slice(0, 200),
        body: bodyJson,
        media_url: publicUrl,
        content_type: 'image',
        status: 'published',
        visibility: 'public',
        audience: 'home_carousel',
        published_at: new Date().toISOString(),
      };
      const { data: created, error: crErr } = await db.marketingPosts.create(payload);
      if (crErr) {
        Alert.alert('Base de datos', crErr.message || 'No se pudo crear la diapositiva.');
        return;
      }
      if (created?.id && created.status !== 'published') {
        await db.marketingPosts.publish(created.id);
      }
      Alert.alert('Listo', 'La diapositiva aparece en el carrusel Publicidad bajo Pedidos (App Clientes).');
      closeCarouselComposer();
      await loadPosts();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const confirmPublish = async () => {
    if (!pendingAsset?.uri || !pendingKind) return;
    const t = title.trim() || (pendingKind === 'video' ? 'Video Tendencias' : 'Foto Tendencias');
    const bodyText = caption.trim() || ' ';
    setSaving(true);
    try {
      const ext = guessExtension(pendingAsset.uri, pendingAsset.mimeType, pendingKind);
      const { publicUrl, error: upErr } = await uploadTendenciaMediaFromUri(pendingAsset.uri, {
        extension: ext,
        contentType: pendingAsset.mimeType || (pendingKind === 'video' ? 'video/mp4' : 'image/jpeg'),
      });
      if (upErr) {
        Alert.alert(
          'No se pudo subir',
          `${upErr.message || 'Error de Storage'}\n\nCreá el bucket "tendencias" en Supabase Storage y políticas de subida para staff.`,
        );
        return;
      }

      const payload = {
        title: t,
        body: bodyText,
        media_url: publicUrl,
        content_type: pendingKind,
        status: 'published',
        visibility: 'public',
        audience: 'public',
        published_at: new Date().toISOString(),
      };

      const { data: created, error: crErr } = await db.marketingPosts.create(payload);
      if (crErr) {
        Alert.alert(
          'Base de datos',
          `${crErr.message || 'No se pudo crear el post'}\n\nVerificá que la tabla marketing_posts tenga columnas media_url y content_type.`,
        );
        return;
      }
      if (created?.id && created.status !== 'published') {
        await db.marketingPosts.publish(created.id);
      }
      Alert.alert('Listo', 'El contenido quedó publicado y aparecerá en Tendencias (App Clientes).');
      closeComposer();
      await loadPosts();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (row) => {
    const isCar = String(row?.audience || '') === 'home_carousel';
    Alert.alert('Eliminar', isCar ? '¿Quitar esta diapositiva del carrusel inicio?' : '¿Quitar este contenido de Tendencias?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const snapshot = { ...row };
          const { error } = await db.marketingPosts.delete(row.id);
          if (error) {
            Alert.alert('Error', error.message || 'No se pudo eliminar');
            return;
          }
          await recordSalonDeletion({
            source: 'marketing_posts',
            title: row.title || (isCar ? 'Carrusel inicio' : 'Post Tendencias'),
            summary: `${String(row.content_type || 'media')} · ID ${row.id}`,
            snapshot,
          });
          if (isCar) setCarouselPosts((prev) => prev.filter((p) => p.id !== row.id));
          else setPosts((prev) => prev.filter((p) => p.id !== row.id));
        },
      },
    ]);
  };

  const renderCarouselRow = ({ item }) => {
    const when = item.published_at || item.created_at;
    return (
      <View style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
        <MarketingMediaThumb
          uri={item.media_url}
          contentType="image"
          placeholderBg={c.surfaceMuted}
          iconColor={c.foregroundMuted}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.cardTypeBadge, { color: c.primary }]}>Carrusel · Inicio clientes</Text>
          <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>
            {item.title || 'Sin título'}
          </Text>
          <Text style={[subStyles.muted, styles.cardMeta]} numberOfLines={2}>
            Publicado: {formatPostDate(when)} · Estado: {String(item.status || '—')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: c.cardBorder }]}
          onPress={() => confirmDelete(item)}
          accessibilityLabel="Eliminar diapositiva"
        >
          <Trash2 size={18} color={c.foregroundMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const ct = String(item.content_type || '').toLowerCase();
    const url = String(item.media_url || '');
    let typeLabel = 'Media';
    if (ct === 'image' || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)) typeLabel = 'Foto';
    else if (ct === 'video' || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) typeLabel = 'Video';
    const when = item.published_at || item.created_at;
    return (
      <View style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
        <MarketingMediaThumb
          uri={item.media_url}
          contentType={item.content_type}
          placeholderBg={c.surfaceMuted}
          iconColor={c.foregroundMuted}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.cardTypeBadge, { color: c.primary }]}>
            {typeLabel} · Tendencias
          </Text>
          <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>
            {item.title || 'Sin título'}
          </Text>
          <Text style={[subStyles.muted, styles.cardDesc]} numberOfLines={2}>
            {(item.body || '').trim() || 'Sin descripción'}
          </Text>
          <Text style={[subStyles.muted, styles.cardMeta]} numberOfLines={2}>
            Publicado: {formatPostDate(when)} · Estado: {String(item.status || '—')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: c.cardBorder }]}
          onPress={() => confirmDelete(item)}
          accessibilityLabel="Eliminar"
        >
          <Trash2 size={18} color={c.foregroundMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Marketing"
        subtitle="Tendencias (foto/video) y carrusel Publicidad bajo Pedidos en App Clientes."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
      >
        <View style={styles.body}>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: padBottom }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[subStyles.muted, styles.hint]}>{CAPACITY_HINT}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.pickBtn, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                onPress={() => openPicker('image')}
              >
                <ImageIcon size={20} color={c.primary} />
                <Text style={[styles.pickBtnTxt, { color: c.foreground }]}>Subir foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickBtn, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                onPress={() => openPicker('video')}
              >
                <VideoIcon size={20} color={c.primary} />
                <Text style={[styles.pickBtnTxt, { color: c.foreground }]}>Subir video</Text>
              </TouchableOpacity>
            </View>
            <Text style={[subStyles.muted, styles.subHint]}>
              Videos: máximo {MAX_VIDEO_SECONDS} s (iOS respeta límite en selector; en Android validamos si el dato viene de la galería).
            </Text>

            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Carrusel · publicidad inicio</Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm, fontSize: 12 }]}>
              Imágenes horizontales que rotan debajo de «Pedidos» en Inicio (App Clientes).
            </Text>
            <SalonButton
              title="Nueva diapositiva carrusel"
              variant="outlineGray"
              fullWidth
              disabled={saving}
              onPress={openCarouselPicker}
              style={{ marginBottom: spacing.md }}
            />
            {loading ? null : carouselPosts.length === 0 ? (
              <Text style={[subStyles.muted, { marginBottom: spacing.lg }]}>
                Aún no hay diapositivas del carrusel.
              </Text>
            ) : (
              carouselPosts.map((item) => (
                <View key={`car-${item.id}`}>{renderCarouselRow({ item })}</View>
              ))
            )}

            <Text style={[styles.sectionTitle, { color: c.foreground, marginTop: spacing.sm }]}>
              Feed Tendencias
            </Text>

            {loading ? (
              <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
            ) : posts.length === 0 ? (
              <Text style={[subStyles.muted, { marginTop: spacing.md }]}>
                No hay contenidos multimedia de marketing aún. Subí una foto o un video.
              </Text>
            ) : (
              posts.map((item) => (
                <View key={String(item.id)}>{renderItem({ item })}</View>
              ))
            )}
          </ScrollView>
        </View>
      </SubScreenChrome>

      <Modal visible={composerOpen} animationType="slide" transparent onRequestClose={closeComposer}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: c.background, maxHeight: modalMaxHeight },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: modalMaxHeight }}
              contentContainerStyle={[
                styles.modalScrollContent,
                { paddingBottom: padBottom },
              ]}
              showsVerticalScrollIndicator
            >
              <View style={styles.modalHead}>
                <Text style={[styles.modalTitle, { color: c.foreground }]}>
                  {pendingKind === 'video' ? 'Publicar video' : 'Publicar foto'}
                </Text>
                <TouchableOpacity onPress={closeComposer} hitSlop={12}>
                  <X size={22} color={c.foregroundMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldLbl}>Título</Text>
              <TextInput
                style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ej. Balayage temporada"
                placeholderTextColor={c.foregroundSubtle}
                value={title}
                onChangeText={setTitle}
              />
              <Text style={styles.fieldLbl}>Descripción (Tendencias)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Texto que verán los clientes debajo del contenido"
                placeholderTextColor={c.foregroundSubtle}
                value={caption}
                onChangeText={setCaption}
                multiline
              />
              <SalonButton
                title={saving ? 'Publicando…' : 'Subir y publicar en Tendencias'}
                variant="heroGold"
                fullWidth
                disabled={saving}
                onPress={confirmPublish}
              />
              <SalonButton
                title="Cancelar"
                variant="outlineGray"
                fullWidth
                style={{ marginTop: spacing.sm }}
                disabled={saving}
                onPress={closeComposer}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={carouselOpen} animationType="slide" transparent onRequestClose={closeCarouselComposer}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: c.background, maxHeight: modalMaxHeight },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: modalMaxHeight }}
              contentContainerStyle={[
                styles.modalScrollContent,
                { paddingBottom: padBottom },
              ]}
              showsVerticalScrollIndicator
            >
              <View style={styles.modalHead}>
                <Text style={[styles.modalTitle, { color: c.foreground }]}>Publicar en carrusel inicio</Text>
                <TouchableOpacity onPress={closeCarouselComposer} hitSlop={12}>
                  <X size={22} color={c.foregroundMuted} />
                </TouchableOpacity>
              </View>
              {carAsset?.uri ? (
                <Image
                  source={{ uri: carAsset.uri }}
                  style={{ width: '100%', height: 160, borderRadius: radii.md, marginBottom: spacing.md }}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.fieldLbl}>Tipo</Text>
              <TextInput
                style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ej. Publicidad, Nuevo, Promo"
                placeholderTextColor={c.foregroundSubtle}
                value={carTipo}
                onChangeText={setCarTipo}
                maxLength={32}
              />
              <Text style={styles.fieldLbl}>Título / titular</Text>
              <TextInput
                style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ej. 20% en coloración"
                placeholderTextColor={c.foregroundSubtle}
                value={carTitle}
                onChangeText={setCarTitle}
              />
              <Text style={styles.fieldLbl}>Texto</Text>
              <TextInput
                style={[styles.input, styles.textArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Descripción breve en el overlay"
                placeholderTextColor={c.foregroundSubtle}
                value={carBody}
                onChangeText={setCarBody}
                multiline
              />
              <Text style={styles.fieldLbl}>Etiqueta de precio (opcional)</Text>
              <TextInput
                style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ej. Desde Q150"
                placeholderTextColor={c.foregroundSubtle}
                value={carPrice}
                onChangeText={setCarPrice}
              />
              <Text style={styles.fieldLbl}>Texto del botón</Text>
              <TextInput
                style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ver más"
                placeholderTextColor={c.foregroundSubtle}
                value={carCta}
                onChangeText={setCarCta}
              />
              <SalonButton
                title={saving ? 'Publicando…' : 'Subir y publicar en carrusel'}
                variant="heroGold"
                fullWidth
                disabled={saving || !carAsset?.uri}
                onPress={confirmCarouselPublish}
              />
              <SalonButton
                title="Cancelar"
                variant="outlineGray"
                fullWidth
                style={{ marginTop: spacing.sm }}
                disabled={saving}
                onPress={closeCarouselComposer}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    body: { flex: 1, paddingTop: spacing.xs },
    hint: { marginBottom: spacing.md, lineHeight: 20, fontSize: 13 },
    subHint: { marginBottom: spacing.md, fontSize: 12 },
    sectionTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      marginBottom: spacing.xs,
    },
    actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
    pickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingVertical: spacing.md,
    },
    pickBtnTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    cardTypeBadge: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    cardTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      marginBottom: 4,
    },
    cardDesc: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 4,
    },
    cardMeta: {
      fontSize: 11,
      lineHeight: 16,
    },
    iconBtn: {
      padding: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      marginTop: 2,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    modalCard: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      alignSelf: 'stretch',
    },
    modalScrollContent: {
      padding: spacing.lg,
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
      marginBottom: spacing.md,
      fontFamily: typography.fontSans,
      fontSize: 15,
    },
    textArea: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
  });
}
