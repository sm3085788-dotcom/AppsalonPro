import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  useWindowDimensions,
  Alert,
  Share,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Heart, MessageCircle, Share2, CircleHelp, ChevronLeft, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { db, supabase } from '@appsalon/shared-config';

const APPSALON_PHONE = '+50257199107';

const TREND_VIDEOS = [
  {
    id: 'trend-1',
    mediaType: 'video',
    videoUri:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    imageUri: null,
    title: 'Balayage caramelo en capas',
    caption: 'Técnica de luz natural para morenas · App Salón',
    likes: 245,
    comments: 34,
  },
  {
    id: 'trend-2',
    mediaType: 'video',
    videoUri:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    imageUri: null,
    title: 'Glow treatment anti-frizz',
    caption: 'Acabado espejo para cabello poroso · App Salón',
    likes: 198,
    comments: 20,
  },
  {
    id: 'trend-3',
    mediaType: 'video',
    videoUri:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    imageUri: null,
    title: 'Bob texturizado 2026',
    caption: 'Corte con movimiento y secado rápido · App Salón',
    likes: 322,
    comments: 49,
  },
];

/**
 * Comentarios locales para videos de ejemplo (sin `postId` en Supabase).
 * Cuando el post existe, los comentarios salen de `db.marketingComments`.
 */
const OFFLINE_PLACEHOLDER_COMMENTS = {
  'trend-1': [
    {
      id: 'c1',
      displayName: 'María López',
      body: '¿En Aura manejan este tono en morenas? Se ve divino.',
      ago: 'hace 1 h',
    },
    {
      id: 'c2',
      displayName: 'ClienteAura_gt',
      body: 'Me encantó el resultado en la promo que subieron la semana pasada.',
      ago: 'hace 3 h',
    },
    {
      id: 'c3',
      displayName: 'Sofi · App Salón',
      body: 'Podés agendar por la app y te asesoran con tu tono. 💛',
      ago: 'hace 5 h',
    },
    {
      id: 'c4',
      displayName: 'Diana R.',
      body: 'Precio aprox del servicio?',
      ago: 'hace 1 d',
    },
  ],
  'trend-2': [
    {
      id: 'c5',
      displayName: 'Lucía M.',
      body: 'Tengo mucho frizz, ¿este tratamiento es para todo tipo de cabello?',
      ago: 'hace 40 min',
    },
    {
      id: 'c6',
      displayName: 'karla_h',
      body: 'Lo vi en tendencias y ya pedí cita. Gracias ✨',
      ago: 'hace 2 h',
    },
  ],
  'trend-3': [
    {
      id: 'c7',
      displayName: 'Andrea',
      body: 'El bob queda corto para cara redonda?',
      ago: 'hace 12 min',
    },
    {
      id: 'c8',
      displayName: 'Rafa G.',
      body: 'Genial el tip del secado rápido.',
      ago: 'hace 6 h',
    },
    {
      id: 'c9',
      displayName: 'Cliente zona 10',
      body: '¿En qué sucursal hacen este corte?',
      ago: 'hace 1 d',
    },
  ],
};

function initialsFromDisplayName(name) {
  const parts = name
    .replace(/·/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((p) => p && /[A-Za-zÀ-ÿ\u00f1\u00d1]/.test(p));
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return '??';
}

function formatRelativeAgo(iso) {
  if (!iso) return '';
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `hace ${days} d`;
    return new Date(iso).toLocaleDateString('es-GT', { dateStyle: 'short' });
  } catch {
    return '';
  }
}

