import { useEffect, useMemo, useRef, useState, useCallback, Component } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Heart, MessageCircle, Share2, CircleHelp, ChevronLeft, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import {
  db,
  supabase,
  registerMarketingInterest,
  MARKETING_INTEREST_TYPES,
  clientToggleMarketingLike,
  clientMarketingLikedPostIds,
} from '@appsalon/shared-config';
import { uploadTendenciasInterestThumbnail } from '../../utils/tendenciasInterestMedia';

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

function CommentsPanel({ postId, publicationNo, onClose, onCommentAdded }) {
  const { colors: c } = useTheme();
  const [apiRows, setApiRows] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (postId == null) {
      setApiRows([]);
      return undefined;
    }
    let alive = true;
    (async () => {
      setApiLoading(true);
      const { data, error } = await db.marketingComments.getByPost(postId);
      if (!alive) return;
      setApiLoading(false);
      if (error || !data) {
        setApiRows([]);
        return;
      }
      const filtered = data.filter((row) => row.moderation_status === 'visible');
      setApiRows(
        filtered.map((row) => ({
          id: String(row.id),
          displayName: row.author_name || 'Cliente',
          body: row.content || '',
          ago: formatRelativeAgo(row.created_at),
        })),
      );
    })();
    return () => {
      alive = false;
    };
  }, [postId]);

  const rows = apiRows;

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
    if (postId == null) return;
    const { data, error } = await db.marketingComments.getByPost(postId);
    if (error || !data) return;
    const filtered = data.filter((row) => row.moderation_status === 'visible');
    setApiRows(
      filtered.map((row) => ({
        id: String(row.id),
        displayName: row.author_name || 'Cliente',
        body: row.content || '',
        ago: formatRelativeAgo(row.created_at),
      })),
    );
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    if (postId == null) return;
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
        moderation_status: 'visible',
      });
      if (error) {
        Alert.alert(
          'No se pudo enviar',
          error.message ||
            'Si ves error de permisos, ejecutá supabase-marketing-engagement-client.sql en Supabase.',
        );
        return;
      }
      setDraft('');
      await reloadRemote();
      onCommentAdded?.(postId);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.commentBox}>
      <View style={styles.sheetHandle} accessibilityElementsHidden />
      <View style={styles.commentHeaderRow}>
        <Text style={styles.commentTitle}>Comentarios</Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar comentarios"
        >
          <Text style={styles.commentCloseTxt}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.commentListScroll}
        contentContainerStyle={styles.commentListContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={rows.length > 3}
        keyboardShouldPersistTaps="handled"
      >
        {apiLoading ? (
          <Text style={styles.commentEmpty}>Cargando comentarios…</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.commentEmpty}>Aún no hay comentarios en esta publicación.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.commentRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarTxt}>{initialsFromDisplayName(row.displayName)}</Text>
              </View>
              <View style={styles.commentBodyCol}>
                <Text style={styles.commentAuthor} selectable={false}>
                  {row.displayName}
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

function isPlayableMediaUrl(uri) {
  const u = String(uri || '').trim();
  return u.startsWith('http://') || u.startsWith('https://');
}

const errorBoundaryStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontSansMedium,
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: '#C9A24D',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  btnTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: '#1a1024',
  },
});

function mapPostToTrendItem(post) {
  const url = post.media_url;
  if (!url || typeof url !== 'string') return null;
  let mediaType = String(post.content_type || '').toLowerCase();
  if (mediaType !== 'image' && mediaType !== 'video') {
    mediaType = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) ? 'image' : 'video';
  }
  const publicationNo = Number(post.tendencias_no);
  return {
    id: `post-${post.id}`,
    postId: post.id,
    publicationNo: Number.isFinite(publicationNo) && publicationNo > 0 ? publicationNo : null,
    mediaType,
    videoUri: mediaType === 'video' ? url : null,
    imageUri: mediaType === 'image' ? url : null,
    title: post.title || 'Tendencia',
    caption: post.body || '',
    likes: Number(post.reactions_count ?? post.reactions ?? post.views_count ?? 0) || 0,
    comments: Number(post.comments_count ?? 0) || 0,
  };
}

class TendenciasErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err) {
    if (__DEV__) {
      console.warn('[Tendencias] Error:', err?.message || err);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <View style={errorBoundaryStyles.wrap}>
          <Text style={errorBoundaryStyles.title}>No se pudo abrir Tendencias</Text>
          <Text style={errorBoundaryStyles.body}>
            Actualizá la app o volvé a intentar. Si el problema continúa, contactá al salón.
          </Text>
          <TouchableOpacity
            style={errorBoundaryStyles.btn}
            onPress={() => this.setState({ failed: false })}
            activeOpacity={0.9}
          >
            <Text style={errorBoundaryStyles.btnTxt}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={errorBoundaryStyles.btn} onPress={this.props.onBack} activeOpacity={0.9}>
            <Text style={errorBoundaryStyles.btnTxt}>Volver</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

class TrendCardErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      const { width = 0, height = 0 } = this.props;
      return (
        <View style={[styles.videoCard, { width, height, backgroundColor: '#111' }]}>
          <View style={styles.overlay}>
            <Text style={styles.slideCaption}>No se pudo cargar este contenido.</Text>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

function TendenciasFeedInner({ onBack }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [remoteFeed, setRemoteFeed] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [liked, setLiked] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [likeBusyId, setLikeBusyId] = useState(null);
  const [interestBusyId, setInterestBusyId] = useState(null);
  const [commentOpen, setCommentOpen] = useState({});

  const loadFeed = useCallback(async () => {
    const { data, error } = await db.marketingPosts.getPublishedTendenciasFeed(40);
    if (error) {
      if (__DEV__) {
        console.warn('[Tendencias] Feed Supabase:', error.message);
      }
      setRemoteFeed([]);
      return;
    }
    if (!data?.length) {
      setRemoteFeed([]);
      return;
    }
    const mapped = data.map(mapPostToTrendItem).filter(Boolean);
    setRemoteFeed(mapped);
    const counts = {};
    const commentCnt = {};
    mapped.forEach((m) => {
      if (m.postId != null) {
        counts[m.postId] = m.likes;
        commentCnt[m.postId] = m.comments;
      }
    });
    setLikeCounts(counts);
    setCommentCounts(commentCnt);
    const postIds = mapped.map((m) => m.postId).filter((id) => id != null);
    if (postIds.length) {
      try {
        const { data: likedIds, error: likedErr } = await clientMarketingLikedPostIds(postIds);
        if (!likedErr && likedIds?.length) {
          const next = {};
          likedIds.forEach((row) => {
            const pid = Number(row?.post_id ?? row);
            if (Number.isFinite(pid)) next[pid] = true;
          });
          setLiked((prev) => ({ ...prev, ...next }));
        }
      } catch {
        /* RPC likes opcional; el feed sigue sin bloquear */
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadFeed();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
  }, [loadFeed]);

  useEffect(() => {
    const channel = supabase
      .channel('client-tendencias-marketing-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketing_posts' },
        () => {
          void loadFeed();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFeed]);

  const feedVideos = useMemo(() => remoteFeed ?? [], [remoteFeed]);

  useEffect(() => {
    if (!feedVideos.length) return;
    setActiveId((cur) => (cur && feedVideos.some((x) => x.id === cur) ? cur : feedVideos[0].id));
  }, [feedVideos]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const visible = viewableItems?.[0]?.item?.id;
    if (visible) setActiveId(visible);
  }, []);

  const viewabilityPairsRef = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 80 },
      onViewableItemsChanged: ({ viewableItems }) => {
        const visible = viewableItems?.[0]?.item?.id;
        if (visible) setActiveId(visible);
      },
    },
  ]);

  useEffect(() => {
    viewabilityPairsRef.current[0].onViewableItemsChanged = onViewableItemsChanged;
  }, [onViewableItemsChanged]);

  const displayLikes = useCallback(
    (item) => {
      if (item.postId != null && likeCounts[item.postId] != null) {
        return likeCounts[item.postId];
      }
      return item.likes;
    },
    [likeCounts],
  );

  const displayComments = useCallback(
    (item) => {
      if (item.postId != null && commentCounts[item.postId] != null) {
        return commentCounts[item.postId];
      }
      return item.comments;
    },
    [commentCounts],
  );

  const isItemLiked = useCallback(
    (item) => (item.postId != null ? Boolean(liked[item.postId]) : false),
    [liked],
  );

  const handleToggleLike = useCallback(
    async (item) => {
      if (item.postId == null) return;
      if (likeBusyId === item.postId) return;
      setLikeBusyId(item.postId);
      try {
        const { data, error } = await clientToggleMarketingLike(item.postId);
        if (error) {
          Alert.alert('Me gusta', error.message || 'No se pudo registrar el like.');
          return;
        }
        const likedNow = Boolean(data?.liked);
        const count = Number(data?.count);
        setLiked((prev) => ({ ...prev, [item.postId]: likedNow }));
        if (Number.isFinite(count)) {
          setLikeCounts((prev) => ({ ...prev, [item.postId]: count }));
        }
      } finally {
        setLikeBusyId(null);
      }
    },
    [likeBusyId],
  );

  const handleCommentAdded = useCallback((postId) => {
    if (postId == null) return;
    setCommentCounts((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? 0) + 1,
    }));
  }, []);

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

  const openCommentsPublicationNo = useMemo(() => {
    if (!openCommentsVideoId) return null;
    const item = feedVideos.find((x) => x.id === openCommentsVideoId);
    return item?.publicationNo ?? null;
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

  const onInterest = async (video) => {
    const busyKey = video.postId ?? video.id;
    if (interestBusyId === busyKey) return;
    setInterestBusyId(busyKey);
    try {
      let mediaUrl = video.imageUri || null;
      if (!mediaUrl && video.videoUri) {
        mediaUrl = await uploadTendenciasInterestThumbnail(video.videoUri);
      }

      const { error } = await registerMarketingInterest({
        type: MARKETING_INTEREST_TYPES.TENDENCIAS,
        title: video.title,
        headline: video.title,
        detail: video.caption || null,
        postId: video.postId ?? null,
        publicationNo: video.publicationNo ?? null,
        mediaUrl,
      });
      if (error) {
        Alert.alert(
          'Me interesa',
          error.message ||
            'No se pudo avisar al salón. Si ves error de permisos, en Supabase activá la política de INSERT para clientes en marketing_direct_messages.',
        );
        return;
      }
      Alert.alert(
        '¡Listo!',
        'Tu solicitud sobre esta publicación llegó al salón. Revisá tus mensajes en la app.',
      );
    } finally {
      setInterestBusyId(null);
    }
  };

  if (!height || height < 120) {
    return (
      <View style={[styles.wrap, styles.loadingWrap]}>
        <ActivityIndicator size="large" color="#C9A24D" />
        <TouchableOpacity style={[styles.backPill, { top: insets.top + 8 }]} onPress={onBack}>
          <ChevronLeft size={22} color="#FFF" strokeWidth={2.2} />
          <Text style={styles.backTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (remoteFeed === null) {
    return (
      <View style={[styles.wrap, styles.loadingWrap]}>
        <ActivityIndicator size="large" color="#C9A24D" />
        <Text style={styles.emptyFeedTxt}>Cargando Tendencias…</Text>
        <TouchableOpacity style={[styles.backPill, { top: insets.top + 8 }]} onPress={onBack}>
          <ChevronLeft size={22} color="#FFF" strokeWidth={2.2} />
          <Text style={styles.backTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (feedVideos.length === 0) {
    return (
      <View style={[styles.wrap, styles.loadingWrap]}>
        <Text style={styles.emptyFeedTitle}>Aún no hay publicaciones</Text>
        <Text style={styles.emptyFeedTxt}>
          El salón publicará fotos y videos en Marketing. Volvé más tarde.
        </Text>
        <TouchableOpacity style={[styles.backPill, { top: insets.top + 8 }]} onPress={onBack}>
          <ChevronLeft size={22} color="#FFF" strokeWidth={2.2} />
          <Text style={styles.backTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
                postId={openCommentsPostId}
                publicationNo={openCommentsPublicationNo}
                onClose={closeCommentsModal}
                onCommentAdded={handleCommentAdded}
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
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        viewabilityConfigCallbackPairs={viewabilityPairsRef.current}
        renderItem={({ item }) => (
          <TrendCardErrorBoundary width={width} height={height}>
            <TrendMediaCard
              item={item}
              width={width}
              height={height}
              isActive={activeId === item.id}
              isLiked={isItemLiked(item)}
              isCommentOpen={Boolean(commentOpen[item.id])}
              likes={displayLikes(item)}
              comments={displayComments(item)}
              likeBusy={likeBusyId === item.postId}
              interestBusy={interestBusyId === (item.postId ?? item.id)}
              onToggleLike={() => void handleToggleLike(item)}
              onToggleComments={() =>
                setCommentOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
              }
              onShare={() => onShare(item)}
              onInterest={() => void onInterest(item)}
            />
          </TrendCardErrorBoundary>
        )}
      />
    </View>
  );
}

export function TendenciasFeed(props) {
  return (
    <TendenciasErrorBoundary onBack={props.onBack}>
      <TendenciasFeedInner {...props} />
    </TendenciasErrorBoundary>
  );
}

function TrendSlideCopy({ item }) {
  const title = String(item.title || '').trim();
  const caption = String(item.caption || '').trim();
  const showTitle = title.length > 0 && title.toLowerCase() !== 'tendencia';
  return (
    <View style={styles.bottomCopy} pointerEvents="none">
      {showTitle ? (
        <Text style={styles.slideTitle} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
      {caption ? (
        <Text style={styles.slideCaption} numberOfLines={4}>
          {caption}
        </Text>
      ) : showTitle ? null : (
        <Text style={styles.slideCaption} numberOfLines={2}>
          Contenido del salón
        </Text>
      )}
    </View>
  );
}

function TrendCardActions({
  item: _item,
  isLiked,
  isCommentOpen,
  likes,
  comments,
  likeBusy,
  interestBusy,
  onToggleLike,
  onToggleComments,
  onShare,
  onInterest,
  tc,
}) {
  return (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.actionBtn} onPress={onToggleLike} disabled={likeBusy}>
        <Heart
          size={22}
          color={isLiked ? '#FF4D6D' : '#FFFFFF'}
          fill={isLiked ? '#FF4D6D' : 'transparent'}
          strokeWidth={2}
        />
        <Text style={styles.actionTxt}>{likes}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={onToggleComments}>
        <MessageCircle size={22} color={isCommentOpen ? tc.primary : '#FFF'} strokeWidth={2} />
        <Text style={styles.actionTxt}>{comments}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
        <Share2 size={22} color="#FFF" strokeWidth={2} />
        <Text style={styles.actionTxt}>Compartir</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={onInterest} disabled={interestBusy}>
        <CircleHelp size={22} color="#FFF" strokeWidth={2} />
        <Text style={styles.actionTxt}>{interestBusy ? '…' : 'Me interesa'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function TrendMediaCard(props) {
  const isImage = Boolean(props.item.imageUri) || props.item.mediaType === 'image';
  const videoUri = String(props.item.videoUri || '').trim();
  const canPlayVideo = isPlayableMediaUrl(videoUri);
  if (isImage || !canPlayVideo) {
    return (
      <TrendImageCard
        {...props}
        item={{
          ...props.item,
          imageUri: props.item.imageUri || (canPlayVideo ? null : props.item.imageUri),
        }}
      />
    );
  }
  if (props.isActive) {
    return <TrendVideoCardActive {...props} item={{ ...props.item, videoUri }} />;
  }
  return <TrendVideoCardIdle {...props} item={{ ...props.item, videoUri }} />;
}

function TrendImageCard({
  item,
  width,
  height,
  isActive: _isActive,
  isLiked,
  isCommentOpen,
  likes,
  comments,
  likeBusy,
  interestBusy,
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
        <TrendCardActions
          item={item}
          isLiked={isLiked}
          isCommentOpen={isCommentOpen}
          likes={likes}
          comments={comments}
          likeBusy={likeBusy}
          interestBusy={interestBusy}
          onToggleLike={onToggleLike}
          onToggleComments={onToggleComments}
          onShare={onShare}
          onInterest={onInterest}
          tc={tc}
        />
      </View>
    </View>
  );
}

function TrendVideoCardIdle({
  item,
  width,
  height,
  isLiked,
  isCommentOpen,
  likes,
  comments,
  likeBusy,
  interestBusy,
  onToggleLike,
  onToggleComments,
  onShare,
  onInterest,
}) {
  const { colors: tc } = useTheme();
  return (
    <View style={[styles.videoCard, { width, height }]} collapsable={false}>
      <View style={[styles.video, styles.videoIdle, { width, height }]} />
      <View style={styles.overlay}>
        <TrendSlideCopy item={item} />
        <TrendCardActions
          item={item}
          isLiked={isLiked}
          isCommentOpen={isCommentOpen}
          likes={likes}
          comments={comments}
          likeBusy={likeBusy}
          interestBusy={interestBusy}
          onToggleLike={onToggleLike}
          onToggleComments={onToggleComments}
          onShare={onShare}
          onInterest={onInterest}
          tc={tc}
        />
      </View>
    </View>
  );
}

function TrendVideoCardActive({
  item,
  width,
  height,
  isLiked,
  isCommentOpen,
  likes,
  comments,
  likeBusy,
  interestBusy,
  onToggleLike,
  onToggleComments,
  onShare,
  onInterest,
}) {
  const { colors: tc } = useTheme();
  const videoUri = String(item.videoUri || '').trim();
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (!videoUri) return undefined;

    player.muted = false;

    const tryPlay = () => {
      try {
        if (player.status === 'readyToPlay') {
          player.play();
        }
      } catch {
        /* reproductor liberado al desmontar */
      }
    };

    tryPlay();
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        tryPlay();
      }
    });
    const endSub = player.addListener('playToEnd', () => {
      try {
        player.replay();
      } catch {
        /* noop */
      }
    });

    return () => {
      try {
        player.pause();
        player.muted = true;
      } catch {
        /* noop */
      }
      statusSub.remove();
      endSub.remove();
    };
  }, [videoUri, player]);

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
        <TrendCardActions
          item={item}
          isLiked={isLiked}
          isCommentOpen={isCommentOpen}
          likes={likes}
          comments={comments}
          likeBusy={likeBusy}
          interestBusy={interestBusy}
          onToggleLike={onToggleLike}
          onToggleComments={onToggleComments}
          onShare={onShare}
          onInterest={onInterest}
          tc={tc}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyFeedTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 18,
    color: '#FFF',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyFeedTxt: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  errorWrap: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 18,
    color: '#FFF',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorBtn: {
    borderRadius: radii.pill,
    backgroundColor: '#C9A24D',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  errorBtnTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: '#1A1A1A',
  },
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
  videoIdle: {
    backgroundColor: '#1a1a1a',
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
  slidePubNo: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#E8D4A8',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
