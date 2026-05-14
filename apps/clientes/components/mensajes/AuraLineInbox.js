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
  Platform,
  Alert,
} from 'react-native';
import { Send, Radio, FileText } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  supabase,
  fetchClientAuraMessages,
  markClientAuraDelivered,
  sendClientAuraChat,
  isSalonOutboundMessage,
} from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { SalonButton } from '../luxury/SalonButton';

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

export function AuraLineInbox({ clienteRow, sessionUser, onUnreadChange }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const listRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

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
  }, [clienteRow?.id, onUnreadChange]);

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

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const { data, error } = await sendClientAuraChat(text, clientMeta);
    setSending(false);
    if (error) {
      Alert.alert('Aura Line', error.message || 'No se pudo enviar.');
      return;
    }
    setDraft('');
    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
    } else {
      await refresh();
    }
  };

  const renderItem = ({ item }) => {
    const fromSalon = isSalonOutboundMessage(item);
    const isBroadcast = String(item.content_type || '').includes('broadcast');
    const isIncident = String(item.content_type || '') === 'incident_report';
    return (
      <View style={[styles.bubbleWrap, fromSalon ? styles.bubbleIn : styles.bubbleOut]}>
        <View
          style={[
            styles.bubble,
            fromSalon
              ? { backgroundColor: c.card, borderColor: c.cardBorder }
              : { backgroundColor: c.primary },
          ]}
        >
          {isBroadcast ? (
            <View style={styles.badgeRow}>
              <Radio size={12} color={c.primary} />
              <Text style={[styles.badgeTxt, { color: c.primary }]}>Promoción del salón</Text>
            </View>
          ) : null}
          {isIncident ? (
            <View style={styles.badgeRow}>
              <FileText size={12} color={c.primary} />
              <Text style={[styles.badgeTxt, { color: c.primary }]}>Reporte del salón</Text>
            </View>
          ) : null}
          <Text style={[styles.bubbleTxt, { color: fromSalon ? c.foreground : c.heroCtaText }]}>
            {item.content}
          </Text>
          {item.media_url && item.media_kind === 'image' ? (
            <Image source={{ uri: item.media_url }} style={styles.bubbleImg} resizeMode="cover" />
          ) : null}
          <Text style={[styles.bubbleMeta, { color: fromSalon ? c.foregroundMuted : 'rgba(0,0,0,0.55)' }]}>
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
          Completá tu perfil para recibir mensajes de Aura Line.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.shell}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
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
      <View style={[styles.composer, { borderTopColor: c.cardBorder, backgroundColor: c.background }]}>
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
    shell: { flex: 1, minHeight: 360 },
    listContent: { padding: spacing.md, paddingBottom: spacing.sm },
    emptyWrap: { padding: spacing.lg },
    emptyTxt: { fontFamily: typography.fontSans, fontSize: 14, lineHeight: 20, textAlign: 'center' },
    bubbleWrap: { marginBottom: spacing.sm, maxWidth: '92%' },
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
    bubbleImg: { width: '100%', height: 140, borderRadius: radii.md, marginTop: spacing.sm },
    bubbleMeta: { fontFamily: typography.fontSans, fontSize: 10, marginTop: 6 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
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