function CommentsPanel({ videoId, postId, onClose }) {
  const { colors: c } = useTheme();
  const offlinePlaceholderRows = OFFLINE_PLACEHOLDER_COMMENTS[videoId] ?? [];
  const [apiRows, setApiRows] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const useRemote = postId != null;

  useEffect(() => {
    if (!useRemote) {
      setApiRows([]);
      return undefined;
    }
    let alive = true;
    (async () => {
      setApiLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;
      const { data, error } = await db.marketingComments.getByPost(postId);
      if (!alive) return;
      setApiLoading(false);
      if (error || !data) {
        setApiRows([]);
        return;
      }
      const filtered = data.filter(
        (row) =>
          row.moderation_status === 'visible' ||
          (row.moderation_status === 'pending' && uid && row.author_id === uid),
      );
      setApiRows(
        filtered.map((row) => ({
          id: String(row.id),
          displayName: row.author_name || 'Cliente',
          body: row.content || '',
          ago: formatRelativeAgo(row.created_at),
          pending: row.moderation_status === 'pending',
        })),
      );
    })();
    return () => {
      alive = false;
    };
  }, [postId, useRemote]);

  const rows = useRemote ? apiRows : offlinePlaceholderRows;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        commentBox: {
          width: '100%',
          backgroundColor: c.card,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.xs,
          paddingBottom: spacing.md,
          maxHeight: '100%',
        },
        sheetHandle: {
          alignSelf: 'center',
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(127,127,127,0.35)',
          marginBottom: spacing.sm,
        },
        commentHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
        commentCloseTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.primary,
        },
        commentHint: {
          fontFamily: typography.fontSans,
          fontSize: 11,
          color: c.foregroundMuted,
          marginTop: spacing.xs,
          lineHeight: 15,
        },
        commentListScroll: {
          marginTop: spacing.sm,
          maxHeight: 300,
        },
        commentListContent: {
          paddingBottom: spacing.xs,
          gap: spacing.sm,
        },
        commentEmpty: {
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foreground,
          opacity: 0.75,
          paddingVertical: spacing.sm,
        },
        commentRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
          paddingVertical: spacing.xs,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.cardBorder,
        },
        avatarCircle: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: c.iconCircleBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
          color: c.foreground,
        },
        commentBodyCol: {
          flex: 1,
          minWidth: 0,
        },
        commentAuthor: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.foreground,
        },
        commentMsg: {
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foreground,
          marginTop: 2,
          lineHeight: 18,
        },
        commentAgo: {
          fontFamily: typography.fontSans,
          fontSize: 11,
          color: c.foregroundSubtle,
          marginTop: 4,
        },
        commentTitle: {
          fontFamily: typography.fontSansMedium,
          fontSize: 14,
          color: c.foreground,
          flex: 1,
        },
        commentComposer: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          marginTop: spacing.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          borderRadius: radii.sm,
          backgroundColor: c.backgroundAlt,
          paddingLeft: spacing.sm,
          paddingRight: 4,
          paddingVertical: 6,
          gap: 4,
          minHeight: 48,
        },
        commentInput: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: 14,
          color: c.foreground,
          maxHeight: 96,
          paddingVertical: Platform.OS === 'ios' ? 8 : 6,
          paddingHorizontal: 0,
          margin: 0,
        },
        commentSendIconBtn: {
          width: 40,
          height: 40,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [c],
  );

  const reloadRemote = async () => {
    if (!useRemote) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id ?? null;
    const { data, error } = await db.marketingComments.getByPost(postId);
    if (error || !data) return;
    const filtered = data.filter(
      (row) =>
        row.moderation_status === 'visible' ||
        (row.moderation_status === 'pending' && uid && row.author_id === uid),
    );
    setApiRows(
      filtered.map((row) => ({
        id: String(row.id),
        displayName: row.author_name || 'Cliente',
        body: row.content || '',
        ago: formatRelativeAgo(row.created_at),
        pending: row.moderation_status === 'pending',
      })),
    );
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    if (!useRemote) {
      Alert.alert(
        'Comentarios',
        'Este clip es de ejemplo. Los comentarios reales aparecen en las publicaciones del salón.',
      );
      setDraft('');
      return;
    }
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const authorName =
        session?.user?.user_metadata?.full_name ||
        session?.user?.email?.split('@')[0] ||
        'Cliente';
      const { error } = await db.marketingComments.create({
        post_id: postId,
        content: text,
        author_id: session?.user?.id ?? null,
        author_name: authorName,
        moderation_status: 'pending',
      });
      if (error) {
        Alert.alert(
          'No se pudo enviar',
          error.message ||
            'Si ves error de permisos, en Supabase hay que permitir INSERT de clientes autenticados en marketing_comments.',
        );
        return;
      }
      setDraft('');
      await reloadRemote();
      Alert.alert('Enviado', 'El salón verá tu mensaje en Pedidos. Cuando lo apruebe, aparecerá aquí para todos.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.commentBox}>
      <View style={styles.sheetHandle} accessibilityElementsHidden />
      <View style={styles.commentHeaderRow}>
        <Text style={styles.commentTitle}>Comentarios · App Clientes</Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar comentarios"
        >
          <Text style={styles.commentCloseTxt}>Cerrar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.commentHint}>
        {useRemote
          ? 'Consultas y comentarios sobre esta publicación. El salón puede moderar antes de mostrarlos a todos.'
          : 'Video de ejemplo. Los comentarios reales están en las publicaciones del salón.'}
      </Text>

      <ScrollView
        style={styles.commentListScroll}
        contentContainerStyle={styles.commentListContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={rows.length > 3}
        keyboardShouldPersistTaps="handled"
      >
        {apiLoading && useRemote ? (
          <Text style={styles.commentEmpty}>Cargando comentarios…</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.commentEmpty}>
            {useRemote ? 'Aún no hay comentarios visibles en esta publicación.' : 'Aún no hay comentarios en este video.'}
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.commentRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarTxt}>{initialsFromDisplayName(row.displayName)}</Text>
              </View>
              <View style={styles.commentBodyCol}>
                <Text style={styles.commentAuthor} selectable={false}>
                  {row.displayName}
                  {row.pending ? (
                    <Text style={{ color: c.foregroundMuted, fontSize: 11 }}> · pendiente</Text>
                  ) : null}
                </Text>
                <Text style={styles.commentMsg}>{row.body}</Text>
                <Text style={styles.commentAgo}>{row.ago}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.commentComposer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Escribí un comentario…"
          placeholderTextColor={c.foregroundSubtle}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={500}
          textAlignVertical="center"
          accessibilityLabel="Escribir comentario"
          editable={!sending}
        />
        <TouchableOpacity
          style={styles.commentSendIconBtn}
          onPress={handleSend}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Enviar comentario"
          disabled={sending}
        >
          <Send size={22} color={c.primary} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function shareTo(url) {
  return Linking.openURL(url).catch(() => {});
}

function mapPostToTrendItem(post) {
  const url = post.media_url;
  if (!url || typeof url !== 'string') return null;
  let mediaType = String(post.content_type || '').toLowerCase();
  if (mediaType !== 'image' && mediaType !== 'video') {
    mediaType = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) ? 'image' : 'video';
  }
  return {
    id: `post-${post.id}`,
    postId: post.id,
    mediaType,
    videoUri: mediaType === 'video' ? url : null,
    imageUri: mediaType === 'image' ? url : null,
    title: post.title || 'Tendencia',
    caption: post.body || '',
    likes: Number(post.reactions_count ?? post.reactions ?? post.views_count ?? 0) || 0,
    comments: Number(post.comments_count ?? 0) || 0,
  };
}

export function TendenciasFeed({ onBack }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [remoteFeed, setRemoteFeed] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [liked, setLiked] = useState({});
  const [commentOpen, setCommentOpen] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await db.marketingPosts.getPublishedTendenciasFeed(40);
      if (!alive) return;
      if (error || !data?.length) {
        setRemoteFeed([]);
        return;
      }
      const mapped = data.map(mapPostToTrendItem).filter(Boolean);
      setRemoteFeed(mapped);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const feedVideos = useMemo(() => {
    if (remoteFeed && remoteFeed.length > 0) return remoteFeed;
    return TREND_VIDEOS;
  }, [remoteFeed]);

  useEffect(() => {
    if (!feedVideos.length) return;
    setActiveId((cur) => (cur && feedVideos.some((x) => x.id === cur) ? cur : feedVideos[0].id));
  }, [feedVideos]);

  const onViewRef = useRef(({ viewableItems }) => {
    const visible = viewableItems?.[0]?.item?.id;
    if (visible) setActiveId(visible);
  });

  const viewConfigRef = useRef({ itemVisiblePercentThreshold: 80 });

  const toggledLikes = useMemo(
    () =>
      feedVideos.reduce((acc, v) => {
        acc[v.id] = v.likes + (liked[v.id] ? 1 : 0);
        return acc;
      }, {}),
    [liked, feedVideos],
  );

  /** Con panel de comentarios abierto, el feed vertical no debe cambiar de video. */
  const lockVideoFeedScroll = useMemo(
    () => Object.values(commentOpen).some(Boolean),
    [commentOpen],
  );

  const openCommentsVideoId = useMemo(() => {
    const hit = Object.entries(commentOpen).find(([, open]) => open);
    return hit ? hit[0] : null;
  }, [commentOpen]);

  const openCommentsPostId = useMemo(() => {
    if (!openCommentsVideoId) return null;
    const item = feedVideos.find((x) => x.id === openCommentsVideoId);
    return item?.postId != null ? item.postId : null;
  }, [feedVideos, openCommentsVideoId]);

  const closeCommentsModal = () => {
    if (!openCommentsVideoId) return;
    setCommentOpen((prev) => ({ ...prev, [openCommentsVideoId]: false }));
  };

  const onShare = async (video) => {
    const text = `${video.title} · ${video.caption}\n${video.mediaType === 'image' ? 'Imagen' : 'Video'} · App Salón`;
    try {
      await Share.share({
        message: text,
        title: video.title,
      });
    } catch {
      /* usuario canceló o error del sistema */
    }
  };

  const onInterest = (video) => {
    const msg = `Hola, me interesa esta tendencia de App Salón: "${video.title}". Quiero más información.`;
    shareTo(`https://wa.me/${APPSALON_PHONE.replace('+', '')}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[
          styles.backPill,
          { top: insets.top + 8, zIndex: 20 },
        ]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <ChevronLeft size={22} color="#FFF" strokeWidth={2.2} />
        <Text style={styles.backTxt}>Volver</Text>
      </TouchableOpacity>

      <Modal
        visible={openCommentsVideoId != null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeCommentsModal}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeCommentsModal}
            accessibilityRole="button"
            accessibilityLabel="Cerrar comentarios"
          />
          <View
            style={[
              styles.commentSheetOuter,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            {openCommentsVideoId ? (
              <CommentsPanel
                videoId={openCommentsVideoId}
                postId={openCommentsPostId}
                onClose={closeCommentsModal}
              />
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.backPill, styles.backPillModal, { top: insets.top + 8 }]}
            onPress={closeCommentsModal}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <ChevronLeft size={22} color="#FFF" strokeWidth={2.2} />
            <Text style={styles.backTxt}>Volver</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <FlatList
        data={feedVideos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        bounces={false}
        scrollEnabled={!lockVideoFeedScroll}
        showsVerticalScrollIndicator={false}
        style={styles.feed}
        snapToInterval={height}
        decelerationRate="fast"
        nestedScrollEnabled
        removeClippedSubviews={false}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        renderItem={({ item }) => {
          return (
            <TrendMediaCard
              item={item}
              width={width}
              height={height}
              isActive={activeId === item.id}
              isLiked={Boolean(liked[item.id])}
              isCommentOpen={Boolean(commentOpen[item.id])}
              likes={toggledLikes[item.id]}
              onToggleLike={() => setLiked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
              onToggleComments={() =>
                setCommentOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
              }
              onShare={() => onShare(item)}
              onInterest={() => onInterest(item)}
            />
          );
        }}
      />
    </View>
  );
}

function TrendSlideCopy({ item }) {
  return (
    <View style={styles.bottomCopy} pointerEvents="none">
      <Text style={styles.slideTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.slideCaption} numberOfLines={3}>
        {item.caption}
      </Text>
    </View>
  );
}

function TrendMediaCard(props) {
  const isImage = Boolean(props.item.imageUri) || props.item.mediaType === 'image';
  if (isImage) {
    return <TrendImageCard {...props} />;
  }
  return <TrendVideoCard {...props} />;
}

function TrendImageCard({
  item,
  width,
  height,
  isActive: _isActive,
  isLiked,
  isCommentOpen,
  likes,
  onToggleLike,
  onToggleComments,
  onShare,
  onInterest,
}) {
  const { colors: tc } = useTheme();
  const uri = item.imageUri || item.videoUri;
  return (
    <View style={[styles.videoCard, { width, height }]} collapsable={false}>
      {uri ? (
        <Image source={{ uri }} style={[styles.video, { width, height }]} resizeMode="cover" />
      ) : null}
      <View style={styles.overlay}>
        <TrendSlideCopy item={item} />
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onToggleLike}>
            <Heart
              size={22}
              color={isLiked ? '#FF4D6D' : '#FFFFFF'}
              fill={isLiked ? '#FF4D6D' : 'transparent'}
              strokeWidth={2}
            />
            <Text style={styles.actionTxt}>{likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onToggleComments}>
            <MessageCircle
              size={22}
              color={isCommentOpen ? tc.primary : '#FFF'}
              strokeWidth={2}
            />
            <Text style={styles.actionTxt}>{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
            <Share2 size={22} color="#FFF" strokeWidth={2} />
            <Text style={styles.actionTxt}>Compartir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onInterest}>
            <CircleHelp size={22} color="#FFF" strokeWidth={2} />
            <Text style={styles.actionTxt}>Me interesa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TrendVideoCard({
  item,
  width,
  height,
  isActive,
  isLiked,
  isCommentOpen,
  likes,
  onToggleLike,
  onToggleComments,
  onShare,
  onInterest,
}) {
  const { colors: tc } = useTheme();
  const player = useVideoPlayer(item.videoUri || '', (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (!isActive) {
      player.pause();
      return;
    }

    const tryPlay = () => {
      if (player.status === 'readyToPlay') {
        player.play();
      }
    };

    tryPlay();
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && isActive) {
        player.play();
      }
    });

    return () => sub.remove();
  }, [isActive, player]);

  return (
    <View style={[styles.videoCard, { width, height }]} collapsable={false}>
      <VideoView
        style={[styles.video, { width, height }]}
        player={player}
        contentFit="cover"
        nativeControls={false}
        surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
      />
      <View style={styles.overlay}>
        <TrendSlideCopy item={item} />
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onToggleLike}>
            <Heart
              size={22}
              color={isLiked ? '#FF4D6D' : '#FFFFFF'}
              fill={isLiked ? '#FF4D6D' : 'transparent'}
              strokeWidth={2}
            />
            <Text style={styles.actionTxt}>{likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onToggleComments}>
            <MessageCircle
              size={22}
              color={isCommentOpen ? tc.primary : '#FFF'}
              strokeWidth={2}
            />
            <Text style={styles.actionTxt}>{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
            <Share2 size={22} color="#FFF" strokeWidth={2} />
            <Text style={styles.actionTxt}>Compartir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onInterest}>
            <CircleHelp size={22} color="#FFF" strokeWidth={2} />
            <Text style={styles.actionTxt}>Me interesa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  feed: {
    flex: 1,
  },
  backPill: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  backPillModal: {
    zIndex: 50,
    elevation: 50,
  },
  backTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: '#FFF',
  },
  videoCard: {
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  video: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#000',
    zIndex: 0,
  },
  overlay: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.28)',
    zIndex: 1,
  },
  bottomCopy: {
    position: 'absolute',
    left: spacing.md,
    right: 80,
    bottom: spacing.xl + 12,
    zIndex: 2,
  },
  slideTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 17,
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slideCaption: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actions: {
    position: 'absolute',
    right: spacing.md,
    top: '55%',
    transform: [{ translateY: -110 }],
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionTxt: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: '#FFF',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  commentSheetOuter: {
    width: '100%',
    maxHeight: '68%',
  },
});
