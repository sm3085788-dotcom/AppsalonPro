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
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Heart, MessageCircle, Share2, CircleHelp, ChevronLeft, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

const APPSALON_PHONE = '+50257199107';

const TREND_VIDEOS = [
  {
    id: 'trend-1',
    videoUri:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    title: 'Balayage caramelo en capas',
    caption: 'Técnica de luz natural para morenas · App Salón',
    likes: 245,
    comments: 34,
  },
  {
    id: 'trend-2',
    videoUri:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    title: 'Glow treatment anti-frizz',
    caption: 'Acabado espejo para cabello poroso · App Salón',
    likes: 198,
    comments: 20,
  },
  {
    id: 'trend-3',
    videoUri:
      'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    title: 'Bob texturizado 2026',
    caption: 'Corte con movimiento y secado rápido · App Salón',
    likes: 322,
    comments: 49,
  },
];

/**
 * Comentarios demo (simulan usuarios de App Clientes). Los nombres son solo texto;
 * en producción vendrían del API y no llevarían acción a perfil ajeno.
 */
const DEMO_COMMENTS_BY_VIDEO = {
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

function CommentsPanel({ videoId, onClose }) {
  const { colors: c } = useTheme();
  const rows = DEMO_COMMENTS_BY_VIDEO[videoId] ?? [];
  const [draft, setDraft] = useState('');

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

  const handleSendDemo = () => {
    const text = draft.trim();
    if (!text) return;
    Alert.alert('Demo', 'Los comentarios se guardarán cuando conectes el backend.');
    setDraft('');
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
        Podés leer lo que publicó la comunidad. Los nombres son solo referencia: no se pueden abrir
        perfiles ajenos desde aquí.
      </Text>

      <ScrollView
        style={styles.commentListScroll}
        contentContainerStyle={styles.commentListContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={rows.length > 3}
        keyboardShouldPersistTaps="handled"
      >
        {rows.length === 0 ? (
          <Text style={styles.commentEmpty}>Aún no hay comentarios en este video.</Text>
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
        />
        <TouchableOpacity
          style={styles.commentSendIconBtn}
          onPress={handleSendDemo}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Enviar comentario"
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

export function TendenciasFeed({ onBack }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [activeId, setActiveId] = useState(TREND_VIDEOS[0].id);
  const [liked, setLiked] = useState({});
  const [commentOpen, setCommentOpen] = useState({});

  const onViewRef = useRef(({ viewableItems }) => {
    const visible = viewableItems?.[0]?.item?.id;
    if (visible) setActiveId(visible);
  });

  const viewConfigRef = useRef({ itemVisiblePercentThreshold: 80 });

  const toggledLikes = useMemo(
    () =>
      TREND_VIDEOS.reduce((acc, v) => {
        acc[v.id] = v.likes + (liked[v.id] ? 1 : 0);
        return acc;
      }, {}),
    [liked],
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

  const closeCommentsModal = () => {
    if (!openCommentsVideoId) return;
    setCommentOpen((prev) => ({ ...prev, [openCommentsVideoId]: false }));
  };

  const onShare = async (video) => {
    const text = `${video.title} · ${video.caption}\nVideo de App Salón`;
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
              <CommentsPanel videoId={openCommentsVideoId} onClose={closeCommentsModal} />
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
        data={TREND_VIDEOS}
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
            <TrendVideoCard
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
  const player = useVideoPlayer(item.videoUri, (p) => {
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
