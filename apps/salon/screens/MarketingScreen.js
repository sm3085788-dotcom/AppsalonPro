import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Image as ImageIcon,
  Play,
  Video as VideoIcon,
  X,
  Check,
  Bell,
  Heart,
  MessageCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  db,
  supabase,
  uploadTendenciaMediaFromUri,
  fetchMarketingEngagementSince,
  fetchMarketingEngagementFeed,
  buildTendenciasPublicationMap,
} from '@appsalon/shared-config';
import { ImportCarouselModal } from '../components/marketing/ImportCarouselModal';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { useListSelection } from '../hooks/useListSelection';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { SubScreenChrome, SalonButton, useSubStyles, modalScrollBottomPad } from '../components/luxury';
import { useSalonPullRefresh } from '../hooks/useSalonPullRefresh';
import { useTheme } from '../theme/ThemeProvider';

/** Máximo de diapositivas activas en el carrusel de inicio (App Clientes). */
const MAX_CAROUSEL_SLIDES = 15;

/** Máximo de publicaciones activas en el feed Tendencias (App Clientes). */
const MAX_TENDENCIAS_POSTS = 30;

const SALON_MARKETING_ENGAGEMENT_LAST_SEEN_KEY = '@appsalon/salon/marketing_engagement_last_seen_at';

function formatEngagementWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Máximo de duración de video en Tendencias (picker iOS + validación cruzada). */
const MAX_VIDEO_SECONDS = 50;

/** Recomendación práctica para staff (no es límite técnico del código). */
const CAPACITY_HINT =
  'Recomendación: fotos hasta ~8 MB c/u; videos hasta 50 s (≈20–40 MB en 720p). No superar ~50 MB por archivo al subir.';

/** Portada recomendada del carrusel Inicio (hero) en App Clientes. */
const HERO_IMAGE_SIZE = '626 × 417 px';
const HERO_IMAGE_ASPECT = [626, 417];

/** Tamaños recomendados por destino para no romper la calidad en la app. */
const CONTENT_SIZES = [
  { dest: 'Tendencias (feed vertical)', size: '1080 × 1920 px', ratio: '9:16', hint: 'Foto o video vertical. Mín. 720p.' },
  {
    dest: 'Carrusel Inicio (hero)',
    size: HERO_IMAGE_SIZE,
    ratio: '626:417',
    hint: 'Foto horizontal. Importá producto o servicio desde Inventario.',
  },
];

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

