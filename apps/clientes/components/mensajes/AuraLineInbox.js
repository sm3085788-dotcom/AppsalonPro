import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  RefreshControl,
  AppState,
  TextInput,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, FileText, CircleHelp, Download, Sparkles } from 'lucide-react-native';
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
  broadcastPreviewText,
  parseCitaConfirmacionContent,
  citaConfirmacionPreviewText,
  MARKETING_INTEREST_TYPES,
  PROMO_INVENTARIO_CONTENT_TYPE,
  promoInventarioPreviewText,
  isPromoInventarioMessage,
  fetchClientPromosVigentesForChat,
  expandAuraMessagesWithLivePromos,
  collapsePromoChatRowsForDisplay,
  isPromoIntroSalonChat,
} from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton } from '../luxury/SalonButton';
import { saveChatImageWithAlert } from '../../utils/saveChatImage';
import { BroadcastPromoCard } from './BroadcastPromoCard';
import { CitaConfirmacionCard } from './CitaConfirmacionCard';
import { MarketingInterestCard } from './MarketingInterestCard';
import { InventarioPromoChatList } from './InventarioPromoChatCard';
import { CLIENT_CHAT_QUICK_ACTIONS } from '@appsalon/shared-config';
import { keyboardComposerLift } from '../../../../shared/utils/chatKeyboard';
import { openSalonUbicacionEnMapas } from '../../utils/openSalonMap';

function chatBubbleText(item) {
  const ct = String(item.content_type || '');
  if (ct === 'cita_confirmacion') {
    return citaConfirmacionPreviewText(item.content);
  }
  if (ct.includes('broadcast')) {
    const preview = broadcastPreviewText(item.content);
    if (preview) return preview;
  }
  if (ct === PROMO_INVENTARIO_CONTENT_TYPE) {
    const preview = promoInventarioPreviewText(item.content);
    if (preview) return preview;
  }
  const t = String(item.content || '').trim();
  if (item.media_url && item.media_kind === 'image' && /^imagen$/i.test(t)) return '';
  return t;
}

