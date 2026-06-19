import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  Pressable,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  ChevronRight,
  Image as ImageIcon,
  Megaphone,
  Bell,
  Send,
  Sparkles,
  X,
  FileText,
  Check,
  Download,
  CircleHelp,
} from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  db,
  supabase,
  uploadMensajeMediaFromUri,
  isClienteAppVerificado,
  isClienteManual,
  formatBroadcastContent,
  parseBroadcastContent,
  broadcastPreviewText,
  citaConfirmacionPreviewText,
  mapInventarioToTiendaProduct,
  BROADCAST_LINK_TYPES,
  notifyClientFromMdmId,
  sendSalonAuraMessage,
  CHAT_QUICK_INTENTS,
  matchChatQuickIntent,
  getSalonSessionProfile,
  isSalonGlobalAdmin,
  getChatAutomationSettings,
  setChatAutomationEnabled,
  isPromoInventarioMessage,
  expandAuraMessagesWithLivePromos,
  collapsePromoChatRowsForDisplay,
  fetchClientPromosVigentesForChat,
} from '@appsalon/shared-config';
import { getArticuloTipo } from '../../../shared/config/inventarioMeta.js';

function inventarioEntryCoverUri(entry) {
  const mapped = entry?.mapped;
  const row = entry?.row;
  if (mapped?.imageUri) return mapped.imageUri;
  if (row?.imagen_url) return row.imagen_url;
  const imgs = Array.isArray(row?.imagenes_urls) ? row.imagenes_urls.filter(Boolean) : [];
  return imgs[0] || null;
}

function resolvePromoLinkToggle(currentLink, entry) {
  const on =
    currentLink?.type === entry.tipo && String(currentLink.id) === String(entry.row.id);
  if (on) return { link: null, cover: null };
  return {
    link: {
      type: entry.tipo,
      id: entry.row.id,
      name: entry.mapped?.title || entry.row.nombre,
      priceLabel: entry.mapped?.priceLabel || null,
    },
    cover: inventarioEntryCoverUri(entry),
  };
}
import { BroadcastPromoCard } from '../../clientes/components/mensajes/BroadcastPromoCard';
import { InventarioPromoChatList } from '../../../shared/components/PromoInventarioListCard';
import { MarketingInterestCard } from '../../clientes/components/mensajes/MarketingInterestCard';
import { SubScreenChrome, SalonButton, useSubStyles, modalSheetBottomPad, modalScrollBottomPad } from '../components/luxury';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { useTheme } from '../theme/ThemeProvider';
import { saveChatImageWithAlert } from '../utils/saveChatImage';
import { isSalonInboundClientMessage } from '../utils/salonMensajesInbound';
import { keyboardComposerLift } from '../../../shared/utils/chatKeyboard';

/** Caché en memoria para entrada suave al reabrir Andreas Pro. */
let inboxCache = null;
/** Hilos de chat por cliente (evita vaciar la lista al reabrir). */
const chatCacheByClient = new Map();

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

function ChatBubbleImage({ uri, style, saveBtnStyle }) {
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
    <View style={{ position: 'relative', marginTop: spacing.sm }}>
      <Image source={{ uri }} style={style} resizeMode="cover" />
      <TouchableOpacity
        style={saveBtnStyle}
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

const BULK_CHUNK = 80;
const MENSAJES_SEEN_BY_CLIENT_KEY = '@appsalon/salon/mensajes_seen_by_client';
const INBOX_PREVIEW_TYPES = new Set([
  'chat',
  'broadcast_promo',
  'incident_report',
  'cita_confirmacion',
  'tendencias_interest',
  'carousel_interest',
]);
const INBOX_OPEN_HINT = 'Tocá para abrir Andreas Pro';
/** Mismo verde que Clientes para fichas manuales (sin App Clientes). */
const MINT = { chip: '#C8E6C9', chipText: '#1B5E20' };

function inboxPreviewTime(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Orden WhatsApp: conversación más reciente arriba; sin mensajes al final (nombre A–Z). */
function compareInboxRows(a, b) {
  const ta = inboxPreviewTime(a.lastAt);
  const tb = inboxPreviewTime(b.lastAt);
  if (ta !== tb) return tb - ta;
  if (!ta && !tb) {
    return String(a.client?.nombre || '').localeCompare(String(b.client?.nombre || ''), 'es');
  }
  return 0;
}

function isInboxPreviewMessage(row) {
  if (!row?.client_id) return false;
  const t = row.content_type;
  if (!t) return true;
  return INBOX_PREVIEW_TYPES.has(t);
}

function mergeInboxPreview(prev, row) {
  if (!isInboxPreviewMessage(row)) return prev;
  const list = [...(prev || [])];
  const idx = list.findIndex((m) => m.client_id === row.client_id);
  const incoming = inboxPreviewTime(row.created_at);
  if (idx >= 0) {
    if (incoming <= inboxPreviewTime(list[idx].created_at)) return prev;
    list[idx] = { ...list[idx], ...row };
    return list;
  }
  return [...list, row];
}

function initials(name) {
  const p = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return '?';
}

function ClientAvatar({ client, size = 34, styles, c, letterColor, emptyBg }) {
  const uri = String(client?.photo_url || '').trim();
  const radius = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.rowAvatar, { width: size, height: size, borderRadius: radius }]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.rowAvatar,
        styles.rowAvatarEmpty,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: emptyBg || c.surfaceMuted,
        },
      ]}
    >
      <Text
        style={[
          styles.rowAvatarLetter,
          { color: letterColor || c.foregroundMuted, fontSize: Math.round(size * 0.38) },
        ]}
      >
        {initials(client?.nombre)}
      </Text>
    </View>
  );
}

