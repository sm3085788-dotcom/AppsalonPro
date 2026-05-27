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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Send, FileText, Image as ImageIcon, X, Download } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  supabase,
  fetchClientAuraMessages,
  markClientAuraDelivered,
  sendClientAuraChat,
  isSalonOutboundMessage,
  uploadMensajeMediaFromUri,
  broadcastPreviewText,
  parseCitaConfirmacionContent,
  citaConfirmacionPreviewText,
} from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton } from '../luxury/SalonButton';
import { saveChatImageWithAlert } from '../../utils/saveChatImage';
import { BroadcastPromoCard } from './BroadcastPromoCard';
import { CitaConfirmacionCard } from './CitaConfirmacionCard';

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

/** Altura aprox. del encabezado SubScreenChrome (Volver + título + subtítulo). */
const CHROME_HEADER_EST = 118;

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
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [promoBusy, setPromoBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const composerPadBottom = isKeyboardVisible
    ? spacing.xs
    : Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 4);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const clientMeta = useMemo(
    () => ({
      clientName: clienteRow?.nombre || sessionUser?.user_metadata?.full_name || 'Cliente',
      clientPhone: clienteRow?.telefono || null,
    }),
    [clienteRow, sessionUser],
  );

  const refresh = useCallback(async () => {
    if (!clienteRow?.id) {
      setMessages([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await fetchClientAuraMessages(250);
    setLoading(false);
    if (error) {
      setMessages([]);
      setLoadError(error.message || 'No se pudieron cargar los mensajes.');
      return;
    }
    const sorted = [...(data || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
    setMessages(sorted);
    scrollToEnd(false);
    const pendingIds = sorted
      .filter((m) => m.status === 'pending_sync' && isSalonOutboundMessage(m))
      .map((m) => m.id);
    if (pendingIds.length) {
      await markClientAuraDelivered(pendingIds);
      setMessages((prev) =>
        prev.map((m) =>
          pendingIds.includes(m.id)
            ? { ...m, status: 'delivered', delivered_at: new Date().toISOString() }
            : m,
        ),
      );
    }
    onUnreadChange?.();
  }, [clienteRow?.id, onUnreadChange, scrollToEnd]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!clienteRow?.id) return undefined;
    const channel = supabase
      .channel(`aura-client-${clienteRow.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketing_direct_messages',
          filter: `client_id=eq.${clienteRow.id}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteRow?.id, refresh]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToEnd(false);
    }
  }, [loading, messages.length, scrollToEnd]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, () => setIsKeyboardVisible(true));
    const onHide = Keyboard.addListener(hideEvt, () => setIsKeyboardVisible(false));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

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
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
        scrollToEnd(true);
      } else {
        await refresh();
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
    const uid = sessionUser?.id ? String(sessionUser.id) : '';
    const author = item.created_by != null ? String(item.created_by) : '';
    const isFromClient = Boolean(uid && author && author === uid);
    // chat del salón y el cliente comparten content_type "chat"; se distingue por created_by.
    const fromSalon = isSalonOutboundMessage(item) && !isFromClient;
    const isBroadcast = String(item.content_type || '').includes('broadcast');
    const isIncident = String(item.content_type || '') === 'incident_report';
    const isCitaConfirm = String(item.content_type || '') === 'cita_confirmacion';
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
          {isIncident ? (
            <View style={styles.badgeRow}>
              <FileText size={12} color={c.primary} />
              <Text style={[styles.badgeTxt, { color: c.primary }]}>Reporte del salón</Text>
            </View>
          ) : null}
          {chatBubbleText(item) ? (
            <Text style={[styles.bubbleTxt, { color: fromSalon ? c.foreground : c.foreground }]}>
              {chatBubbleText(item)}
            </Text>
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => scrollToEnd(false)}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {loadError ? (
                <>
                  <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>{loadError}</Text>
                  <SalonButton
                    variant="outlineGold"
                    title="Reintentar"
                    onPress={refresh}
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
          <ImageIcon size={20} color={c.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
          placeholder="Escribí al salón…"
          placeholderTextColor={c.foregroundSubtle}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: c.primary, opacity: sending ? 0.6 : 1 }]}
          onPress={send}
          disabled={sending}
        >
          <Send size={20} color={c.heroCtaText} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1, backgroundColor: c.background },
    list: { flex: 1, backgroundColor: c.background },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.sm,
      flexGrow: 1,
      justifyContent: 'flex-end',
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
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
    },
    attachBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
      maxHeight: 100,
      fontFamily: typography.fontSans,
      fontSize: 15,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