function ChatImageWithSave({ uri, imageStyle, btnStyle, free = false }) {
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
    <View style={free ? { position: 'relative' } : { position: 'relative', marginTop: spacing.xs }}>
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

const SYNC_POLL_MS = 60000;
/** 30 mensajes más recientes al abrir el chat. */
const MSG_FETCH_LIMIT = 30;

/** Caché del hilo en memoria (misma idea que Andreas Pro en app salón). */
let auraThreadCache = { clienteId: null, rows: [] };

function readAuraThreadCache(clienteId) {
  const id = clienteId != null ? String(clienteId).trim() : '';
  if (!id || auraThreadCache.clienteId !== id || !auraThreadCache.rows.length) {
    return null;
  }
  return auraThreadCache.rows;
}

function writeAuraThreadCache(clienteId, rows) {
  const id = clienteId != null ? String(clienteId).trim() : '';
  if (!id) return;
  auraThreadCache = { clienteId: id, rows: rows || [] };
}

/** Precalienta el hilo en segundo plano para entrada instantánea al abrir Mensajes. */
export async function warmClientAuraThreadCache(clienteId) {
  const id = clienteId != null ? String(clienteId).trim() : '';
  if (!id) return;
  if (readAuraThreadCache(id)) return;
  const { data, error } = await fetchClientAuraMessages(MSG_FETCH_LIMIT);
  if (error || !data?.length) return;
  writeAuraThreadCache(id, data);
}

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
  const styles = useMemo(() => createStyles(c), [c]);
  const listRef = useRef(null);
  const chatStickToBottomRef = useRef(true);
  const ignoreScrollStickRef = useRef(false);
  const onUnreadChangeRef = useRef(onUnreadChange);
  onUnreadChangeRef.current = onUnreadChange;
  const clienteIdRef = useRef(clienteRow?.id ?? null);

  const initialClienteId = clienteRow?.id ?? null;
  const initialCache = readAuraThreadCache(initialClienteId);

  const [messages, setMessages] = useState(() => initialCache || []);
  const [loading, setLoading] = useState(() => {
    if (!initialClienteId) return false;
    return !initialCache?.length;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [promoBusy, setPromoBusy] = useState(false);
  const [livePromoPayloads, setLivePromoPayloads] = useState([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [composerLift, setComposerLift] = useState(0);
  const markDeliveredOnOpenRef = useRef(false);

  const refreshLivePromos = useCallback(async () => {
    const { data } = await fetchClientPromosVigentesForChat();
    setLivePromoPayloads(Array.isArray(data) ? data : []);
  }, []);

  const displayMessages = useMemo(
    () => expandAuraMessagesWithLivePromos(messages, livePromoPayloads, sessionUser?.id),
    [messages, livePromoPayloads, sessionUser?.id],
  );

  const listData = useMemo(
    () => collapsePromoChatRowsForDisplay(displayMessages, sessionUser?.id),
    [displayMessages, sessionUser?.id],
  );

  const composerPadBottom =
    composerLift > 0 ? spacing.sm : Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 4);

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
      if (String(clienteIdRef.current) !== String(clienteRow?.id)) return;

      const rows = data || [];
      if (!rows.length && !silent) {
        setLoadError(null);
      }

      const marked = await markSalonMessagesDelivered(rows, {
        onlyIfViewing: markDeliveredOnOpenRef.current,
      });
      if (String(clienteIdRef.current) !== String(clienteRow?.id)) return;

      if (clienteRow?.id) {
        writeAuraThreadCache(clienteRow.id, marked);
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

  const loadMessagesRef = useRef(loadMessages);
  loadMessagesRef.current = loadMessages;

  const applyIncomingRow = useCallback(
    async (row) => {
      if (!row?.id) return;
      setMessages((prev) => {
        const next = mergeAuraMessage(prev, row);
        if (clienteRow?.id) writeAuraThreadCache(clienteRow.id, next);
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
      if (isPromoIntroSalonChat(row, sessionUser?.id)) {
        void refreshLivePromos();
        setTimeout(() => {
          void loadMessagesRef.current({ silent: true });
        }, 1500);
      }
    },
    [scrollToEnd, sessionUser?.id, clienteRow?.id, refreshLivePromos],
  );

  useEffect(() => {
    clienteIdRef.current = clienteRow?.id ?? null;
  }, [clienteRow?.id]);

  useEffect(() => {
    if (!clienteRow?.id) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }
    chatStickToBottomRef.current = true;
    markDeliveredOnOpenRef.current = true;
    setLoadError(null);
    const cached = readAuraThreadCache(clienteRow.id);
    if (cached?.length) {
      setMessages(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    void loadMessages({ silent: Boolean(cached?.length) });
    void refreshLivePromos();
    return undefined;
  }, [clienteRow?.id, loadMessages, refreshLivePromos]);

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

  const clientMeta = useMemo(
    () => ({
      clientName: clienteRow?.nombre || sessionUser?.user_metadata?.full_name || 'Cliente',
      clientPhone: clienteRow?.telefono || null,
    }),
    [clienteRow, sessionUser],
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadMessages({ silent: true }), refreshLivePromos()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadMessages, refreshLivePromos]);

  const dispatchOutgoingMessage = useCallback(
    async (text) => {
      const trimmed = String(text || '').trim();
      if (!trimmed || sending) return false;
      setSending(true);
      try {
        const { data, error } = await sendClientAuraChat(trimmed, clientMeta, {});
        if (error) {
          const hint = /row-level security|permiso denegado/i.test(String(error.message || ''))
            ? '\n\nEjecutá supabase-aura-line-client-chat-media.sql en Supabase.'
            : '';
          Alert.alert('Andreas Pro', (error.message || 'No se pudo enviar.') + hint);
          return false;
        }
        if (data) {
          setMessages((prev) => {
            const next = mergeAuraMessage(prev, data);
            if (clienteRow?.id) writeAuraThreadCache(clienteRow.id, next);
            return next;
          });
          chatStickToBottomRef.current = true;
          scrollToEnd(true, true);
          onUnreadChangeRef.current?.();
        } else {
          await loadMessages({ silent: true });
        }
        return true;
      } finally {
        setSending(false);
      }
    },
    [sending, clientMeta, clienteRow?.id, loadMessages, scrollToEnd],
  );

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const ok = await dispatchOutgoingMessage(text);
    if (ok) {
      setDraft('');
      setShowQuickActions(false);
    }
  };

  const pickQuickAction = (message) => {
    setDraft(String(message || '').trim());
    setShowQuickActions(false);
  };

  const hasDraft = Boolean(draft.trim());

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

    if (isCitaConfirm && !isFromClient && citaCard) {
      return (
        <View style={styles.postWrap}>
          <CitaConfirmacionCard
            data={citaCard}
            metaLabel={whenLabel}
            onUbicacionPress={() => void openSalonUbicacionEnMapas()}
          />
        </View>
      );
    }

    if (isBroadcast && !isFromClient) {
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

    if (item.__promoList && !isFromClient) {
      return (
        <View style={styles.promoPostWrap}>
          <InventarioPromoChatList
            items={item.promos}
            onAction={handlePromoAction}
            busy={promoBusy}
          />
        </View>
      );
    }

    if (isPromoInventarioMessage(item) && !isFromClient) {
      return (
        <View style={styles.promoPostWrap}>
          <InventarioPromoChatList
            items={[item]}
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

    const bubbleText = chatBubbleText(item);
    const hasImage = Boolean(item.media_url && item.media_kind === 'image');
    const salonFreeImage = fromSalon && hasImage && !isInterest && !isIncident;
    const metaLabel = `${formatWhen(item.created_at)} · ${item.created_by_name || 'Aura Salón'}`;

    if (salonFreeImage) {
      return (
        <View style={[styles.bubbleWrap, styles.bubbleIn]}>
          {bubbleText ? (
            <View
              style={[
                styles.bubble,
                { backgroundColor: c.card, borderColor: c.cardBorder, marginBottom: spacing.xs },
              ]}
            >
              {isIncident ? (
                <View style={styles.badgeRow}>
                  <FileText size={12} color={c.primary} />
                  <Text style={[styles.badgeTxt, { color: c.primary }]}>Reporte del salón</Text>
                </View>
              ) : null}
              <Text style={[styles.bubbleTxt, { color: c.foreground }]}>{bubbleText}</Text>
            </View>
          ) : null}
          <ChatImageWithSave
            uri={item.media_url}
            imageStyle={styles.bubbleImgFree}
            btnStyle={styles.saveImgBtn}
            free
          />
          <Text style={[styles.bubbleMetaFree, { color: c.foregroundMuted }]}>{metaLabel}</Text>
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
          {bubbleText ? (
            <Text style={[styles.bubbleTxt, { color: c.foreground }]}>{bubbleText}</Text>
          ) : null}
          {hasImage ? (
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
    <View style={styles.shell}>
      {loading && messages.length === 0 ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={listData}
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
      <View style={{ paddingBottom: composerPadBottom, marginBottom: composerLift }}>
        {showQuickActions ? (
          <View style={[styles.quickActionsPanel, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
            <Text style={[styles.quickActionsTitle, { color: c.foreground }]}>
              ¿En qué te podemos ayudar?
            </Text>
            <Text style={[styles.quickActionsHint, { color: c.foregroundMuted }]}>
              Elegí una opción o escribí tu mensaje abajo.
            </Text>
            <View style={styles.quickActionsGrid}>
              {CLIENT_CHAT_QUICK_ACTIONS.map((action) => {
                const picked = draft.trim() === action.message.trim();
                return (
                  <TouchableOpacity
                    key={action.id}
                    style={[
                      styles.quickActionChip,
                      {
                        borderColor: picked ? c.primary : c.cardBorder,
                        backgroundColor: picked ? `${c.primary}18` : c.surfaceMuted,
                      },
                    ]}
                    onPress={() => pickQuickAction(action.message)}
                    disabled={sending}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Text style={[styles.quickActionChipTxt, { color: c.foreground }]}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
        <View
          style={[
            styles.composer,
            {
              borderTopColor: c.cardBorder,
              backgroundColor: c.background,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.composerIconBtn,
              {
                borderColor: showQuickActions ? c.primary : c.cardBorder,
                backgroundColor: showQuickActions ? `${c.primary}18` : 'transparent',
              },
            ]}
            onPress={() => setShowQuickActions((v) => !v)}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Sugerencias de mensaje"
          >
            <CircleHelp size={22} color={c.primary} strokeWidth={2.2} />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.composerInput,
              { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card },
            ]}
            placeholder="Mensaje…"
            placeholderTextColor={c.foregroundMuted}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => {
              if (chatStickToBottomRef.current) scrollToEnd(true, true);
            }}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.composerIconBtn,
              styles.sendBtn,
              {
                backgroundColor: c.primary,
                opacity: sending || !hasDraft ? 0.45 : 1,
              },
            ]}
            onPress={() => void send()}
            disabled={sending || !hasDraft}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
          >
            <Send size={20} color={c.heroCtaText} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    promoPostWrap: {
      width: '100%',
      alignSelf: 'stretch',
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
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
    bubbleImgFree: { width: '100%', height: 200, borderRadius: radii.lg },
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
    bubbleMetaFree: { fontFamily: typography.fontSans, fontSize: 10, marginTop: 4 },
    quickActionsPanel: {
      borderTopWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    quickActionsTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      marginBottom: 2,
    },
    quickActionsHint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.sm,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    quickActionChip: {
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    quickActionChipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      alignSelf: 'stretch',
      width: '100%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
    },
    composerInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      maxHeight: 120,
      fontFamily: typography.fontSans,
      fontSize: 15,
      marginBottom: 2,
    },
    composerIconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sendBtn: {
      borderWidth: 0,
    },
  });
}
