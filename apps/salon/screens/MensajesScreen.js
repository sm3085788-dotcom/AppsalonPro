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
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ChevronRight,
  Image as ImageIcon,
  Megaphone,
  Radio,
  Send,
  Sparkles,
  X,
  FileText,
  Check,
} from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  db,
  supabase,
  uploadMensajeMediaFromUri,
  isClienteAppVerificado,
  isClienteManual,
} from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { useTheme } from '../theme/ThemeProvider';

const BULK_CHUNK = 80;
const INBOX_PREVIEW_TYPES = new Set(['chat', 'broadcast_promo', 'incident_report']);
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
      preview: last?.content || INBOX_OPEN_HINT,
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
  const sel = useListSelection();

  const [clients, setClients] = useState([]);
  const [inboxPreviews, setInboxPreviews] = useState([]);
  const [inboxQuery, setInboxQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortMode, setSortMode] = useState('nombre_asc');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [broadcastOnlyIds, setBroadcastOnlyIds] = useState(null);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [sending, setSending] = useState(false);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoBody, setPromoBody] = useState('');
  const [promoImage, setPromoImage] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [staffUserId, setStaffUserId] = useState(null);

  const padList = Math.max(insets.bottom + spacing.md, spacing.lg);
  const padBottom = padList;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStaffUserId(user?.id ?? null);
    });
  }, []);

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    try {
      const [cRes, pRes] = await Promise.all([
        db.clientes.getAll(),
        db.marketingDirectMessages.getInboxPreviewsByClient(),
      ]);
      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;
      const clientList = cRes.data || [];
      setClients(clientList);
      setInboxPreviews(pRes.data || []);
    } catch (e) {
      Alert.alert('Andreas Pro', e?.message || 'No se pudo cargar la bandeja.');
      setClients([]);
      setInboxPreviews([]);
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

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
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const openClientChat = useCallback((client) => {
    if (!isClienteAppVerificado(client)) {
      Alert.alert(
        'Sin App Clientes',
        `${client.nombre || 'Este cliente'} es una ficha manual. Andreas Pro solo envía mensajes a clientes verificados en App Clientes (con cuenta vinculada).`,
      );
      return;
    }
    setSelectedClient(client);
  }, []);

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

  const loadChat = useCallback(async (clientId) => {
    setLoadingChat(true);
    try {
      const { data, error } = await db.marketingDirectMessages.getByClient(clientId);
      if (error) throw error;
      const sorted = [...(data || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(sorted);
    } catch (e) {
      Alert.alert('Chat', e?.message || 'No se pudieron cargar los mensajes.');
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClient?.id) {
      setMessages([]);
      return undefined;
    }
    loadChat(selectedClient.id);
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
        (payload) => {
          const row = payload.new;
          if (!row?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient?.id, loadChat]);

  const getSenderMeta = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const name =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      'Equipo salón';
    return { id: user?.id || null, name };
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
            `${upErr.message || 'Error al subir'}\n\nCreá el bucket Storage "mensajes" y políticas para cuentas con acceso (admin).`,
          );
          setSending(false);
          return;
        }
        mediaUrl = publicUrl;
        mediaKind = 'image';
      }
      const content = text || (mediaUrl ? 'Imagen' : ' ');
      const { data, error } = await db.marketingDirectMessages.create({
        client_id: selectedClient.id,
        client_name: selectedClient.nombre,
        client_phone: selectedClient.telefono || null,
        content,
        content_type: 'chat',
        media_url: mediaUrl,
        media_kind: mediaKind,
        status: 'pending_sync',
        created_by: sender.id,
        created_by_name: sender.name,
      });
      if (error) throw error;
      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
        setInboxPreviews((prev) => mergeInboxPreview(prev, data));
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

  const pickPromoImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) setPromoImage(res.assets[0]);
  };

  const runBroadcast = async () => {
    const title = promoTitle.trim();
    const body = promoBody.trim();
    if (!body) {
      Alert.alert('Pulso masivo', 'Escribí el texto de la promoción.');
      return;
    }
    const content = title ? `**${title}**\n${body}` : body;
    setBroadcasting(true);
    try {
      const sender = await getSenderMeta();
      let mediaUrl = null;
      let mediaKind = null;
      if (promoImage?.uri) {
        const ext = guessExt(promoImage.uri, promoImage.mimeType);
        const { publicUrl, error: upErr } = await uploadMensajeMediaFromUri(promoImage.uri, {
          extension: ext,
          contentType: promoImage.mimeType || 'image/jpeg',
        });
        if (upErr) {
          Alert.alert('Adjunto', upErr.message || 'No se pudo subir la imagen de la campaña.');
          setBroadcasting(false);
          return;
        }
        mediaUrl = publicUrl;
        mediaKind = 'image';
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
      const rows = targets.map((cl) => ({
        client_id: cl.id,
        client_name: cl.nombre,
        client_phone: cl.telefono || null,
        content,
        content_type: 'broadcast_promo',
        media_url: mediaUrl,
        media_kind: mediaKind,
        status: 'pending_sync',
        created_by: sender.id,
        created_by_name: sender.name,
      }));
      for (let i = 0; i < rows.length; i += BULK_CHUNK) {
        const slice = rows.slice(i, i + BULK_CHUNK);
        const { error } = await db.marketingDirectMessages.createBulk(slice);
        if (error) throw error;
      }
      const skipNote =
        skipped > 0 ? ` (${skipped} ficha${skipped === 1 ? '' : 's'} manual omitida${skipped === 1 ? '' : 's'})` : '';
      Alert.alert('Pulso masivo', `Se encolaron ${targets.length} mensajes para clientes con App Clientes${skipNote}.`);
      setBroadcastOpen(false);
      setBroadcastOnlyIds(null);
      setPromoTitle('');
      setPromoBody('');
      setPromoImage(null);
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
        style={[styles.addPersonCircle, isDark && styles.addPersonCircleDark]}
        onPress={() => {
          setBroadcastOnlyIds(null);
          setBroadcastOpen(true);
        }}
        accessibilityLabel="Pulso masivo"
        hitSlop={10}
        activeOpacity={0.85}
      >
        <Megaphone size={22} color={isDark ? '#141414' : c.foreground} strokeWidth={2.2} />
      </TouchableOpacity>
    ),
    [c.foreground, isDark, styles.addPersonCircle, styles.addPersonCircleDark],
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
            <View style={[styles.rowAvatar, styles.rowAvatarEmpty, { backgroundColor: c.surfaceMuted }]}>
              <Text style={[styles.rowAvatarLetter, { color: c.foregroundMuted }]}>
                {initials(client.nombre)}
              </Text>
            </View>
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
    [c, isDark, openClientChat, sel, styles],
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
            <Text style={[styles.bubbleTextIn, { color: c.foreground }]}>{item.content}</Text>
            {item.media_url && item.media_kind === 'image' ? (
              <Image source={{ uri: item.media_url }} style={styles.bubbleImg} resizeMode="cover" />
            ) : null}
            <Text style={[styles.bubbleMetaIn, { color: c.foregroundMuted }]}>
              {new Date(item.created_at).toLocaleString('es-GT', { hour: '2-digit', minute: '2-digit' })} ·{' '}
              {item.created_by_name || item.client_name || 'Cliente'}
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={isBroadcast ? ['#B8860B', '#D4AF37', '#C9A227'] : isIncident ? ['#5c1f33', '#7a2d45', '#9a3d58'] : ['#6D28D9', '#7C3AED', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubbleGrad}
          >
            {isBroadcast ? (
              <View style={styles.badgeRow}>
                <Radio size={14} color="#1a1024" />
                <Text style={styles.badgeTxt}>Difusión</Text>
              </View>
            ) : null}
            {isIncident ? (
              <View style={styles.badgeRow}>
                <FileText size={14} color="#fff" />
                <Text style={[styles.badgeTxt, { color: '#fff' }]}>Reporte incidente</Text>
              </View>
            ) : null}
            <Text style={styles.bubbleText}>{item.content}</Text>
            {item.media_url && item.media_kind === 'image' ? (
              <Image source={{ uri: item.media_url }} style={styles.bubbleImg} resizeMode="cover" />
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
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg }}>
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
            <TouchableOpacity style={[styles.promoImgBtn, { borderColor: c.primary }]} onPress={pickPromoImage}>
              <ImageIcon size={18} color={c.primary} />
              <Text style={[styles.promoImgTxt, { color: c.primary }]}>
                {promoImage ? 'Cambiar imagen' : 'Agregar imagen'}
              </Text>
            </TouchableOpacity>
            {promoImage ? (
              <Image source={{ uri: promoImage.uri }} style={styles.promoPreview} resizeMode="cover" />
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
        <LinearGradient colors={['#1e1035', '#2d1b52', '#3b2766']} style={[styles.chatHeader, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity style={styles.chatBack} onPress={() => setSelectedClient(null)} hitSlop={12}>
            <ArrowLeft size={22} color="#FFF" strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {selectedClient.nombre}
            </Text>
            <Text style={styles.chatSub}>Andreas Pro · en vivo</Text>
          </View>
          <TouchableOpacity onPress={() => setBroadcastOpen(true)} hitSlop={12} accessibilityLabel="Pulso masivo">
            <Megaphone size={22} color="rgba(255,255,255,0.9)" strokeWidth={2.2} />
          </TouchableOpacity>
        </LinearGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.bottom + 8}
        >
          {loadingChat ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              inverted
              keyExtractor={(m) => String(m.id)}
              renderItem={renderBubble}
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: padBottom, paddingBottom: spacing.md }}
              ListEmptyComponent={
                <Text style={[subStyles.muted, { textAlign: 'center', marginTop: spacing.xl }]}>
                  Aún no hay mensajes. Escribí el primero para {selectedClient.nombre}.
                </Text>
              }
            />
          )}

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
                paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
              },
            ]}
          >
            <TouchableOpacity style={[styles.composerIcon, { borderColor: c.cardBorder }]} onPress={pickChatImage}>
              <ImageIcon size={22} color={c.primary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.composerInput, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              placeholder="Mensaje…"
              placeholderTextColor={c.foregroundSubtle}
              value={draft}
              onChangeText={setDraft}
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
        </KeyboardAvoidingView>
      </View>
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

          {loadingInbox ? (
            <ActivityIndicator style={{ marginTop: spacing.md }} color={c.primary} />
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={inboxRows}
                keyExtractor={(r) => String(r.client.id)}
                renderItem={renderInboxRow}
                refreshControl={
                  <RefreshControl refreshing={false} onRefresh={loadInbox} tintColor={c.primary} />
                }
                contentContainerStyle={{
                  paddingBottom: sel.count ? 100 : padList,
                  flexGrow: inboxRows.length === 0 ? 1 : 0,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={inboxListEmpty}
                initialNumToRender={16}
                windowSize={8}
                removeClippedSubviews
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
        <View style={[styles.filterModalCard, { backgroundColor: c.background }]}>
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
    addPersonCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
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
    addPersonCircleDark: {
      borderColor: 'rgba(255,255,255,0.35)',
    },
    body: {
      flex: 1,
      paddingHorizontal: spacing.sm,
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
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.sm,
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
      marginTop: spacing.sm,
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
  });
}
