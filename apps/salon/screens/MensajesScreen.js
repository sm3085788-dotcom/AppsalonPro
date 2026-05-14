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
  Search,
  Send,
  Sparkles,
  X,
  FileText,
} from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, supabase, uploadMensajeMediaFromUri } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

const INBOX_MSG_LIMIT = 300;
const BULK_CHUNK = 80;

function initials(name) {
  const p = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return '?';
}

function buildInboxRows(allClients, recentMessages) {
  const lastBy = new Map();
  for (const m of recentMessages || []) {
    if (!m?.client_id) continue;
    const prev = lastBy.get(m.client_id);
    if (!prev || new Date(m.created_at) > new Date(prev.created_at)) lastBy.set(m.client_id, m);
  }
  const rows = (allClients || []).map((c) => ({
    client: c,
    preview: lastBy.get(c.id)?.content || 'Tocá para abrir Aura Line',
    lastAt: lastBy.get(c.id)?.created_at || null,
  }));
  rows.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return String(a.client.nombre || '').localeCompare(String(b.client.nombre || ''));
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return new Date(b.lastAt) - new Date(a.lastAt);
  });
  return rows;
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

  const [clients, setClients] = useState([]);
  const [recentMsgs, setRecentMsgs] = useState([]);
  const [inboxQuery, setInboxQuery] = useState('');
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

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStaffUserId(user?.id ?? null);
    });
  }, []);

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    try {
      const [cRes, mRes] = await Promise.all([
        db.clientes.getAll(),
        db.marketingDirectMessages.getRecentForInbox(INBOX_MSG_LIMIT),
      ]);
      if (cRes.error) throw cRes.error;
      if (mRes.error) throw mRes.error;
      const clientList = cRes.data || [];
      setClients(clientList);
      setRecentMsgs(mRes.data || []);
    } catch (e) {
      Alert.alert('Aura Line', e?.message || 'No se pudo cargar la bandeja.');
      setClients([]);
      setRecentMsgs([]);
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const inboxRows = useMemo(() => {
    const rows = buildInboxRows(clients, recentMsgs);
    const q = inboxQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = [r.client.nombre, r.client.telefono, r.client.email, r.preview].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [clients, recentMsgs, inboxQuery]);

  const inboxListEmpty = useMemo(() => {
    const q = inboxQuery.trim();
    if (q && clients.length > 0) {
      return (
        <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.md }}>
          <Text style={[subStyles.muted]}>No hay clientes que coincidan con la búsqueda.</Text>
        </View>
      );
    }
    return (
      <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.md }}>
        <Text style={[subStyles.muted]}>No hay clientes cargados.</Text>
        <Text style={[subStyles.muted, { marginTop: spacing.sm, fontSize: 13 }]}>
          Agregá clientes desde el módulo Clientes para verlos en la bandeja de Aura Line.
        </Text>
        <SalonButton
          title="Reintentar"
          variant="outlineGray"
          fullWidth
          style={{ marginTop: spacing.md }}
          onPress={loadInbox}
        />
      </View>
    );
  }, [clients.length, inboxQuery, loadInbox, subStyles.muted]);

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
    const text = draft.trim();
    if (!text && !pendingImage) {
      Alert.alert('Aura Line', 'Escribí un mensaje o adjuntá una foto.');
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
      }
      setDraft('');
      setPendingImage(null);
      loadInbox();
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
      const targets = clients.filter((x) => x?.id);
      if (!targets.length) {
        Alert.alert('Pulso masivo', 'No hay clientes en la base.');
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
      Alert.alert('Pulso masivo', `Se encolaron ${targets.length} mensajes para todos los clientes.`);
      setBroadcastOpen(false);
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

  const broadcastBtn = useMemo(
    () => (
      <TouchableOpacity
        style={[styles.addPersonCircle, isDark && styles.addPersonCircleDark]}
        onPress={() => setBroadcastOpen(true)}
        accessibilityLabel="Pulso masivo"
        hitSlop={10}
        activeOpacity={0.85}
      >
        <Megaphone size={22} color={isDark ? '#141414' : c.foreground} strokeWidth={2.2} />
      </TouchableOpacity>
    ),
    [c.foreground, isDark, styles.addPersonCircle, styles.addPersonCircleDark],
  );

  const renderInboxRow = ({ item }) => {
    const { client, preview, lastAt } = item;
    return (
      <TouchableOpacity
        style={[styles.inboxCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}
        onPress={() => setSelectedClient(client)}
        activeOpacity={0.88}
      >
        <LinearGradient colors={['#5B3CAD', '#8B5CF6']} style={styles.avatarRing}>
          <View style={[styles.avatarInner, { backgroundColor: c.card }]}>
            <Text style={[styles.avatarTxt, { color: '#5B3CAD' }]}>{initials(client.nombre)}</Text>
          </View>
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.inboxTopRow}>
            <Text style={[styles.inboxName, { color: c.foreground }]} numberOfLines={1}>
              {client.nombre}
            </Text>
            {lastAt ? (
              <Text style={[styles.inboxTime, { color: c.foregroundSubtle }]}>
                {new Date(lastAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}
              </Text>
            ) : null}
          </View>
          <Text style={[subStyles.muted, styles.inboxPreview]} numberOfLines={2}>
            {preview}
          </Text>
        </View>
        <ChevronRight size={20} color={c.foregroundMuted} />
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.modalHeroSub}>Una promoción para todos tus clientes, al instante.</Text>
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
              title={broadcasting ? 'Enviando…' : `Difundir a ${clients.length} clientes`}
              variant="heroGold"
              fullWidth
              disabled={broadcasting || !clients.length}
              onPress={() => {
                Alert.alert(
                  'Confirmar difusión',
                  `Se enviará a ${clients.length} clientes. ¿Continuar?`,
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
            <Text style={styles.chatSub}>Aura Line · en vivo</Text>
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

          <View style={[styles.composer, { borderTopColor: c.cardBorder, backgroundColor: c.background }]}>
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
        title="Aura Line"
        subtitle="Chateá con cualquier cliente. Fotos, promos y difusión masiva."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        rightAction={broadcastBtn}
      >
        <LinearGradient colors={['rgba(107,47,189,0.12)', 'transparent']} style={styles.inboxGlow}>
          <View style={[styles.searchWrap, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
            <Search size={18} color={c.foregroundMuted} />
            <TextInput
              style={[styles.searchIn, { color: c.foreground }]}
              placeholder="Buscar cliente…"
              placeholderTextColor={c.foregroundSubtle}
              value={inboxQuery}
              onChangeText={setInboxQuery}
            />
          </View>
          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: c.surfaceMuted }]}>
              <Radio size={14} color={c.primary} />
              <Text style={[styles.pillTxt, { color: c.foregroundMuted }]}>Tiempo real al abrir un chat</Text>
            </View>
          </View>
        </LinearGradient>

        {loadingInbox ? (
          <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
        ) : (
          <FlatList
            data={inboxRows}
            keyExtractor={(r) => String(r.client.id)}
            renderItem={renderInboxRow}
            contentContainerStyle={{ paddingBottom: padBottom, paddingTop: spacing.sm }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={inboxListEmpty}
          />
        )}
      </SubScreenChrome>
    </View>
    {broadcastModal}
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
    inboxGlow: {
      paddingBottom: spacing.sm,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      minHeight: 46,
    },
    searchIn: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 15,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    pillRow: { marginTop: spacing.sm },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
    },
    pillTxt: { fontFamily: typography.fontSans, fontSize: 11 },
    inboxCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    avatarRing: {
      width: 52,
      height: 52,
      borderRadius: 26,
      padding: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInner: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
    },
    inboxTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    inboxName: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      flex: 1,
    },
    inboxTime: {
      fontFamily: typography.fontSans,
      fontSize: 11,
    },
    inboxPreview: {
      fontSize: 13,
      marginTop: 4,
      lineHeight: 18,
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
