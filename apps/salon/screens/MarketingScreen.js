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
import { Image as ImageIcon, Play, Video as VideoIcon, X, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, uploadTendenciaMediaFromUri } from '@appsalon/shared-config';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { useListSelection } from '../hooks/useListSelection';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { SubScreenChrome, SalonButton, useSubStyles, modalScrollBottomPad } from '../components/luxury';
import { useSalonPullRefresh } from '../hooks/useSalonPullRefresh';
import { useTheme } from '../theme/ThemeProvider';

/** Máximo de diapositivas activas en el carrusel de inicio (App Clientes). */
const MAX_CAROUSEL_SLIDES = 15;

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

function parseCarouselOverlay(row) {
  const fallback = {
    kicker: 'Publicidad',
    headline: row?.title || 'Promoción',
    body: '',
    priceLabel: '',
    buttonTitle: 'Ver más',
  };
  const raw = String(row?.body || '').trim();
  if (!raw.startsWith('{')) return { ...fallback, body: raw };
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return fallback;
    return {
      kicker: o.kicker ? String(o.kicker) : fallback.kicker,
      headline: o.headline ? String(o.headline) : fallback.headline,
      body: o.body != null ? String(o.body) : '',
      priceLabel: o.priceLabel ? String(o.priceLabel) : '',
      buttonTitle: o.buttonTitle ? String(o.buttonTitle) : fallback.buttonTitle,
    };
  } catch {
    return { ...fallback, body: raw };
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
  const [heroPosts, setHeroPosts] = useState([]);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const sel = useListSelection();
  const [carouselPosts, setCarouselPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [heroOpen, setHeroOpen] = useState(false);
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

  const [heroAsset, setHeroAsset] = useState(null);
  const [heroKicker, setHeroKicker] = useState('Tu próxima experiencia');
  const [heroTitle, setHeroTitle] = useState('Reserva tu cita');
  const [heroBody, setHeroBody] = useState(
    'Descubre el arte de la belleza con nuestros estilistas expertos.',
  );
  const [heroCta, setHeroCta] = useState('Agendar ahora');

  const padBottom = modalScrollBottomPad(insets);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.marketingPosts.getAll();
      if (error) throw error;
      const all = data || [];
      const hero = all
        .filter((r) => String(r?.audience || '') === 'home_hero')
        .sort(
          (a, b) =>
            new Date(b.published_at || b.created_at).getTime() -
            new Date(a.published_at || b.created_at).getTime(),
        );
      setHeroPosts(hero);
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
          const aud = String(row?.audience || '');
          if (aud === 'home_carousel' || aud === 'home_hero') return false;
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
      setHeroPosts([]);
      setCarouselPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const { refreshControl } = useSalonPullRefresh(loadPosts);

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

  const closeHeroComposer = () => {
    setHeroOpen(false);
    setHeroAsset(null);
    setHeroKicker('Tu próxima experiencia');
    setHeroTitle('Reserva tu cita');
    setHeroBody('Descubre el arte de la belleza con nuestros estilistas expertos.');
    setHeroCta('Agendar ahora');
  };

  const openHeroPicker = async () => {
    const publishedCount = heroPosts.filter((p) => String(p.status || '') === 'published').length;
    if (publishedCount >= MAX_CAROUSEL_SLIDES) {
      Alert.alert(
        'Límite del carrusel',
        `Ya hay ${MAX_CAROUSEL_SLIDES} diapositivas en «Reserva tu cita». Eliminá una para subir otra.`,
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Necesitamos acceso a la galería para subir la imagen del carrusel.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.88,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setHeroAsset(res.assets[0]);
    setHeroKicker('Tu próxima experiencia');
    setHeroTitle('Reserva tu cita');
    setHeroBody('Descubre el arte de la belleza con nuestros estilistas expertos.');
    setHeroCta('Agendar ahora');
    setHeroOpen(true);
  };

  const confirmHeroPublish = async () => {
    if (!heroAsset?.uri) return;
    const publishedCount = heroPosts.filter((p) => String(p.status || '') === 'published').length;
    if (publishedCount >= MAX_CAROUSEL_SLIDES) {
      Alert.alert('Límite', `Máximo ${MAX_CAROUSEL_SLIDES} diapositivas en el carrusel hero.`);
      return;
    }
    const headline = heroTitle.trim() || 'Reserva tu cita';
    const overlay = {
      kicker: heroKicker.trim() || 'Tu próxima experiencia',
      headline,
      body: heroBody.trim() || ' ',
      buttonTitle: heroCta.trim() || 'Agendar ahora',
    };
    const bodyJson = JSON.stringify(overlay);
    setSaving(true);
    try {
      const ext = guessExtension(heroAsset.uri, heroAsset.mimeType, 'image');
      const { publicUrl, error: upErr } = await uploadTendenciaMediaFromUri(heroAsset.uri, {
        extension: ext,
        contentType: heroAsset.mimeType || 'image/jpeg',
      });
      if (upErr) {
        Alert.alert('No se pudo subir', upErr.message || 'Error de Storage');
        return;
      }
      const payload = {
        title: headline.slice(0, 200),
        body: bodyJson,
        media_url: publicUrl,
        content_type: 'image',
        status: 'published',
        visibility: 'public',
        audience: 'home_hero',
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
      Alert.alert('Listo', 'Aparece en el carrusel «Reserva tu cita» arriba en Inicio (App Clientes).');
      closeHeroComposer();
      await loadPosts();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const openCarouselPicker = async () => {
    const publishedCount = carouselPosts.filter((p) => String(p.status || '') === 'published').length;
    if (publishedCount >= MAX_CAROUSEL_SLIDES) {
      Alert.alert(
        'Límite del carrusel',
        `Ya hay ${MAX_CAROUSEL_SLIDES} diapositivas publicadas. Eliminá una para subir otra.`,
      );
      return;
    }
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
    const publishedCount = carouselPosts.filter((p) => String(p.status || '') === 'published').length;
    if (publishedCount >= MAX_CAROUSEL_SLIDES) {
      Alert.alert(
        'Límite del carrusel',
        `Máximo ${MAX_CAROUSEL_SLIDES} diapositivas en el carrusel de inicio.`,
      );
      return;
    }
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
      Alert.alert('Listo', 'La diapositiva aparece en el carrusel de inicio en App Clientes (hasta 15 publicaciones).');
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

  const allMarketingPosts = useMemo(
    () => [...heroPosts, ...carouselPosts, ...posts],
    [heroPosts, carouselPosts, posts],
  );

  const removePostFromState = (row) => {
    const aud = String(row?.audience || '');
    if (aud === 'home_hero') setHeroPosts((prev) => prev.filter((p) => p.id !== row.id));
    else if (aud === 'home_carousel') setCarouselPosts((prev) => prev.filter((p) => p.id !== row.id));
    else setPosts((prev) => prev.filter((p) => p.id !== row.id));
  };

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar contenido',
      `¿Eliminar ${sel.count} publicación(es)? Copia en Basurero antes del borrado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            let ok = 0;
            const errs = [];
            for (const id of sel.selectedIds) {
              const row = allMarketingPosts.find((p) => String(p.id) === String(id));
              if (!row) continue;
              const r = await deleteRowWithBasurero('marketing_posts', row, () => db.marketingPosts.delete(row.id));
              if (r.ok) {
                ok += 1;
                removePostFromState(row);
              } else errs.push(r.error);
            }
            sel.exitSelectMode();
            setDeleteBusy(false);
            if (errs.length) Alert.alert('Parcial', `Eliminados: ${ok}. Fallos: ${errs.length}.`);
            else Alert.alert('Listo', ok === 1 ? 'Contenido eliminado.' : `Se eliminaron ${ok}.`);
          },
        },
      ],
    );
  };

  const wrapCardPress = (row, children) => {
    const picked = sel.isSelected(row.id);
    const inner = (
      <View
        style={[
          styles.card,
          { borderColor: c.cardBorder, backgroundColor: c.card },
          picked && { borderColor: c.primary, backgroundColor: c.surfaceMuted },
        ]}
      >
        {sel.active ? (
          <View
            style={[
              styles.cardCheck,
              {
                borderColor: picked ? c.primary : c.cardBorder,
                backgroundColor: picked ? c.primary : 'transparent',
              },
            ]}
          >
            {picked ? <Check size={12} color={isDark ? '#141414' : '#fff'} strokeWidth={3} /> : null}
          </View>
        ) : null}
        {children}
      </View>
    );
    if (!sel.active) {
      return (
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={() => {
            sel.setActive(true);
            sel.toggleId(row.id);
          }}
        >
          {inner}
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => sel.toggleId(row.id)}
        onLongPress={() => sel.toggleId(row.id)}
      >
        {inner}
      </TouchableOpacity>
    );
  };

  const renderHeroRow = ({ item }) => {
    const when = item.published_at || item.created_at;
    const overlay = parseCarouselOverlay(item);
    return wrapCardPress(
      item,
      <>
        <MarketingMediaThumb
          uri={item.media_url}
          contentType="image"
          placeholderBg={c.surfaceMuted}
          iconColor={c.foregroundMuted}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.cardTypeBadge, { color: c.primary }]}>Hero · Reserva tu cita</Text>
          <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>
            {overlay.headline}
          </Text>
          <Text style={[subStyles.muted, styles.cardDesc]} numberOfLines={2}>
            {overlay.kicker}
            {overlay.body?.trim() ? ` — ${overlay.body.trim()}` : ''}
          </Text>
          <Text style={[subStyles.muted, styles.cardMeta]} numberOfLines={1}>
            CTA: {overlay.buttonTitle || 'Agendar ahora'} · {formatPostDate(when)}
          </Text>
        </View>
      </>,
    );
  };

  const renderCarouselRow = ({ item }) => {
    const when = item.published_at || item.created_at;
    const overlay = parseCarouselOverlay(item);
    return wrapCardPress(
      item,
      <>
        <MarketingMediaThumb
          uri={item.media_url}
          contentType="image"
          placeholderBg={c.surfaceMuted}
          iconColor={c.foregroundMuted}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.cardTypeBadge, { color: c.primary }]}>Carrusel · Publicidad</Text>
          <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>
            {overlay.headline}
          </Text>
          <Text style={[subStyles.muted, styles.cardDesc]} numberOfLines={2}>
            {overlay.kicker}
            {overlay.priceLabel ? ` · ${overlay.priceLabel}` : ''}
            {overlay.body?.trim() ? ` — ${overlay.body.trim()}` : ''}
          </Text>
          <Text style={[subStyles.muted, styles.cardMeta]} numberOfLines={1}>
            CTA: {overlay.buttonTitle} · {formatPostDate(when)}
          </Text>
        </View>
      </>,
    );
  };

  const renderItem = ({ item }) => {
    const ct = String(item.content_type || '').toLowerCase();
    const url = String(item.media_url || '');
    let typeLabel = 'Media';
    if (ct === 'image' || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)) typeLabel = 'Foto';
    else if (ct === 'video' || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) typeLabel = 'Video';
    const when = item.published_at || item.created_at;
    return wrapCardPress(
      item,
      <>
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
      </>,
    );
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Marketing"
        subtitle="Carruseles de Inicio, Tendencias y Mensajes por interés del cliente."
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
            refreshControl={refreshControl}
          >
            <Text style={[subStyles.muted, styles.hint]}>{CAPACITY_HINT}</Text>
            <View style={styles.selectToolbar}>
              <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
              {sel.active ? (
                <Text style={[subStyles.muted, { fontSize: 12, flex: 1, marginLeft: spacing.sm }]}>
                  Tocá las tarjetas para marcarlas y eliminar en lote (copia en Basurero).
                </Text>
              ) : null}
            </View>

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

            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Carrusel · Reserva tu cita</Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm, fontSize: 12 }]}>
              Imágenes del banner superior en Inicio (hasta {MAX_CAROUSEL_SLIDES}). Botón «Agendar ahora» abre Mis citas.
            </Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm, fontSize: 12, fontFamily: typography.fontSansMedium }]}>
              {heroPosts.length}/{MAX_CAROUSEL_SLIDES} diapositivas hero
            </Text>
            <SalonButton
              title={
                heroPosts.length >= MAX_CAROUSEL_SLIDES
                  ? 'Hero completo (15/15)'
                  : 'Nueva imagen hero'
              }
              variant="outlineGray"
              fullWidth
              disabled={saving || heroPosts.length >= MAX_CAROUSEL_SLIDES}
              onPress={openHeroPicker}
              style={{ marginBottom: spacing.md }}
            />
            {loading ? null : heroPosts.length === 0 ? (
              <Text style={[subStyles.muted, { marginBottom: spacing.lg }]}>
                Sin imágenes hero; App Clientes usa fotos de ejemplo.
              </Text>
            ) : (
              heroPosts.map((item) => (
                <View key={`hero-${item.id}`}>{renderHeroRow({ item })}</View>
              ))
            )}

            <Text style={[styles.sectionTitle, { color: c.foreground, marginTop: spacing.sm }]}>
              Carrusel · Publicidad (bajo Pedidos)
            </Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm, fontSize: 12 }]}>
              Hasta {MAX_CAROUSEL_SLIDES} imágenes horizontales con titular, texto, precio y botón. Los clientes
              avisan su interés al tocar el botón; llega a Mensajes.
            </Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm, fontSize: 12, fontFamily: typography.fontSansMedium }]}>
              {carouselPosts.length}/{MAX_CAROUSEL_SLIDES} diapositivas publicadas
            </Text>
            <SalonButton
              title={
                carouselPosts.length >= MAX_CAROUSEL_SLIDES
                  ? 'Carrusel completo (15/15)'
                  : 'Nueva diapositiva carrusel'
              }
              variant="outlineGray"
              fullWidth
              disabled={saving || carouselPosts.length >= MAX_CAROUSEL_SLIDES}
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
        {sel.active && sel.count > 0 ? (
          <ListSelectionActionBar
            count={sel.count}
            onCancel={sel.exitSelectMode}
            onConfirm={confirmDeleteSelected}
            confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar'}
            confirmTextStyle={{ color: c.error }}
            confirmStyle={{ borderColor: c.error }}
            colors={c}
            bottomInset={insets.bottom}
          />
        ) : null}
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

      <Modal visible={heroOpen} animationType="slide" transparent onRequestClose={closeHeroComposer}>
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
                <Text style={[styles.modalTitle, { color: c.foreground }]}>Carrusel «Reserva tu cita»</Text>
                <TouchableOpacity onPress={closeHeroComposer} hitSlop={12}>
                  <X size={22} color={c.foregroundMuted} />
                </TouchableOpacity>
              </View>
              {heroAsset?.uri ? (
                <Image
                  source={{ uri: heroAsset.uri }}
                  style={{ width: '100%', height: 200, borderRadius: radii.md, marginBottom: spacing.md }}
                  resizeMode="cover"
                />
              ) : null}
              <View style={[styles.carouselPreview, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                <Text style={[styles.previewKicker, { color: c.primary }]}>
                  {(heroKicker.trim() || 'Tu próxima experiencia').toUpperCase()}
                </Text>
                <Text style={[styles.previewHeadline, { color: c.foreground }]}>
                  {heroTitle.trim() || 'Reserva tu cita'}
                </Text>
                <Text style={[subStyles.muted, { fontSize: 13, lineHeight: 18 }]}>
                  {heroBody.trim() || 'Texto bajo el titular en el banner.'}
                </Text>
                <Text style={[styles.previewCta, { color: c.primary }]}>{heroCta.trim() || 'Agendar ahora'}</Text>
              </View>
              <Text style={styles.fieldLbl}>Etiqueta superior (kicker)</Text>
              <TextInput
                style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Tu próxima experiencia"
                placeholderTextColor={c.foregroundSubtle}
                value={heroKicker}
                onChangeText={setHeroKicker}
                maxLength={40}
              />
              <Text style={styles.fieldLbl}>Titular</Text>
              <TextInput
                style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Reserva tu cita"
                placeholderTextColor={c.foregroundSubtle}
                value={heroTitle}
                onChangeText={setHeroTitle}
              />
              <Text style={styles.fieldLbl}>Texto</Text>
              <TextInput
                style={[styles.input, styles.textArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Descripción breve"
                placeholderTextColor={c.foregroundSubtle}
                value={heroBody}
                onChangeText={setHeroBody}
                multiline
              />
              <Text style={styles.fieldLbl}>Texto del botón</Text>
              <TextInput
                style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Agendar ahora"
                placeholderTextColor={c.foregroundSubtle}
                value={heroCta}
                onChangeText={setHeroCta}
              />
              <SalonButton
                title={saving ? 'Publicando…' : 'Subir y publicar en hero'}
                variant="heroGold"
                fullWidth
                disabled={saving || !heroAsset?.uri}
                onPress={confirmHeroPublish}
              />
              <SalonButton
                title="Cancelar"
                variant="outlineGray"
                fullWidth
                style={{ marginTop: spacing.sm }}
                disabled={saving}
                onPress={closeHeroComposer}
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
              <View style={[styles.carouselPreview, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                <Text style={[styles.previewKicker, { color: c.primary }]}>
                  {(carTipo.trim() || 'Publicidad').toUpperCase()}
                </Text>
                <Text style={[styles.previewHeadline, { color: c.foreground }]}>
                  {carTitle.trim() || 'Titular de la promo'}
                </Text>
                <Text style={[subStyles.muted, { fontSize: 13, lineHeight: 18 }]}>
                  {carBody.trim() || 'Texto breve que verá el cliente sobre la imagen.'}
                </Text>
                {carPrice.trim() ? (
                  <Text style={[styles.previewPrice, { color: c.foreground }]}>{carPrice.trim()}</Text>
                ) : null}
                <Text style={[styles.previewCta, { color: c.primary }]}>{carCta.trim() || 'Ver más'}</Text>
              </View>
              <Text style={styles.fieldLbl}>Etiqueta superior (kicker)</Text>
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
    selectToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      position: 'relative',
    },
    cardCheck: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
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
    carouselPreview: {
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 4,
    },
    previewKicker: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 1.5,
    },
    previewHeadline: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      lineHeight: 24,
    },
    previewPrice: {
      fontFamily: typography.fontDisplayRegular,
      fontSize: 18,
      marginTop: spacing.xs,
    },
    previewCta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginTop: spacing.sm,
    },
  });
}
