import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  RefreshControl,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Send, FileText, Image as ImageIcon, X, Download, Sparkles } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  supabase,
  fetchClientAuraMessages,
  markClientAuraDelivered,
  sendClientAuraChat,
  isSalonOutboundMessage,
  isInboundAuraUnread,
  isClientOutboundAuraMessage,
  mergeAuraMessage,
  uploadMensajeMediaFromUri,
  broadcastPreviewText,
  parseCitaConfirmacionContent,
  citaConfirmacionPreviewText,
  MARKETING_INTEREST_TYPES,
} from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { keyboardComposerLift } from '../../../../shared/utils/chatKeyboard';
import { SalonButton } from '../luxury/SalonButton';
import { saveChatImageWithAlert } from '../../utils/saveChatImage';
import { BroadcastPromoCard } from './BroadcastPromoCard';
import { CitaConfirmacionCard } from './CitaConfirmacionCard';
import { MarketingInterestCard } from './MarketingInterestCard';

function chatBubbleText(item) {
  const ct = String(item.content_type || '');
  if (ct === 'cita_confirmacion') {
    return citaConfirmacionPreviewText(item.content);
  }
  if (ct.includes('broadcast')) {
    const preview = broadcastPreviewText(item.content);
    if (preview) return preview;
  }
  const t = String(item.content || '').trim();
  if (item.media_url && item.media_kind === 'image' && /^imagen$/i.test(t)) return '';
  return t;
}