function NewMessageBell({ size = 14 }) {
  const swing = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, { toValue: -1, duration: 110, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(swing, { toValue: 1, duration: 160, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(swing, { toValue: -0.8, duration: 140, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(swing, { toValue: 0, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [swing]);

  return (
    <Animated.View
      style={{
        transform: [
          {
            rotate: swing.interpolate({
              inputRange: [-1, 1],
              outputRange: ['-14deg', '14deg'],
            }),
          },
        ],
      }}
    >
      <Bell size={size} color="#FFFFFF" strokeWidth={2.4} />
    </Animated.View>
  );
}

function buildInboxRows(allClients, previews) {
  const lastBy = new Map();
  for (const m of previews || []) {
    if (!m?.client_id) continue;
    if (!isInboxPreviewMessage(m)) continue;
    const prev = lastBy.get(m.client_id);
    if (!prev || inboxPreviewTime(m.created_at) > inboxPreviewTime(prev.created_at)) lastBy.set(m.client_id, m);
  }
  const rows = (allClients || []).map((c) => {
    const last = lastBy.get(c.id);
    return {
      client: c,
      preview: last
        ? String(last.content_type || '').includes('broadcast')
          ? broadcastPreviewText(last.content) || INBOX_OPEN_HINT
          : String(last.content_type || '') === 'cita_confirmacion'
            ? citaConfirmacionPreviewText(last.content) || INBOX_OPEN_HINT
            : last.content_type === 'tendencias_interest' || last.content_type === 'carousel_interest'
              ? String(last.content || '').split('\n')[0] || 'Interés · publicación'
              : last.content || INBOX_OPEN_HINT
        : INBOX_OPEN_HINT,
      lastAt: last?.created_at || null,
    };
  });
  return rows.sort(compareInboxRows);
}

function guessExt(uri, mime) {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'jpg';
  const m = String(uri || '').match(/\.([a-z0-9]+)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

export function MensajesScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);
  const listRef = useRef(null);
  const chatStickToBottomRef = useRef(true);
  const ignoreScrollStickRef = useRef(false);
  const selectedClientIdRef = useRef(null);
  const sel = useListSelection();

  const [clients, setClients] = useState(() => inboxCache?.clients ?? []);
  const [inboxPreviews, setInboxPreviews] = useState(() => inboxCache?.previews ?? []);
  const [inboxQuery, setInboxQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortMode, setSortMode] = useState('nombre_asc');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [broadcastOnlyIds, setBroadcastOnlyIds] = useState(null);
  const [loadingInbox, setLoadingInbox] = useState(() => !inboxCache);
  const [refreshingInbox, setRefreshingInbox] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [livePromoPayloads, setLivePromoPayloads] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [composerLift, setComposerLift] = useState(0);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [clientDataOpen, setClientDataOpen] = useState(false);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoBody, setPromoBody] = useState('');
  const [promoCoverUrl, setPromoCoverUrl] = useState(null);
  const [promoLink, setPromoLink] = useState(null);
  const [promoCatalog, setPromoCatalog] = useState([]);
  const [promoCatalogLoading, setPromoCatalogLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [staffUserId, setStaffUserId] = useState(null);
  const [seenByClient, setSeenByClient] = useState({});
  const [inboxHydrated, setInboxHydrated] = useState(false);
  const [unreadClientIds, setUnreadClientIds] = useState(() => new Set());
  const [showSalonQuickReplies, setShowSalonQuickReplies] = useState(false);
  const [chatAutomationEnabled, setChatAutomationEnabled] = useState(false);
  const [chatAutomationLoading, setChatAutomationLoading] = useState(false);
  const [chatAutomationSaving, setChatAutomationSaving] = useState(false);

  const isMatriz = useMemo(() => isSalonGlobalAdmin(getSalonSessionProfile()?.role), []);

  useEffect(() => {
    if (!isMatriz) return undefined;
    let cancelled = false;
    setChatAutomationLoading(true);
    (async () => {
      const { data, error } = await getChatAutomationSettings();
      if (cancelled) return;
      if (!error && data) setChatAutomationEnabled(Boolean(data.enabled));
      setChatAutomationLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMatriz]);

  const onToggleChatAutomation = useCallback(async (next) => {
    if (!isMatriz || chatAutomationSaving) return;
    setChatAutomationSaving(true);
    const prev = chatAutomationEnabled;
    setChatAutomationEnabled(next);
    try {
      const { data, error } = await setChatAutomationEnabled(next);
      if (error) throw error;
      if (data) setChatAutomationEnabled(Boolean(data.enabled));
    } catch (e) {
      setChatAutomationEnabled(prev);
      Alert.alert(
        'Respuestas automáticas',
        e?.message || 'No se pudo actualizar. Ejecutá supabase-n8n-chat-automation.sql en Supabase.',
      );
    } finally {
      setChatAutomationSaving(false);
    }
  }, [chatAutomationEnabled, chatAutomationSaving, isMatriz]);

  const padList = Math.max(insets.bottom + spacing.md, spacing.lg);
  const padBottom = padList;
  const composerPadBottom =
    composerLift > 0 ? spacing.md : Math.max(insets.bottom, spacing.xs);
  const composerMarginBottom = Platform.OS === 'android' ? composerLift : 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: { user } }, raw] = await Promise.all([
        supabase.auth.getUser(),
        AsyncStorage.getItem(MENSAJES_SEEN_BY_CLIENT_KEY),
      ]);
      if (cancelled) return;
      setStaffUserId(user?.id ?? null);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') setSeenByClient(parsed);
        } catch {
          // noop
        }
      }
      setInboxHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!broadcastOpen) return undefined;
    let cancelled = false;
    setPromoCatalogLoading(true);
    (async () => {
      const { data, error } = await db.inventario.getCatalogoAppClientes();
      if (cancelled) return;
      if (!error && Array.isArray(data)) {
        setPromoCatalog(
          data
            .map((row) => {
              const articuloTipo = getArticuloTipo(row);
              const isServicio = articuloTipo === 'servicio';
              if (!isServicio && !row.visible_en_tienda) return null;
              const mapped = mapInventarioToTiendaProduct(row);
              return {
                row,
                tipo: isServicio ? BROADCAST_LINK_TYPES.SERVICE : BROADCAST_LINK_TYPES.PRODUCT,
                mapped,
              };
            })
            .filter(Boolean),
        );
      } else {
        setPromoCatalog([]);
      }
      setPromoCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [broadcastOpen]);

  const markClientSeen = useCallback(async (clientId) => {
    const id = String(clientId || '');
    if (!id) return;
    const nowIso = new Date().toISOString();
    setSeenByClient((prev) => {
      const next = { ...prev, [id]: nowIso };
      void AsyncStorage.setItem(MENSAJES_SEEN_BY_CLIENT_KEY, JSON.stringify(next));
      return next;
    });
    setUnreadClientIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const refreshUnreadByClient = useCallback(async () => {
    if (!staffUserId || !inboxHydrated) return;
    const { data, error } = await db.marketingDirectMessages.getRecentForInbox(700);
    if (error) return;
    const next = new Set();
    for (const row of data || []) {
      if (!isSalonInboundClientMessage(row, staffUserId)) continue;
      const clientId = String(row.client_id);
      const createdMs = new Date(row.created_at).getTime();
      const seenMs = seenByClient?.[clientId] ? new Date(seenByClient[clientId]).getTime() : 0;
      if (!Number.isFinite(createdMs)) continue;
      if (!seenMs || createdMs > seenMs) next.add(clientId);
    }
    setUnreadClientIds((prev) => {
      if (prev.size === next.size && [...prev].every((id) => next.has(id))) return prev;
      return next;
    });
  }, [seenByClient, staffUserId, inboxHydrated]);

  const loadInbox = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) setLoadingInbox(true);
    try {
      const [cRes, pRes] = await Promise.all([
        db.clientes.getAll(),
        db.marketingDirectMessages.getInboxPreviewsByClient(),
      ]);
      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;
      const clientList = cRes.data || [];
      const previews = pRes.data || [];
      inboxCache = { clients: clientList, previews };
      setClients(clientList);
      setInboxPreviews(previews);
    } catch (e) {
      if (!silent) {
        Alert.alert('Andreas Pro', e?.message || 'No se pudo cargar la bandeja.');
      }
      if (!inboxCache) {
        setClients([]);
        setInboxPreviews([]);
      }
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  const onInboxRefresh = useCallback(async () => {
    setRefreshingInbox(true);
    try {
      await loadInbox({ silent: true });
      await refreshUnreadByClient();
    } finally {
      setRefreshingInbox(false);
    }
  }, [loadInbox, refreshUnreadByClient]);

  useEffect(() => {
    void loadInbox({ silent: Boolean(inboxCache) });
  }, [loadInbox]);

  useEffect(() => {
    void refreshUnreadByClient();
  }, [refreshUnreadByClient]);

  useEffect(() => {
    const channel = supabase
      .channel('andreas-pro-inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketing_direct_messages',
        },
        (payload) => {
          const row = payload.new;
          if (!row?.client_id) return;
          setInboxPreviews((prev) => mergeInboxPreview(prev, row));
          void refreshUnreadByClient();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshUnreadByClient]);

  const verifiedClients = useMemo(() => clients.filter((cl) => isClienteAppVerificado(cl)), [clients]);

  const inboxRowsBase = useMemo(
    () => buildInboxRows(clients, inboxPreviews),
    [clients, inboxPreviews],
  );

  const inboxRows = useMemo(() => {
    let rows = inboxRowsBase;
    if (filterTipo === 'manual') rows = rows.filter((r) => isClienteManual(r.client));
    if (filterTipo === 'app') rows = rows.filter((r) => isClienteAppVerificado(r.client));

    const q = inboxQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const blob = [r.client.nombre, r.client.telefono, r.client.email, r.preview].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }

    const sorted = [...rows];
    if (sortMode === 'nombre_asc') {
      sorted.sort((a, b) =>
        String(a.client?.nombre || '').localeCompare(String(b.client?.nombre || ''), 'es', { sensitivity: 'base' }),
      );
    } else if (sortMode === 'nombre_desc') {
      sorted.sort((a, b) =>
        String(b.client?.nombre || '').localeCompare(String(a.client?.nombre || ''), 'es', { sensitivity: 'base' }),
      );
    } else if (sortMode === 'reciente') {
      sorted.sort(compareInboxRows);
    }
    return sorted;
  }, [inboxRowsBase, filterTipo, inboxQuery, sortMode]);

  const filtroResumen = useMemo(() => {
    const orden =
      sortMode === 'nombre_desc' ? 'Nombre Z → A' : sortMode === 'reciente' ? 'Más recientes' : 'Nombre A → Z';
    const tipo =
      filterTipo === 'manual'
        ? 'Solo manual'
        : filterTipo === 'app'
          ? 'Solo verificados'
          : 'Todos los orígenes';
    return `${orden} · ${tipo}`;
  }, [sortMode, filterTipo]);

  const openClientChat = useCallback(
    async (client) => {
      if (!client?.id) return;
      if (!isClienteAppVerificado(client)) {
        Alert.alert(
          'Sin App Clientes',
          `${client.nombre || 'Este cliente'} es una ficha manual. Andreas Pro solo envía mensajes a clientes verificados en App Clientes (con cuenta vinculada).`,
        );
        return;
      }
      try {
        await markClientSeen(client.id);
      } catch {
        // no bloquear apertura del chat si falla persistir "visto"
      }
      chatStickToBottomRef.current = true;
      const id = String(client.id);
      const cached = chatCacheByClient.get(id);
      setMessages(cached?.length ? cached : []);
      setLoadingChat(!cached?.length);
      setSelectedClient(client);
    },
    [markClientSeen],
  );

  const inboxListEmpty = useMemo(() => {
    const q = inboxQuery.trim();
    const hasFilter = filterTipo !== 'todos' || Boolean(q);
    return (
      <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
        {clients.length === 0
          ? 'No hay clientes registrados.'
          : hasFilter
            ? 'Ningún resultado con la búsqueda o filtros actuales.'
            : 'Ningún resultado.'}
      </Text>
    );
  }, [clients.length, filterTipo, inboxQuery, c.foregroundMuted]);

  const scrollChatToEnd = useCallback((animated = true, force = false) => {
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

  const refreshLivePromos = useCallback(async () => {
    const { data } = await fetchClientPromosVigentesForChat();
    setLivePromoPayloads(Array.isArray(data) ? data : []);
  }, []);

  const clientAppUserId = selectedClient?.user_id ?? null;
  const chatDisplayMessages = useMemo(
    () => expandAuraMessagesWithLivePromos(messages, livePromoPayloads, clientAppUserId),
    [messages, livePromoPayloads, clientAppUserId],
  );
  const chatListData = useMemo(
    () => collapsePromoChatRowsForDisplay(chatDisplayMessages, clientAppUserId),
    [chatDisplayMessages, clientAppUserId],
  );

  const loadChat = useCallback(async (clientId, opts = {}) => {
    const id = String(clientId || '');
    const silent = Boolean(opts.silent);
    if (!silent) setLoadingChat(true);
    try {
      const { data, error } = await db.marketingDirectMessages.getByClient(clientId, { limit: 30 });
      if (String(selectedClientIdRef.current) !== id) return;
      if (error) throw error;
      const sorted = [...(data || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      if (String(selectedClientIdRef.current) !== id) return;
      chatCacheByClient.set(id, sorted);
      setMessages(sorted);
      void refreshLivePromos();
      chatStickToBottomRef.current = true;
      if (!silent || sorted.length) scrollChatToEnd(false, true);
    } catch (e) {
      if (String(selectedClientIdRef.current) === id) {
        if (!silent) {
          Alert.alert('Chat', e?.message || 'No se pudieron cargar los mensajes.');
          setMessages([]);
        }
      }
    } finally {
      if (String(selectedClientIdRef.current) === id) setLoadingChat(false);
    }
  }, [scrollChatToEnd, refreshLivePromos]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) => {
      setComposerLift(keyboardComposerLift(e, insets.bottom));
      if (chatStickToBottomRef.current) scrollChatToEnd(true, true);
    });
    const onHide = Keyboard.addListener(hideEvt, () => setComposerLift(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [insets.bottom, scrollChatToEnd]);

  useEffect(() => {
    selectedClientIdRef.current = selectedClient?.id ? String(selectedClient.id) : null;
    setShowSalonQuickReplies(false);
    if (!selectedClient?.id) {
      setMessages([]);
      setLoadingChat(false);
      return undefined;
    }
    chatStickToBottomRef.current = true;
    const id = String(selectedClient.id);
    const cached = chatCacheByClient.get(id);
    loadChat(selectedClient.id, { silent: Boolean(cached?.length) });

    const mergeChatRow = (row) => {
      if (!row?.id) return;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === row.id);
        let next;
        if (idx >= 0) {
          next = [...prev];
          next[idx] = row;
        } else {
          next = [...prev, row];
        }
        const sorted = next.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        chatCacheByClient.set(id, sorted);
        return sorted;
      });
      scrollChatToEnd(true, false);
    };

    const channel = supabase
      .channel(`aura-line-${selectedClient.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketing_direct_messages',
          filter: `client_id=eq.${selectedClient.id}`,
        },
        (payload) => mergeChatRow(payload.new),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'marketing_direct_messages',
          filter: `client_id=eq.${selectedClient.id}`,
        },
        (payload) => mergeChatRow(payload.new),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient?.id, loadChat, scrollChatToEnd]);

  const getSenderMeta = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const name =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      'Equipo salón';
    return { id: user?.id || null, name };
  }, []);

  const lastInboundChatMessage = useMemo(() => {
    if (!staffUserId || !messages?.length) return null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      const ct = String(m.content_type || 'chat');
      if (ct !== 'chat') continue;
      const fromClient =
        (m.created_by && m.created_by !== staffUserId) ||
        (!m.created_by && m.client_id === selectedClient?.id);
      if (fromClient) return m;
    }
    return null;
  }, [messages, staffUserId, selectedClient?.id]);

  const matchedQuickIntent = useMemo(() => {
    if (!lastInboundChatMessage) return null;
    const text = chatBubbleText(lastInboundChatMessage) || lastInboundChatMessage.content;
    return matchChatQuickIntent(text);
  }, [lastInboundChatMessage]);

  const applySalonSuggestedReply = useCallback((intent) => {
    if (!intent?.salonReply) return;
    setDraft(intent.salonReply);
    setShowSalonQuickReplies(false);
  }, []);

  const sendChatMessage = async () => {
    if (!selectedClient) return;
    if (!isClienteAppVerificado(selectedClient)) {
      Alert.alert('Sin App Clientes', 'No podés enviar mensajes a fichas manuales.');
      return;
    }
    const text = draft.trim();
    if (!text && !pendingImage) {
      Alert.alert('Andreas Pro', 'Escribí un mensaje o adjuntá una foto.');
      return;
    }
    setSending(true);
    try {
      const sender = await getSenderMeta();
      let mediaUrl = null;
      let mediaKind = null;
      if (pendingImage?.uri) {
        const ext = guessExt(pendingImage.uri, pendingImage.mimeType);
        const { publicUrl, error: upErr } = await uploadMensajeMediaFromUri(pendingImage.uri, {
          extension: ext,
          contentType: pendingImage.mimeType || 'image/jpeg',
        });
        if (upErr) {
          Alert.alert(
            'Adjunto',
            `${upErr.message || 'Error al subir'}\n\nEjecutá supabase-mensajes-storage.sql en Supabase (bucket "mensajes" + políticas).`,
          );
          setSending(false);
          return;
        }
        mediaUrl = publicUrl;
        mediaKind = 'image';
      }
      const content = text || (mediaUrl ? 'Imagen' : ' ');
      const { data, error } = await sendSalonAuraMessage({
        client_id: selectedClient.id,
        client_name: selectedClient.nombre,
        client_phone: selectedClient.telefono || null,
        content,
        content_type: 'chat',
        media_url: mediaUrl,
        media_kind: mediaKind,
        status: 'pending_sync',
        created_by_name: sender.name,
      });
      if (error) throw error;
      if (data) {
        void notifyClientFromMdmId(data.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          const sorted = [...prev, data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          chatCacheByClient.set(String(selectedClient.id), sorted);
          return sorted;
        });
        setInboxPreviews((prev) => mergeInboxPreview(prev, data));
        chatStickToBottomRef.current = true;
        scrollChatToEnd(true, true);
      }
      setDraft('');
      setPendingImage(null);
    } catch (e) {
      Alert.alert('Envío', e?.message || 'No se pudo enviar.');
    } finally {
      setSending(false);
    }
  };

  const pickChatImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Necesitamos acceso a la galería.');
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

  const runBroadcast = async () => {
    const title = promoTitle.trim();
    const body = promoBody.trim();
    if (!body) {
      Alert.alert('Pulso masivo', 'Escribí el texto de la promoción.');
      return;
    }
    const content = formatBroadcastContent({
      title,
      body,
      linkType: promoLink?.type || null,
      linkId: promoLink?.id || null,
      linkName: promoLink?.name || null,
      linkPriceLabel: promoLink?.priceLabel || null,
    });
    setBroadcasting(true);
    try {
      const sender = await getSenderMeta();
      let mediaUrl = null;
      let mediaKind = null;
      const cover = String(promoCoverUrl || '').trim();
      if (cover) {
        if (/^https?:\/\//i.test(cover)) {
          mediaUrl = cover;
          mediaKind = 'image';
        } else if (cover.startsWith('file://')) {
          const ext = guessExt(cover, 'image/jpeg');
          const { publicUrl, error: upErr } = await uploadMensajeMediaFromUri(cover, {
            extension: ext,
            contentType: 'image/jpeg',
          });
          if (upErr) {
            Alert.alert(
              'Adjunto',
              `${upErr.message || 'No se pudo subir la portada de la campaña.'}\n\nEjecutá supabase-mensajes-storage.sql en Supabase.`,
            );
            setBroadcasting(false);
            return;
          }
          mediaUrl = publicUrl;
          mediaKind = 'image';
        }
      }
      const targets = broadcastOnlyIds?.size
        ? verifiedClients.filter((cl) => broadcastOnlyIds.has(String(cl.id)))
        : verifiedClients;
      const skipped = clients.length - verifiedClients.length;
      if (!targets.length) {
        Alert.alert(
          'Pulso masivo',
          skipped > 0
            ? `Hay ${clients.length} cliente(s) en la base, pero ninguno tiene App Clientes verificada.`
            : 'No hay clientes en la base.',
        );
        setBroadcasting(false);
        return;
      }
      let sent = 0;
      let failed = 0;
      for (let i = 0; i < targets.length; i += BULK_CHUNK) {
        const slice = targets.slice(i, i + BULK_CHUNK);
        const results = await Promise.all(
          slice.map((cl) =>
            sendSalonAuraMessage({
              client_id: cl.id,
              client_name: cl.nombre,
              client_phone: cl.telefono || null,
              content,
              content_type: 'broadcast_promo',
              media_url: mediaUrl,
              media_kind: mediaKind,
              status: 'pending_sync',
              created_by_name: sender.name,
            }),
          ),
        );
        for (const res of results) {
          if (res.error || !res.data?.id) failed += 1;
          else {
            sent += 1;
            const cid = String(res.data.client_id);
            const prev = chatCacheByClient.get(cid) || [];
            if (!prev.some((m) => m.id === res.data.id)) {
              chatCacheByClient.set(
                cid,
                [...prev, res.data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
              );
            }
          }
        }
      }
      if (!sent && failed) {
        throw new Error('No se pudo enviar la difusión. Verificá permisos de salón en Supabase.');
      }
      const skipNote =
        skipped > 0 ? ` (${skipped} ficha${skipped === 1 ? '' : 's'} manual omitida${skipped === 1 ? '' : 's'})` : '';
      const failNote = failed > 0 ? ` (${failed} no se enviaron)` : '';
      Alert.alert(
        'Pulso masivo',
        `Se enviaron ${sent} mensajes a clientes con App Clientes${failNote}${skipNote}.`,
      );
      setBroadcastOpen(false);
      setBroadcastOnlyIds(null);
      setPromoTitle('');
      setPromoBody('');
      setPromoCoverUrl(null);
      setPromoLink(null);
      loadInbox();
    } catch (e) {
      Alert.alert('Pulso masivo', e?.message || 'Error al difundir.');
    } finally {
      setBroadcasting(false);
    }
  };

  const confirmSelection = useCallback(() => {
    const picked = inboxRows.filter((r) => sel.isSelected(r.client.id));
    const verified = picked.filter((r) => isClienteAppVerificado(r.client));
    if (!verified.length) {
      Alert.alert(
        'Selección',
        picked.length
          ? 'Las fichas manuales no reciben mensajes. Elegí clientes verificados con App Clientes.'
          : 'Elegí al menos un cliente.',
      );
      return;
    }
    if (verified.length === 1) {
      sel.exitSelectMode();
      setSelectedClient(verified[0].client);
      return;
    }
    setBroadcastOnlyIds(new Set(verified.map((r) => String(r.client.id))));
    sel.exitSelectMode();
    setBroadcastOpen(true);
  }, [inboxRows, sel]);

  const broadcastBtn = useMemo(
    () => (
      <TouchableOpacity
        style={styles.addPersonCircle}
        onPress={() => {
          setBroadcastOnlyIds(null);
          setBroadcastOpen(true);
        }}
        accessibilityLabel="Pulso masivo"
        hitSlop={10}
        activeOpacity={0.85}
      >
        <Megaphone size={22} color={c.foreground} strokeWidth={2.2} />
      </TouchableOpacity>
    ),
    [c.foreground, styles.addPersonCircle],
  );

  const renderInboxRow = useCallback(
    ({ item }) => {
      const { client, preview, lastAt } = item;
      const manual = isClienteManual(client);
      const fechaTxt = lastAt
        ? new Date(lastAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })
        : null;
      const subParts = manual
        ? ['Sin cuenta en App Clientes']
        : [
            client.telefono,
            preview !== INBOX_OPEN_HINT ? preview : null,
            fechaTxt,
          ].filter(Boolean);
      const picked = sel.isSelected(client.id);
      const hasUnread =
        inboxHydrated && !manual && unreadClientIds.has(String(client.id));

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (sel.active) sel.toggleId(client.id);
            else openClientChat(client);
          }}
          onLongPress={() => {
            if (!sel.active) {
              sel.setActive(true);
              sel.toggleId(client.id);
            }
          }}
          style={[
            styles.row,
            { borderBottomColor: c.cardBorder },
            picked && { backgroundColor: c.surfaceMuted },
          ]}
          accessibilityRole="button"
        >
          {sel.active ? (
            <View
              style={[
                styles.check,
                {
                  borderColor: picked ? c.primary : c.cardBorder,
                  backgroundColor: picked ? c.primary : 'transparent',
                },
              ]}
            >
              {picked ? <Check size={14} color={isDark ? '#141414' : '#fff'} strokeWidth={3} /> : null}
            </View>
          ) : null}
          <View style={styles.rowAvatarWrap}>
            <ClientAvatar client={client} styles={styles} c={c} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTopLine}>
              <Text style={[styles.rowName, { color: c.foreground }]} numberOfLines={1}>
                {client.nombre || 'Sin nombre'}
              </Text>
              <View style={styles.rowChips}>
                <View style={[styles.chip, { backgroundColor: manual ? MINT.chip : c.surfaceMuted }]}>
                  <Text style={[styles.chipTxt, { color: manual ? MINT.chipText : c.foregroundMuted }]}>
                    {manual ? 'Manual' : 'App'}
                  </Text>
                </View>
                {hasUnread ? (
                  <View style={styles.rowBellBadge}>
                    <NewMessageBell size={11} />
                  </View>
                ) : null}
              </View>
            </View>
            <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
              {subParts.length ? subParts.join(' · ') : 'Sin contacto'}
            </Text>
          </View>
          {!sel.active ? <ChevronRight size={16} color={c.foregroundSubtle} style={styles.rowChev} /> : null}
        </TouchableOpacity>
      );
    },
    [c, inboxHydrated, isDark, openClientChat, sel, styles, unreadClientIds],
  );

  const promoDraftItem = useMemo(() => {
    const content = formatBroadcastContent({
      title: promoTitle,
      body: promoBody,
      linkType: promoLink?.type || null,
      linkId: promoLink?.id || null,
      linkName: promoLink?.name || null,
      linkPriceLabel: promoLink?.priceLabel || null,
    });
    return {
      content,
      content_type: 'broadcast_promo',
      media_url: promoCoverUrl || null,
      media_kind: promoCoverUrl ? 'image' : null,
      created_at: new Date().toISOString(),
      created_by_name: 'Vista previa',
    };
  }, [promoTitle, promoBody, promoLink, promoCoverUrl]);

  const promoProducts = useMemo(
    () => promoCatalog.filter((e) => e.tipo === BROADCAST_LINK_TYPES.PRODUCT),
    [promoCatalog],
  );
  const promoServices = useMemo(
    () => promoCatalog.filter((e) => e.tipo === BROADCAST_LINK_TYPES.SERVICE),
    [promoCatalog],
  );

  const renderBubble = ({ item }) => {
    const ct = String(item.content_type || '');
    const isBroadcast = ct.includes('broadcast');
    const isIncident = ct === 'incident_report';
    const isInterest = ct === 'tendencias_interest' || ct === 'carousel_interest';
    const isInbound =
      isInterest ||
      (item.created_by && staffUserId && item.created_by !== staffUserId && !isBroadcast);
    const interestSource =
      ct === 'carousel_interest' ? 'Carrusel inicio' : ct === 'tendencias_interest' ? 'Tendencias' : null;

    if (isBroadcast && !isInbound) {
      const when = `${new Date(item.created_at).toLocaleString('es-GT', { hour: '2-digit', minute: '2-digit' })} · ${item.created_by_name || 'Salón'}`;
      return (
        <View style={styles.postWrap}>
          <BroadcastPromoCard item={item} createdAtLabel={when} readOnly />
        </View>
      );
    }

    if (item.__promoList && !isInbound) {
      return (
        <View style={styles.postWrap}>
          <InventarioPromoChatList items={item.promos} isDark={isDark} />
        </View>
      );
    }

    if (isPromoInventarioMessage(item) && !isInbound) {
      return (
        <View style={styles.postWrap}>
          <InventarioPromoChatList items={[item]} isDark={isDark} />
        </View>
      );
    }

    if (isInbound && isInterest) {
      const when = `${new Date(item.created_at).toLocaleString('es-GT', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })} · ${item.created_by_name || item.client_name || 'Cliente'}`;
      return (
        <View style={styles.postWrap}>
          <MarketingInterestCard
            item={item}
            sourceLabel={interestSource}
            audience="salon"
            createdAtLabel={when}
            colors={c}
          />
        </View>
      );
    }

    return (
      <View style={[styles.bubbleWrap, isInbound ? styles.bubbleIn : styles.bubbleOut]}>
        {isInbound ? (
          <View style={[styles.bubbleInbound, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
            {isInterest ? (
              <View style={styles.badgeRow}>
                <Sparkles size={14} color={c.primary} />
                <Text style={[styles.badgeTxt, { color: c.primary }]}>Interés · {interestSource}</Text>
              </View>
            ) : null}
            {chatBubbleText(item) ? (
              <Text style={[styles.bubbleTextIn, { color: c.foreground }]}>{chatBubbleText(item)}</Text>
            ) : null}
            {item.media_url && item.media_kind === 'image' ? (
              <ChatBubbleImage uri={item.media_url} style={styles.bubbleImg} saveBtnStyle={styles.saveImgBtn} />
            ) : null}
            <Text style={[styles.bubbleMetaIn, { color: c.foregroundMuted }]}>
              {new Date(item.created_at).toLocaleString('es-GT', { hour: '2-digit', minute: '2-digit' })} ·{' '}
              {item.created_by_name || item.client_name || 'Cliente'}
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={isIncident ? ['#5c1f33', '#7a2d45', '#9a3d58'] : ['#6D28D9', '#7C3AED', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubbleGrad}
          >
            {isIncident ? (
              <View style={styles.badgeRow}>
                <FileText size={14} color="#fff" />
                <Text style={[styles.badgeTxt, { color: '#fff' }]}>Reporte incidente</Text>
              </View>
            ) : null}
            {chatBubbleText(item) ? <Text style={styles.bubbleText}>{chatBubbleText(item)}</Text> : null}
            {item.media_url && item.media_kind === 'image' ? (
              <ChatBubbleImage uri={item.media_url} style={styles.bubbleImg} saveBtnStyle={styles.saveImgBtn} />
            ) : null}
            <Text style={styles.bubbleMeta}>
              {new Date(item.created_at).toLocaleString('es-GT', { hour: '2-digit', minute: '2-digit' })} ·{' '}
              {item.created_by_name || 'Salón'}
            </Text>
          </LinearGradient>
        )}
      </View>
    );
  };

  const broadcastModal = (
    <Modal visible={broadcastOpen} animationType="fade" transparent onRequestClose={() => setBroadcastOpen(false)}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.modalDim} activeOpacity={1} onPress={() => !broadcasting && setBroadcastOpen(false)} />
        <View style={[styles.modalSheet, { backgroundColor: c.background }]}>
          <LinearGradient colors={['#2d1b52', '#5B3CAD']} style={styles.modalHero}>
            <Sparkles size={28} color="#F5E6A8" />
            <Text style={styles.modalHeroTitle}>Pulso masivo</Text>
            <Text style={styles.modalHeroSub}>
              Solo llega a clientes con App Clientes verificada ({verifiedClients.length} de {clients.length}).
            </Text>
          </LinearGradient>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: modalScrollBottomPad(insets) }}
          >
            <Text style={[styles.fieldLbl, { color: c.foreground }]}>Título (opcional)</Text>
            <TextInput
              style={[styles.fieldIn, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={promoTitle}
              onChangeText={setPromoTitle}
              placeholder="Ej. 20% en coloración"
              placeholderTextColor={c.foregroundSubtle}
            />
            <Text style={[styles.fieldLbl, { color: c.foreground }]}>Mensaje</Text>
            <TextInput
              style={[styles.fieldIn, styles.fieldArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={promoBody}
              onChangeText={setPromoBody}
              placeholder="Detalle de la promo, vigencia, condiciones…"
              placeholderTextColor={c.foregroundSubtle}
              multiline
            />
            <Text style={[styles.fieldLbl, { color: c.foreground, marginTop: spacing.xs }]}>
              Vincular producto o servicio (inventario)
            </Text>
            <Text style={[styles.promoLinkHint, { color: c.foregroundMuted }]}>
              Elegí un artículo: su portada se importa sola a la vista previa. Productos deben estar visibles en tienda;
              los servicios salen del catálogo de agenda. Comprar o Agendar lleva al cliente directo al artículo.
            </Text>
            {promoCatalogLoading ? (
              <ActivityIndicator style={{ marginVertical: spacing.md }} color={c.primary} />
            ) : (
              <>
                {promoProducts.length ? (
                  <>
                    <Text style={[styles.promoLinkSection, { color: c.foreground }]}>Productos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoLinkScroll}>
                      {promoProducts.map((entry) => {
                        const on =
                          promoLink?.type === BROADCAST_LINK_TYPES.PRODUCT &&
                          String(promoLink.id) === String(entry.row.id);
                        return (
                          <TouchableOpacity
                            key={String(entry.row.id)}
                            style={[
                              styles.promoLinkChip,
                              { borderColor: c.cardBorder, backgroundColor: c.card },
                              on && { borderColor: c.primary, backgroundColor: c.surfaceMuted },
                            ]}
                            onPress={() => {
                              const next = resolvePromoLinkToggle(promoLink, entry);
                              setPromoLink(next.link);
                              setPromoCoverUrl(next.cover);
                            }}
                          >
                            <Text style={[styles.promoLinkChipTxt, { color: c.foreground }]} numberOfLines={2}>
                              {entry.mapped?.title || entry.row.nombre}
                            </Text>
                            {entry.mapped?.priceLabel ? (
                              <Text style={[styles.promoLinkChipSub, { color: c.foregroundMuted }]}>
                                {entry.mapped.priceLabel}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : null}
                {promoServices.length ? (
                  <>
                    <Text style={[styles.promoLinkSection, { color: c.foreground }]}>Servicios</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoLinkScroll}>
                      {promoServices.map((entry) => {
                        const on =
                          promoLink?.type === BROADCAST_LINK_TYPES.SERVICE &&
                          String(promoLink.id) === String(entry.row.id);
                        return (
                          <TouchableOpacity
                            key={`svc-${entry.row.id}`}
                            style={[
                              styles.promoLinkChip,
                              { borderColor: c.cardBorder, backgroundColor: c.card },
                              on && { borderColor: c.primary, backgroundColor: c.surfaceMuted },
                            ]}
                            onPress={() => {
                              const next = resolvePromoLinkToggle(promoLink, entry);
                              setPromoLink(next.link);
                              setPromoCoverUrl(next.cover);
                            }}
                          >
                            <Text style={[styles.promoLinkChipTxt, { color: c.foreground }]} numberOfLines={2}>
                              {entry.mapped?.title || entry.row.nombre}
                            </Text>
                            {entry.mapped?.priceLabel ? (
                              <Text style={[styles.promoLinkChipSub, { color: c.foregroundMuted }]}>
                                {entry.mapped.priceLabel}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : null}
                {!promoProducts.length && !promoServices.length ? (
                  <Text style={[styles.promoLinkHint, { color: c.foregroundMuted, marginBottom: spacing.md }]}>
                    No hay artículos visibles en tienda. Publicá productos o servicios desde Inventario.
                  </Text>
                ) : null}
              </>
            )}

            {(promoTitle.trim() || promoBody.trim() || promoCoverUrl || promoLink) ? (
              <View style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
                <Text style={[styles.promoLiveLbl, { color: c.foregroundMuted }]}>Vista previa · post publicitario</Text>
                <BroadcastPromoCard item={promoDraftItem} readOnly />
              </View>
            ) : null}
            <SalonButton
              title={broadcasting ? 'Enviando…' : `Difundir a ${verifiedClients.length} clientes verificados`}
              variant="heroGold"
              fullWidth
              disabled={broadcasting || !clients.length}
              onPress={() => {
                Alert.alert(
                  'Confirmar difusión',
                  `Se enviará a ${verifiedClients.length} cliente(s) con App Clientes verificada. ¿Continuar?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Difundir', onPress: runBroadcast },
                  ],
                );
              }}
            />
            <SalonButton
              title="Cerrar"
              variant="outlineGray"
              fullWidth
              style={{ marginTop: spacing.sm }}
              disabled={broadcasting}
              onPress={() => setBroadcastOpen(false)}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (selectedClient) {
    return (
      <Fragment>
      <View style={[styles.shell, { backgroundColor: c.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.chatHeaderWrap, { paddingTop: insets.top + spacing.sm }]}>
          <LinearGradient
            colors={['#1e1035', '#2d1b52', '#3b2766']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.chatHeaderRow} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.chatBack}
              onPress={() => {
                setClientDataOpen(false);
                setSelectedClient(null);
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <ArrowLeft size={22} color="#FFF" strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={styles.chatHeaderAvatarWrap} pointerEvents="none">
              <ClientAvatar
                client={selectedClient}
                size={36}
                styles={styles}
                c={c}
                letterColor="rgba(255,255,255,0.9)"
                emptyBg="rgba(255,255,255,0.18)"
              />
            </View>
            <View style={styles.chatHeaderTitles} pointerEvents="none">
              <Text style={styles.chatTitle} numberOfLines={1}>
                {selectedClient.nombre}
              </Text>
              <Text style={styles.chatSub}>Andreas Pro · en vivo</Text>
            </View>
            <Pressable
              onPress={() => setClientDataOpen(true)}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              accessibilityRole="button"
              accessibilityLabel="Ver datos del cliente"
              style={({ pressed }) => [
                styles.chatHeaderVerBtn,
                pressed && { opacity: 0.82 },
              ]}
              android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: false }}
            >
              <Text style={styles.chatHeaderVerTxt}>Ver</Text>
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          style={[styles.chatShell, { backgroundColor: c.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 72 : 0}
        >
          {loadingChat && messages.length === 0 ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
          ) : (
            <FlatList
              ref={listRef}
              data={chatListData}
              keyExtractor={(m) => String(m.id)}
              renderItem={renderBubble}
              style={styles.chatList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
              onScroll={onChatScroll}
              scrollEventThrottle={80}
              onContentSizeChange={onChatContentSizeChange}
              contentContainerStyle={styles.chatListContent}
              ListEmptyComponent={
                <Text style={[subStyles.muted, { textAlign: 'center', marginTop: spacing.xl }]}>
                  Aún no hay mensajes. Escribí el primero para {selectedClient.nombre}.
                </Text>
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

          {isMatriz && matchedQuickIntent && !showSalonQuickReplies ? (
            <TouchableOpacity
              style={[styles.suggestedIntentBar, { borderColor: c.primary, backgroundColor: `${c.primary}12` }]}
              onPress={() => setShowSalonQuickReplies(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Respuesta sugerida para ${matchedQuickIntent.label}`}
            >
              <Sparkles size={16} color={c.primary} />
              <Text style={[styles.suggestedIntentTxt, { color: c.foreground }]} numberOfLines={2}>
                Cliente consultó: {matchedQuickIntent.label}. Tocá para ver respuesta sugerida.
              </Text>
            </TouchableOpacity>
          ) : null}

          {isMatriz && showSalonQuickReplies ? (
            <View style={[styles.quickActionsPanel, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <Text style={[styles.quickActionsTitle, { color: c.foreground }]}>
                Respuestas sugeridas · Andreas Pro
              </Text>
              <Text style={[styles.quickActionsHint, { color: c.foregroundMuted }]}>
                {matchedQuickIntent
                  ? `Detectamos consulta de «${matchedQuickIntent.label}». Tocá para cargar el borrador (editable).`
                  : 'Tocá una opción para cargar la respuesta en el borrador. Sincronizable con n8n.'}
              </Text>
              <View style={styles.quickActionsGrid}>
                {CHAT_QUICK_INTENTS.map((intent) => {
                  const highlighted = matchedQuickIntent?.id === intent.id;
                  return (
                    <TouchableOpacity
                      key={intent.id}
                      style={[
                        styles.quickActionChip,
                        {
                          borderColor: highlighted ? c.primary : c.cardBorder,
                          backgroundColor: highlighted ? `${c.primary}18` : c.surfaceMuted,
                        },
                      ]}
                      onPress={() => applySalonSuggestedReply(intent)}
                      disabled={sending}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Respuesta ${intent.label}`}
                    >
                      <Text style={[styles.quickActionChipTxt, { color: c.foreground }]}>{intent.label}</Text>
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
                paddingBottom: composerPadBottom,
              },
            ]}
          >
            <TouchableOpacity style={[styles.composerIcon, { borderColor: c.cardBorder }]} onPress={pickChatImage}>
              <ImageIcon size={22} color={c.primary} />
            </TouchableOpacity>
            {isMatriz ? (
              <TouchableOpacity
                style={[
                  styles.composerIcon,
                  {
                    borderColor: showSalonQuickReplies ? c.primary : c.cardBorder,
                    backgroundColor: showSalonQuickReplies ? `${c.primary}18` : 'transparent',
                  },
                ]}
                onPress={() => setShowSalonQuickReplies((v) => !v)}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel="Respuestas sugeridas"
              >
                <CircleHelp size={22} color={c.primary} strokeWidth={2.2} />
              </TouchableOpacity>
            ) : null}
            <TextInput
              style={[styles.composerInput, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              placeholder="Mensaje…"
              placeholderTextColor={c.foregroundSubtle}
              value={draft}
              onChangeText={setDraft}
              onFocus={() => {
                if (chatStickToBottomRef.current) scrollChatToEnd(true, true);
              }}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: c.primary, opacity: sending ? 0.6 : 1 }]}
              onPress={sendChatMessage}
              disabled={sending}
            >
              <Send size={20} color={isDark ? '#141414' : '#1a1024'} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      <Modal
        visible={clientDataOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setClientDataOpen(false)}
      >
        <View style={styles.clientDataModalRoot}>
          <Pressable
            style={styles.clientDataModalBackdrop}
            onPress={() => setClientDataOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar datos del cliente"
          />
          <View style={[styles.clientDataModalCard, { backgroundColor: c.background }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Datos del cliente</Text>
              <TouchableOpacity onPress={() => setClientDataOpen(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <ClientAvatar client={selectedClient} size={72} styles={styles} c={c} />
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontFamily: typography.fontSansMedium, color: c.foreground, fontSize: 16 }}>
                {selectedClient.nombre}
              </Text>
              {selectedClient.telefono ? (
                <View>
                  <Text
                    style={{
                      fontFamily: typography.fontSansMedium,
                      color: c.foregroundSubtle,
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    Teléfono
                  </Text>
                  <Text style={{ fontFamily: typography.fontSans, color: c.foreground, fontSize: 14 }}>
                    {selectedClient.telefono}
                  </Text>
                </View>
              ) : null}
              {selectedClient.email ? (
                <View>
                  <Text
                    style={{
                      fontFamily: typography.fontSansMedium,
                      color: c.foregroundSubtle,
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    Email
                  </Text>
                  <Text style={{ fontFamily: typography.fontSans, color: c.foreground, fontSize: 14 }}>
                    {selectedClient.email}
                  </Text>
                </View>
              ) : null}
            </View>
            <SalonButton
              title="Cerrar"
              variant="outlineGray"
              fullWidth
              style={{ marginTop: spacing.lg }}
              onPress={() => setClientDataOpen(false)}
            />
          </View>
        </View>
      </Modal>
      {broadcastModal}
      </Fragment>
    );
  }

  return (
    <Fragment>
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Andreas Pro"
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        rightAction={broadcastBtn}
        edgeToEdge
      >
        <View style={styles.body}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar por nombre o teléfono…"
            placeholderTextColor={c.foregroundSubtle}
            value={inboxQuery}
            onChangeText={setInboxQuery}
            autoCorrect={false}
            accessibilityLabel="Buscar clientes"
          />

          {isMatriz ? (
            <View
              style={[
                styles.automationRow,
                { borderColor: c.cardBorder, backgroundColor: c.card },
              ]}
            >
              <View style={styles.automationCopy}>
                <Text style={[styles.automationTitle, { color: c.foreground }]}>
                  Respuestas automáticas (n8n)
                </Text>
                <Text style={[styles.automationSub, { color: c.foregroundMuted }]} numberOfLines={2}>
                  {chatAutomationEnabled
                    ? 'Activo: el bot puede responder consultas frecuentes. Matriz sigue pudiendo escribir manual.'
                    : 'Inactivo: solo respuestas manuales desde Andreas Pro.'}
                </Text>
              </View>
              {chatAutomationLoading ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <Switch
                  value={chatAutomationEnabled}
                  onValueChange={(v) => void onToggleChatAutomation(v)}
                  disabled={chatAutomationSaving}
                  trackColor={{ false: c.surfaceMuted, true: `${c.primary}88` }}
                  thumbColor={chatAutomationEnabled ? c.primary : c.foregroundSubtle}
                  accessibilityLabel="Activar respuestas automáticas n8n"
                />
              )}
            </View>
          ) : null}

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loadingInbox ? '…' : `${inboxRows.length} cliente${inboxRows.length === 1 ? '' : 's'}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
              <Text style={{ color: c.foregroundSubtle }}> · </Text>
              <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)}>
                <Text style={[styles.toolbarLink, { color: c.primary }]}>Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.filtroResumen, { color: c.foregroundSubtle }]} numberOfLines={1}>
            {filtroResumen}
          </Text>

          {loadingInbox && clients.length === 0 ? (
            <ActivityIndicator style={{ marginTop: spacing.md }} color={c.primary} />
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={inboxRows}
                keyExtractor={(r) => String(r.client.id)}
                renderItem={renderInboxRow}
                style={styles.inboxList}
                nestedScrollEnabled
                refreshControl={
                  <RefreshControl
                    refreshing={refreshingInbox}
                    onRefresh={onInboxRefresh}
                    tintColor={c.primary}
                    colors={[c.primary]}
                    progressBackgroundColor={c.card}
                  />
                }
                contentContainerStyle={{
                  paddingBottom: sel.count ? 100 : padList,
                  flexGrow: inboxRows.length === 0 ? 1 : undefined,
                }}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={inboxListEmpty}
                initialNumToRender={20}
                windowSize={10}
              />
            </View>
          )}
        </View>
      </SubScreenChrome>
      <ListSelectionActionBar
        count={sel.count}
        onCancel={sel.exitSelectMode}
        onConfirm={confirmSelection}
        confirmLabel={sel.count === 1 ? 'Abrir chat' : 'Pulso masivo'}
        bottomInset={insets.bottom}
        colors={c}
      />
    </View>
    {broadcastModal}

    <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.filterModalCard, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
          <View style={styles.filterModalHead}>
            <Text style={[styles.filterModalTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
            <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12} accessibilityLabel="Cerrar">
              <X size={22} color={c.foregroundMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.fieldLbl, { color: c.foreground }]}>Orden</Text>
          <View style={styles.chipRow}>
            {[
              { id: 'nombre_asc', label: 'Nombre A → Z' },
              { id: 'nombre_desc', label: 'Nombre Z → A' },
              { id: 'reciente', label: 'Más recientes' },
            ].map((opt) => {
              const on = sortMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.filterChip,
                    { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                  ]}
                  onPress={() => setSortMode(opt.id)}
                >
                  <Text style={[styles.filterChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.fieldLbl, { color: c.foreground }]}>Origen</Text>
          <View style={styles.chipRow}>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'manual', label: 'Solo manual' },
              { id: 'app', label: 'Solo verificados' },
            ].map((opt) => {
              const on = filterTipo === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.filterChip,
                    { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                  ]}
                  onPress={() => setFilterTipo(opt.id)}
                >
                  <Text style={[styles.filterChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalFiltros(false)} />
        </View>
      </View>
    </Modal>
    </Fragment>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    chatShell: { flex: 1, minHeight: 0 },
    chatList: { flex: 1, backgroundColor: c.background },
    chatListContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      flexGrow: 1,
    },
    inboxList: { flex: 1 },
    addPersonCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
    },
    body: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: spacing.sm,
      backgroundColor: c.background,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    toolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    toolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    filtroResumen: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
      marginBottom: spacing.xs,
    },
    listShell: {
      flex: 1,
      minHeight: 0,
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    search: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      minHeight: 40,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
    },
    automationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    automationCopy: {
      flex: 1,
      minWidth: 0,
    },
    automationTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    automationSub: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    emptyTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTopLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    rowChips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    },
    rowBellBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#E53935',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.background,
    },
    rowAvatarWrap: {
      width: 34,
      height: 34,
      flexShrink: 0,
    },
    rowAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
    },
    rowAvatarEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowAvatarLetter: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    rowName: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    chip: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.pill,
      flexShrink: 0,
    },
    chipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
    },
    rowSub: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    rowChev: {
      flexShrink: 0,
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    filterModalCard: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    filterModalHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    filterModalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    filterChipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    chatHeaderWrap: {
      position: 'relative',
      zIndex: 20,
      elevation: 20,
    },
    chatHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    chatHeaderAvatarWrap: {
      flexShrink: 0,
    },
    chatHeaderTitles: {
      flex: 1,
      minWidth: 0,
    },
    chatHeaderVerBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radii.lg,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
      minWidth: 52,
      zIndex: 30,
      elevation: 30,
      flexShrink: 0,
    },
    clientDataModalRoot: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    clientDataModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    clientDataModalCard: {
      borderRadius: radii.lg,
      padding: spacing.lg,
      maxWidth: 420,
      width: '100%',
      alignSelf: 'center',
      zIndex: 2,
      elevation: 8,
    },
    chatHeaderVerTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      color: '#FFFFFF',
    },
    chatBack: { padding: 4 },
    chatTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      color: '#FFF',
    },
    chatSub: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },
    postWrap: {
      width: '100%',
      alignSelf: 'stretch',
      marginVertical: spacing.md,
    },
    bubbleWrap: {
      maxWidth: '92%',
      marginBottom: spacing.sm,
    },
    bubbleOut: { alignSelf: 'flex-end' },
    bubbleIn: { alignSelf: 'flex-start' },
    bubbleInbound: {
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      maxWidth: '100%',
    },
    bubbleGrad: {
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    badgeTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      color: '#1a1024',
      textTransform: 'uppercase',
    },
    broadcastTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      lineHeight: 28,
      color: '#1a1024',
      marginBottom: 4,
    },
    bubbleText: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      color: '#FFF',
      lineHeight: 22,
    },
    bubbleTextIn: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      lineHeight: 22,
    },
    bubbleImg: {
      width: '100%',
      height: 160,
      borderRadius: radii.md,
    },
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
    bubbleMeta: {
      fontFamily: typography.fontSans,
      fontSize: 10,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 6,
    },
    bubbleMetaIn: {
      fontFamily: typography.fontSans,
      fontSize: 10,
      marginTop: 6,
    },
    previewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
    },
    previewThumb: { width: 48, height: 48, borderRadius: radii.sm },
    suggestedIntentBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    suggestedIntentTxt: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      lineHeight: 17,
    },
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
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
    },
    composerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
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
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalDim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      maxHeight: '92%',
      overflow: 'hidden',
    },
    modalHero: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    modalHeroTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 24,
      color: '#FFF',
      marginTop: spacing.sm,
    },
    modalHeroSub: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)',
      marginTop: spacing.xs,
      lineHeight: 20,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.xs,
    },
    fieldIn: {
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      marginBottom: spacing.md,
      fontFamily: typography.fontSans,
      fontSize: 15,
    },
    fieldArea: { minHeight: 100, textAlignVertical: 'top' },
    promoImgBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    promoImgTxt: { fontFamily: typography.fontSansMedium, fontSize: 14 },
    promoPreview: {
      width: '100%',
      height: 160,
      borderRadius: radii.md,
      marginBottom: spacing.md,
    },
    promoLinkHint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: spacing.sm,
    },
    promoLinkSection: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.xs,
      marginTop: spacing.xs,
    },
    promoLinkScroll: { marginBottom: spacing.sm, maxHeight: 88 },
    promoLinkChip: {
      width: 148,
      marginRight: spacing.sm,
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    promoLinkChipTxt: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    promoLinkChipSub: { fontFamily: typography.fontSans, fontSize: 11, marginTop: 4 },
    promoLiveLbl: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginBottom: spacing.sm,
    },
  });
}