export function MarketingScreen({ onBack, onEngagementSeen }) {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [heroOpen, setHeroOpen] = useState(false);
  const [pendingKind, setPendingKind] = useState(null);
  const [pendingAsset, setPendingAsset] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');

  const [importServOpen, setImportServOpen] = useState(false);
  const [importServCta, setImportServCta] = useState('');

  const [engagementAlerts, setEngagementAlerts] = useState([]);
  const [engagementFeed, setEngagementFeed] = useState([]);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const engagementLastSeenRef = useRef('');

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
        .filter((r) => {
          const aud = String(r?.audience || '');
          return aud === 'home_hero' || aud === 'home_carousel';
        })
        .sort(
          (a, b) =>
            new Date(b.published_at || b.created_at).getTime() -
            new Date(a.published_at || b.created_at).getTime(),
        );
      setHeroPosts(hero);
      const pubMap = buildTendenciasPublicationMap(all);
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
        })
        .map((row) => ({
          ...row,
          tendencias_no: pubMap.get(Number(row.id)) ?? null,
        }));
      setPosts(list);
    } catch (e) {
      Alert.alert('Marketing', e?.message || 'No se pudieron cargar los contenidos.');
      setPosts([]);
      setHeroPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEngagementFeed = useCallback(async () => {
    const { data, error } = await fetchMarketingEngagementFeed();
    if (!error) setEngagementFeed(data || []);
  }, []);

  const refreshEngagementAlerts = useCallback(async () => {
    try {
      const lastSeen =
        engagementLastSeenRef.current ||
        (await AsyncStorage.getItem(SALON_MARKETING_ENGAGEMENT_LAST_SEEN_KEY)) ||
        '';
      engagementLastSeenRef.current = lastSeen;
      const since = lastSeen || new Date(0).toISOString();
      const { data, error } = await fetchMarketingEngagementSince(since);
      if (error) return;
      setEngagementAlerts(data || []);
    } catch {
      // noop
    }
  }, []);

  const openEngagementAlerts = useCallback(async () => {
    setEngagementOpen(true);
    setEngagementLoading(true);
    try {
      await loadEngagementFeed();
    } finally {
      setEngagementLoading(false);
    }
  }, [loadEngagementFeed]);

  const closeEngagementAlerts = useCallback(async () => {
    setEngagementOpen(false);
    const nowIso = new Date().toISOString();
    await AsyncStorage.setItem(SALON_MARKETING_ENGAGEMENT_LAST_SEEN_KEY, nowIso);
    engagementLastSeenRef.current = nowIso;
    setEngagementAlerts([]);
    onEngagementSeen?.();
  }, [onEngagementSeen]);

  useEffect(() => {
    loadPosts();
    void refreshEngagementAlerts();
  }, [loadPosts, refreshEngagementAlerts]);

  useEffect(() => {
    const channel = supabase
      .channel('salon-marketing-engagement')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketing_comments' },
        () => void refreshEngagementAlerts(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketing_post_likes' },
        () => void refreshEngagementAlerts(),
      )
      .subscribe();
    const iv = setInterval(() => void refreshEngagementAlerts(), 45000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(iv);
    };
  }, [refreshEngagementAlerts]);

  const hasEngagementAlert = engagementAlerts.length > 0;

  const renderEngagementBell = useCallback(
    (onPress) => (
      <TouchableOpacity
        style={[styles.engagementBellBtn, hasEngagementAlert && styles.engagementBellActive]}
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={
          hasEngagementAlert
            ? `Actividad en Tendencias, ${engagementAlerts.length} nueva${engagementAlerts.length === 1 ? '' : 's'}`
            : 'Actividad en Tendencias'
        }
      >
        <Bell size={22} color={c.foreground} strokeWidth={2} />
        {hasEngagementAlert ? (
          <View style={[styles.engagementBellAlertDot, { backgroundColor: '#E53935', borderColor: c.card }]}>
            <Bell size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.2} />
          </View>
        ) : null}
      </TouchableOpacity>
    ),
    [c.card, c.foreground, engagementAlerts.length, hasEngagementAlert, styles],
  );

  const engagementBell = useMemo(
    () => renderEngagementBell(() => void openEngagementAlerts()),
    [openEngagementAlerts, renderEngagementBell],
  );

  const { refreshControl } = useSalonPullRefresh(async () => {
    await loadPosts();
    await refreshEngagementAlerts();
  });

  const tendenciasPublishedCount = useCallback(
    () => posts.filter((p) => String(p.status || '') === 'published').length,
    [posts],
  );

  const openPicker = async (kind) => {
    if (tendenciasPublishedCount() >= MAX_TENDENCIAS_POSTS) {
      Alert.alert(
        'Límite de Tendencias',
        `Ya hay ${MAX_TENDENCIAS_POSTS} publicaciones en el feed. Eliminá una para subir otra.`,
      );
      return;
    }
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
      aspect: HERO_IMAGE_ASPECT,
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

  const heroPublishedCount = useMemo(
    () => heroPosts.filter((p) => String(p.status || '') === 'published').length,
    [heroPosts],
  );

  const openImportHeroCarousel = () => {
    if (heroPublishedCount >= MAX_CAROUSEL_SLIDES) {
      Alert.alert(
        'Límite del carrusel hero',
        `Ya hay ${MAX_CAROUSEL_SLIDES} diapositivas en «Reserva tu cita». Eliminá una para importar otra.`,
      );
      return;
    }
    setImportServCta('');
    setImportServOpen(true);
  };

  const confirmPublish = async () => {
    if (!pendingAsset?.uri || !pendingKind) return;
    if (tendenciasPublishedCount() >= MAX_TENDENCIAS_POSTS) {
      Alert.alert(
        'Límite de Tendencias',
        `Máximo ${MAX_TENDENCIAS_POSTS} publicaciones en el feed Tendencias.`,
      );
      return;
    }
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
      const { data: allAfter } = await db.marketingPosts.getAll();
      const pubNo = buildTendenciasPublicationMap(allAfter || []).get(Number(created?.id));
      Alert.alert(
        'Listo',
        pubNo
          ? `Publicación #${pubNo} en Tendencias. Los clientes la verán en la app; en «Me interesa» aparecerá ese número.`
          : 'El contenido quedó publicado y aparecerá en Tendencias (App Clientes).',
      );
      closeComposer();
      await loadPosts();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const allMarketingPosts = useMemo(
    () => [...heroPosts, ...posts],
    [heroPosts, posts],
  );

  const removePostFromState = (row) => {
    const aud = String(row?.audience || '');
    if (aud === 'home_hero' || aud === 'home_carousel') {
      setHeroPosts((prev) => prev.filter((p) => p.id !== row.id));
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== row.id));
    }
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
    const isLegacy = String(item?.audience || '') === 'home_carousel';
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
          <Text style={[styles.cardTypeBadge, { color: c.primary }]}>
            {isLegacy ? 'Carrusel · Inicio (legacy)' : 'Carrusel · Inicio'}
          </Text>
          <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>
            {overlay.headline}
          </Text>
          <Text style={[subStyles.muted, styles.cardDesc]} numberOfLines={2}>
            {overlay.kicker}
            {overlay.priceLabel ? ` · ${overlay.priceLabel}` : ''}
            {overlay.body?.trim() ? ` — ${overlay.body.trim()}` : ''}
          </Text>
          <Text style={[subStyles.muted, styles.cardMeta]} numberOfLines={1}>
            CTA: {overlay.buttonTitle || 'Agendar ahora'} · {formatPostDate(when)}
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
    const pubNo = item.tendencias_no;
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
            {pubNo ? `Publicación #${pubNo} · ` : ''}
            {typeLabel} · Tendencias
          </Text>
          <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={2}>
            {item.title || 'Sin título'}
          </Text>
          <Text style={[subStyles.muted, styles.cardDesc]} numberOfLines={2}>
            {(item.body || '').trim() || 'Sin descripción'}
          </Text>
          <Text style={[subStyles.muted, styles.cardMeta]} numberOfLines={2}>
            {pubNo ? `Nº Tendencias ${pubNo} · ` : ''}
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
        subtitle="Carrusel de Inicio, Tendencias y Mensajes por interés del cliente."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        rightAction={engagementBell}
      >
        <View style={styles.body}>
          <ScrollView
            style={styles.fillScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: padBottom }}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            <Text style={[subStyles.muted, styles.hint]}>{CAPACITY_HINT}</Text>
            {/* Tabla de tamaños por destino */}
            <View style={[styles.sizesCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.sizesTitle, { color: c.foreground }]}>📐 Tamaños recomendados por destino</Text>
              {CONTENT_SIZES.map((row, i) => (
                <View key={i} style={[styles.sizesRow, i < CONTENT_SIZES.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.sizesDest, { color: c.foreground }]}>{row.dest}</Text>
                  <View style={styles.sizesMeta}>
                    <Text style={[styles.sizesSize, { color: c.primary }]}>{row.size}</Text>
                    <Text style={[subStyles.muted, { fontSize: 11 }]}>{row.ratio} · {row.hint}</Text>
                  </View>
                </View>
              ))}
            </View>
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

            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Carrusel · Inicio</Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm, fontSize: 12 }]}>
              Único carrusel en App Clientes (hasta {MAX_CAROUSEL_SLIDES}). Tamaño recomendado: {HERO_IMAGE_SIZE}.
              Importá productos o servicios del inventario (con portada). Producto → Tienda · Servicio → Mis citas.
            </Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm, fontSize: 12, fontFamily: typography.fontSansMedium }]}>
              {heroPosts.length}/{MAX_CAROUSEL_SLIDES} diapositivas
            </Text>
            <SalonButton
              title="Importar del inventario (producto o servicio)"
              variant="heroGold"
              fullWidth
              disabled={saving || heroPosts.length >= MAX_CAROUSEL_SLIDES}
              onPress={openImportHeroCarousel}
              style={{ marginBottom: spacing.sm }}
            />
            <SalonButton
              title={
                heroPosts.length >= MAX_CAROUSEL_SLIDES
                  ? 'Hero completo (15/15)'
                  : `Nueva imagen hero (${HERO_IMAGE_SIZE})`
              }
              variant="outlineGray"
              fullWidth
              disabled={saving || heroPosts.length >= MAX_CAROUSEL_SLIDES}
              onPress={openHeroPicker}
              style={{ marginBottom: spacing.md }}
            />
            {loading ? null : heroPosts.length === 0 ? (
              <Text style={[subStyles.muted, { marginBottom: spacing.lg }]}>
                Sin diapositivas; App Clientes usa fotos de ejemplo.
              </Text>
            ) : (
              heroPosts.map((item) => (
                <View key={`hero-${item.id}`}>{renderHeroRow({ item })}</View>
              ))
            )}

            <Text style={[styles.sectionTitle, { color: c.foreground, marginTop: spacing.sm }]}>
              Feed Tendencias
            </Text>
            <Text style={[subStyles.muted, { marginBottom: spacing.sm }]}>
              {posts.filter((p) => String(p.status || '') === 'published').length}/{MAX_TENDENCIAS_POSTS}{' '}
              publicaciones en el feed (máx. {MAX_TENDENCIAS_POSTS}).
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
              style={[styles.modalScrollFill, { maxHeight: modalMaxHeight }]}
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
              style={[styles.modalScrollFill, { maxHeight: modalMaxHeight }]}
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

      <ImportCarouselModal
        visible={importServOpen}
        onClose={() => setImportServOpen(false)}
        carouselPublishedCount={heroPublishedCount}
        onImported={loadPosts}
        customCta={importServCta}
        onCustomCtaChange={setImportServCta}
      />

      <Modal
        visible={engagementOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => void closeEngagementAlerts()}
      >
        <View style={[styles.importServShell, { backgroundColor: c.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <View
            style={[
              styles.importServHead,
              {
                paddingTop: insets.top + spacing.sm,
                borderBottomColor: c.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => void closeEngagementAlerts()}
              hitSlop={12}
              style={styles.engagementBackBtn}
            >
              <Text style={{ fontFamily: typography.fontSansMedium, color: c.primary, fontSize: 16 }}>
                Volver
              </Text>
            </TouchableOpacity>
            <Text
              style={[styles.modalTitle, { color: c.foreground, flex: 1, textAlign: 'center' }]}
              numberOfLines={1}
            >
              Actividad en Tendencias
            </Text>
            <View style={styles.engagementHeadSpacer} />
          </View>

          <ScrollView
            style={styles.importServScroll}
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[subStyles.muted, { marginBottom: spacing.md }]}>
              Likes y comentarios nuevos de clientes en App Clientes.
            </Text>
            {engagementLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
            ) : engagementFeed.length === 0 ? (
              <Text style={[subStyles.muted, { textAlign: 'center', paddingVertical: spacing.xl }]}>
                No hay likes ni comentarios en Tendencias en los últimos 30 días.
              </Text>
            ) : (
              engagementFeed.map((ev) => (
                <View
                  key={ev.id}
                  style={[styles.engagementRow, { borderBottomColor: c.cardBorder }]}
                >
                  <View style={styles.engagementRowIcon}>
                    {ev.kind === 'like' ? (
                      <Heart size={16} color="#FF4D6D" fill="#FF4D6D" />
                    ) : (
                      <MessageCircle size={16} color={c.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: typography.fontSansMedium, color: c.foreground, fontSize: 13 }}>
                      {ev.kind === 'like' ? 'Me gusta' : 'Comentario'}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.fontSansMedium,
                        color: c.primary,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                      numberOfLines={2}
                    >
                      {ev.publicationLabel}
                      {ev.postTitle && ev.postTitle !== 'Sin título' ? ` · ${ev.postTitle}` : ''}
                    </Text>
                    {ev.postBody && ev.kind === 'comment' ? (
                      <Text
                        style={{ fontFamily: typography.fontSans, color: c.foregroundSubtle, fontSize: 11 }}
                        numberOfLines={1}
                      >
                        {ev.postBody}
                      </Text>
                    ) : null}
                    <Text
                      style={{ fontFamily: typography.fontSans, color: c.foregroundMuted, fontSize: 12 }}
                      numberOfLines={3}
                    >
                      {ev.body}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.fontSans,
                        color: c.foregroundSubtle,
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      {ev.clientLabel} · {formatEngagementWhen(ev.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    body: { flex: 1, paddingTop: spacing.xs, backgroundColor: c.background },
    fillScroll: { flex: 1, backgroundColor: c.background },
    modalScrollFill: { backgroundColor: c.background },
    hint: { marginBottom: spacing.sm, lineHeight: 20, fontSize: 13 },
    subHint: { marginBottom: spacing.md, fontSize: 12 },
    sizesCard: { borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.md, overflow: 'hidden' },
    sizesTitle: { fontFamily: typography.fontSansMedium, fontSize: 13, padding: spacing.sm },
    sizesRow: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    sizesDest: { fontFamily: typography.fontSansMedium, fontSize: 12 },
    sizesMeta: { marginTop: 2 },
    sizesSize: { fontFamily: typography.fontSansMedium, fontSize: 13 },
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
    importServShell: { flex: 1 },
    importServHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    importServBody: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    importServScroll: { flex: 1 },
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
    importTipoRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    importTipoChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    importServRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    importServThumb: {
      width: 56,
      height: 56,
      borderRadius: radii.sm,
    },
    engagementBellBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      position: 'relative',
    },
    engagementBellActive: {
      borderColor: '#E53935',
      backgroundColor: c.surfaceMuted,
    },
    engagementBellAlertDot: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    engagementBackBtn: {
      minWidth: 72,
    },
    engagementHeadSpacer: {
      minWidth: 72,
    },
    engagementRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    engagementRowIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
  });
}