function ChatImageWithSave({ uri, imageStyle, btnStyle }) {
  const [saving, setSaving] = useState(false);
  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveChatImageWithAlert(uri);
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={{ position: 'relative', marginTop: spacing.xs }}>
      <Image source={{ uri }} style={imageStyle} resizeMode="cover" />
      <TouchableOpacity
        style={btnStyle}
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Guardar imagen"
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Download size={16} color="#FFFFFF" strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function formatWhen(iso) {
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

function isFromClientMessage(item, sessionUserId) {
  const uid = sessionUserId ? String(sessionUserId) : '';
  const author = item.created_by != null ? String(item.created_by) : '';
  return Boolean(uid && author && author === uid);
}

/** Altura aprox. del encabezado SubScreenChrome (Volver + título + subtítulo). */
const CHROME_HEADER_EST = 118;
const SYNC_POLL_MS = 60000;
/** 30 mensajes recientes al abrir: renderizado instantáneo sin scroll visible. */
const MSG_FETCH_LIMIT = 30;

/** Caché del hilo para no vaciar la lista al reentrar a Mensajes. */
let auraThreadCache = { clienteId: null, rows: [] };

function isMarketingInterestMessage(item) {
  const ct = String(item?.content_type || '');
  return (
    ct === MARKETING_INTEREST_TYPES.TENDENCIAS || ct === MARKETING_INTEREST_TYPES.CAROUSEL
  );
}

/** Burbuja del cliente (vos): distinta a la del salón (card blanca). */
const CLIENT_BUBBLE = {
  light: { bg: '#E0EAF4', border: '#A8BED6', meta: '#4A5F73' },
  dark: { bg: '#1E2A38', border: '#3D5A78', meta: '#A8B8CC' },
};

export function AuraLineInbox({ clienteRow, sessionUser, onUnreadChange, onPromoAction }) {
  const { colors: c, isDark } = useTheme();
  const clientBubble = isDark ? CLIENT_BUBBLE.dark : CLIENT_BUBBLE.light;
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = insets.top + CHROME_HEADER_EST;
  const styles = useMemo(() => createStyles(c), [c]);
  const listRef = useRef(null);
  const chatStickToBottomRef = useRef(true);
  const ignoreScrollStickRef = useRef(false);
  const onUnreadChangeRef = useRef(onUnreadChange);
  onUnreadChangeRef.current = onUnreadChange;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [promoBusy, setPromoBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [composerLift, setComposerLift] = useState(0);
  const markDeliveredOnOpenRef = useRef(false);
  const composerPadBottom =
    composerLift > 0 ? spacing.md : Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 4);
  const composerMarginBottom = Platform.OS === 'android' ? composerLift : 0;

  const scrollToEnd = useCallback((animated = true, force = false) => {
    if (!force && !chatStickToBottomRef.current) return;
    ignoreScrollStickRef.current = true;
    chatStickToBottomRef.current = true;
    const scroll = () => {
      listRef.current?.scrollToEnd({ animated });
      requestAnimationFrame(() => {
        ignoreScrollStickRef.current = false;
      });
    };
    requestAnimationFrame(() => requestAnimationFrame(scroll));
  }, []);

  const onChatContentSizeChange = useCallback(() => {
    if (!chatStickToBottomRef.current) return;
    ignoreScrollStickRef.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
      requestAnimationFrame(() => {
        ignoreScrollStickRef.current = false;
      });
    });
  }, []);

  const onChatScroll = useCallback((e) => {
    if (ignoreScrollStickRef.current) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const distFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    chatStickToBottomRef.current = distFromBottom < 72;
  }, []);

  const clientMeta = useMemo(
    () => ({
      clientName: clienteRow?.nombre || sessionUser?.user_metadata?.full_name || 'Cliente',
      clientPhone: clienteRow?.telefono || null,
    }),
    [clienteRow, sessionUser],
  );

  const markSalonMessagesDelivered = useCallback(async (rows, { onlyIfViewing = false } = {}) => {
    if (onlyIfViewing && !markDeliveredOnOpenRef.current) return rows || [];
    const pendingIds = (rows || [])
      .filter((m) => m.status === 'pending_sync' && isSalonOutboundMessage(m))
      .map((m) => m.id)
      .filter((id) => id != null);
    if (!pendingIds.length) return rows || [];
    await markClientAuraDelivered(pendingIds);
    onUnreadChangeRef.current?.();
    const idSet = new Set(pendingIds.map(String));
    return (rows || []).map((m) =>
      idSet.has(String(m.id))
        ? { ...m, status: 'delivered', delivered_at: new Date().toISOString() }
        : m,
    );
  }, []);

  const loadMessages = useCallback(
    async (opts = {}) => {
      const silent = Boolean(opts.silent);
      if (!clienteRow?.id) {
        setMessages([]);
        setLoadError(null);
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      }
      const { data, error } = await fetchClientAuraMessages(MSG_FETCH_LIMIT);
      if (!silent) setLoading(false);
      if (error) {
        if (!silent) {
          setMessages([]);
          setLoadError(error.message || 'No se pudieron cargar los mensajes.');
        }
        return;
      }
      const marked = await markSalonMessagesDelivered(data || [], {
        onlyIfViewing: true,
      });
      if (clienteRow?.id) {
        auraThreadCache = { clienteId: clienteRow.id, rows: marked };
      }
      setMessages(marked);
      setLoadError(null);
      if (!silent) {
        scrollToEnd(false, true);
      } else if (chatStickToBottomRef.current) {
        scrollToEnd(false, true);
      }
    },
    [clienteRow?.id, markSalonMessagesDelivered, scrollToEnd],
  );

  const applyIncomingRow = useCallback(
    async (row) => {
      if (!row?.id) return;
      setMessages((prev) => {
        const next = mergeAuraMessage(prev, row);
        if (clienteRow?.id) auraThreadCache = { clienteId: clienteRow.id, rows: next };
        return next;
      });
      if (isInboundAuraUnread(row, sessionUser?.id)) {
        onUnreadChangeRef.current?.();
      }
      const fromSalon =
        isSalonOutboundMessage(row) && !isClientOutboundAuraMessage(row, sessionUser?.id);
      if (fromSalon) {
        chatStickToBottomRef.current = true;
        scrollToEnd(true, true);
      }
    },
    [scrollToEnd, sessionUser?.id, clienteRow?.id],
  );

  useEffect(() => {
    if (!clienteRow?.id) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }
    chatStickToBottomRef.current = true;
    markDeliveredOnOpenRef.current = false;
    const hasCache = auraThreadCache.clienteId === clienteRow.id && auraThreadCache.rows.length > 0;
    if (hasCache) {
      setMessages(auraThreadCache.rows);
      setLoading(false);
    }
    void loadMessages({ silent: hasCache });
    const openTimer = setTimeout(() => {
      markDeliveredOnOpenRef.current = true;
      void loadMessages({ silent: true });
    }, 700);
    return () => clearTimeout(openTimer);
  }, [clienteRow?.id, loadMessages]);

  useEffect(() => {
    if (!clienteRow?.id) return undefined;

    const channel = supabase
      .channel(`aura-client-sync-${clienteRow.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketing_direct_messages',
          filter: `client_id=eq.${clienteRow.id}`,
        },
        (payload) => {
          void applyIncomingRow(payload.new);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'marketing_direct_messages',
          filter: `client_id=eq.${clienteRow.id}`,
        },
        (payload) => {
          void applyIncomingRow(payload.new);
        },
      )
      .subscribe();

    const pollIv = setInterval(() => void loadMessages({ silent: true }), SYNC_POLL_MS);

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadMessages({ silent: true });
    });

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollIv);
      appSub.remove();
    };
  }, [clienteRow?.id, applyIncomingRow, loadMessages]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) => {
      setComposerLift(keyboardComposerLift(e, insets.bottom));
      if (chatStickToBottomRef.current) scrollToEnd(true, true);
    });
    const onHide = Keyboard.addListener(hideEvt, () => setComposerLift(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [insets.bottom, scrollToEnd]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMessages({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadMessages]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Necesitamos acceso a tu galería para adjuntar fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) setPendingImage(res.assets[0]);
  };

  const send = async () => {
    const text = draft.trim();
    if ((!text && !pendingImage?.uri) || sending) return;
    setSending(true);
    try {
      let mediaUrl = null;
      let mediaKind = null;
      if (pendingImage?.uri) {
        const ext = String(pendingImage?.mimeType || '').includes('png') ? 'png' : 'jpg';
        const { publicUrl, error: upErr } = await uploadMensajeMediaFromUri(pendingImage.uri, {
          extension: ext,
          contentType: pendingImage.mimeType || 'image/jpeg',
        });
        if (upErr) {
          Alert.alert(
            'Adjunto',
            `${upErr.message || 'No se pudo subir la imagen.'}\n\nEjecutá supabase-mensajes-storage.sql en Supabase (bucket "mensajes").`,
          );
          return;
        }
        mediaUrl = publicUrl;
        mediaKind = 'image';
      }

      const { data, error } = await sendClientAuraChat(text, clientMeta, {
        mediaUrl,
        mediaKind,
      });
      if (error) {
        const hint = /row-level security|permiso denegado/i.test(String(error.message || ''))
          ? '\n\nEjecutá supabase-aura-line-client-chat-media.sql en Supabase.'
          : '';
        Alert.alert('Andreas Pro', (error.message || 'No se pudo enviar.') + hint);
        return;
      }
      setDraft('');
      setPendingImage(null);
      if (data) {
        setMessages((prev) => {
          const next = mergeAuraMessage(prev, data);
          if (clienteRow?.id) auraThreadCache = { clienteId: clienteRow.id, rows: next };
          return next;
        });
        chatStickToBottomRef.current = true;
        scrollToEnd(true, true);
        onUnreadChangeRef.current?.();
      } else {
        await loadMessages({ silent: true });
      }
    } finally {
      setSending(false);
    }
  };

  const handlePromoAction = async (action, promoItem) => {
    if (promoBusy) return;
    setPromoBusy(true);
    try {
      await onPromoAction?.(action, promoItem);
    } finally {
      setPromoBusy(false);
    }
  };

  const renderItem = ({ item }) => {
    const isFromClient = isFromClientMessage(item, sessionUser?.id);
    const isInterest = isMarketingInterestMessage(item);
    const fromSalon = isSalonOutboundMessage(item) && !isFromClient && !isInterest;
    const isBroadcast = String(item.content_type || '').includes('broadcast');
    const isIncident = String(item.content_type || '') === 'incident_report';
    const isCitaConfirm = String(item.content_type || '') === 'cita_confirmacion';
    const interestSource =
      item.content_type === MARKETING_INTEREST_TYPES.CAROUSEL ? 'Carrusel inicio' : 'Tendencias';
    const citaCard = isCitaConfirm ? parseCitaConfirmacionContent(item.content) : null;
    const whenLabel = `${formatWhen(item.created_at)} · ${item.created_by_name || (fromSalon ? 'Aura Salón' : 'Vos')}`;

    if (isCitaConfirm && fromSalon && citaCard) {
      return (
        <View style={styles.postWrap}>
          <CitaConfirmacionCard data={citaCard} metaLabel={whenLabel} />
        </View>
      );
    }

    if (isBroadcast && fromSalon) {
      return (
        <View style={styles.postWrap}>
          <BroadcastPromoCard
            item={item}
            createdAtLabel={whenLabel}
            onAction={handlePromoAction}
            busy={promoBusy}
          />
        </View>
      );
    }

    if (isInterest && isFromClient) {
      return (
        <View style={styles.postWrap}>
          <MarketingInterestCard
            item={item}
            sourceLabel={interestSource}
            audience="client"
            createdAtLabel={whenLabel}
          />
        </View>
      );
    }

    return (
      <View style={[styles.bubbleWrap, fromSalon ? styles.bubbleIn : styles.bubbleOut]}>
        <View
          style={[
            styles.bubble,
            fromSalon
              ? { backgroundColor: c.card, borderColor: c.cardBorder }
              : {
                  backgroundColor: clientBubble.bg,
                  borderColor: clientBubble.border,
                },
          ]}
        >
          {isInterest ? (
            <View style={styles.badgeRow}>
              <Sparkles size={12} color={c.primary} />
              <Text style={[styles.badgeTxt, { color: c.primary }]}>
                Tu solicitud · {interestSource}
              </Text>
            </View>
          ) : null}
          {isIncident ? (
            <View style={styles.badgeRow}>
              <FileText size={12} color={c.primary} />
              <Text style={[styles.badgeTxt, { color: c.primary }]}>Reporte del salón</Text>
            </View>
          ) : null}
          {chatBubbleText(item) ? (
            <Text style={[styles.bubbleTxt, { color: c.foreground }]}>{chatBubbleText(item)}</Text>
          ) : null}
          {item.media_url && item.media_kind === 'image' ? (
            <ChatImageWithSave uri={item.media_url} imageStyle={styles.bubbleImg} btnStyle={styles.saveImgBtn} />
          ) : null}
          <Text
            style={[
              styles.bubbleMeta,
              { color: fromSalon ? c.foregroundMuted : clientBubble.meta },
            ]}
          >
            {formatWhen(item.created_at)} · {item.created_by_name || (fromSalon ? 'Aura Salón' : 'Vos')}
          </Text>
        </View>
      </View>
    );
  };

  if (!sessionUser?.id) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
          Iniciá sesión para ver mensajes del salón.
        </Text>
      </View>
    );
  }

  if (!clienteRow?.id) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
          Completá tu perfil para recibir mensajes de Andreas Pro.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.shell}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {loading && messages.length === 0 ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          style={[styles.list, styles.listFlex]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          onScroll={onChatScroll}
          scrollEventThrottle={80}
          onContentSizeChange={onChatContentSizeChange}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onPullRefresh()}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {loadError ? (
                <>
                  <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>{loadError}</Text>
                  <SalonButton
                    variant="outlineGold"
                    title="Reintentar"
                    onPress={() => void loadMessages({ silent: false })}
                    style={{ marginTop: spacing.md }}
                  />
                </>
              ) : (
                <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
                  Aún no hay mensajes. Cuando el salón te escriba o envíe una promo, aparecerán aquí.
                </Text>
              )}
            </View>
          }
        />
      )}
      <View style={{ marginBottom: composerMarginBottom }}>
      {pendingImage ? (
        <View style={[styles.previewBar, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
          <Image source={{ uri: pendingImage.uri }} style={styles.previewThumb} />
          <TouchableOpacity onPress={() => setPendingImage(null)} hitSlop={10}>
            <X size={20} color={c.foregroundMuted} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View
        style={[
          styles.composer,
          {
            borderTopColor: c.cardBorder,
            backgroundColor: c.background,
            paddingBottom: composerPadBottom,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.attachBtn, { borderColor: c.cardBorder }]}
          onPress={pickImage}
          disabled={sending}
        >
          <ImageIcon size={22} color={c.primary} />
        </TouchableOpacity>
        <View style={styles.composerInputWrap}>
          <TextInput
            style={[
              styles.composerInput,
              { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card },
            ]}
            placeholder="Escribí al salón…"
            placeholderTextColor={c.foregroundSubtle}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => {
              if (chatStickToBottomRef.current) scrollToEnd(true, true);
            }}
            multiline
            maxLength={2000}
            textAlignVertical="center"
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: c.primary, opacity: sending ? 0.6 : 1 }]}
          onPress={() => void send()}
          disabled={sending}
        >
          <Send size={20} color={c.heroCtaText} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1, minHeight: 0, backgroundColor: c.background },
    listFlex: { flex: 1, minHeight: 0 },
    list: { flex: 1, backgroundColor: c.background },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.lg,
      flexGrow: 1,
    },
    emptyWrap: { padding: spacing.lg },
    emptyTxt: { fontFamily: typography.fontSans, fontSize: 14, lineHeight: 20, textAlign: 'center' },
    bubbleWrap: { marginBottom: spacing.sm, maxWidth: '92%' },
    postWrap: {
      width: '100%',
      alignSelf: 'stretch',
      marginVertical: spacing.md,
    },
    bubbleIn: { alignSelf: 'flex-start' },
    bubbleOut: { alignSelf: 'flex-end' },
    bubble: {
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    badgeTxt: { fontFamily: typography.fontSansMedium, fontSize: 10, textTransform: 'uppercase' },
    bubbleTxt: { fontFamily: typography.fontSans, fontSize: 15, lineHeight: 22 },
    bubbleImg: { width: '100%', height: 140, borderRadius: radii.md },
    saveImgBtn: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubbleMeta: { fontFamily: typography.fontSans, fontSize: 10, marginTop: 6 },
    previewBar: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    previewThumb: {
      width: 56,
      height: 56,
      borderRadius: radii.sm,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      width: '100%',
      gap: 8,
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 8,
      borderTopWidth: 1,
    },
    attachBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    composerInputWrap: {
      flex: 1,
      minWidth: 0,
      alignSelf: 'stretch',
    },
    composerInput: {
      width: '100%',
      minHeight: 44,
      maxHeight: 132,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingTop: Platform.OS === 'ios' ? 11 : 10,
      paddingBottom: Platform.OS === 'ios' ? 11 : 10,
      fontFamily: typography.fontSans,
      fontSize: 16,
      lineHeight: 22,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  });
}
