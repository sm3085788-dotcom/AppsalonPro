import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gift, KeyRound, Link2, UserPlus, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  listGiftCardsStaff,
  activateGiftCardAtSalon,
  createGiftCardActivationCode,
  listGiftCardActivationCodesStaff,
  normalizeGtWhatsappPhone,
  linkGiftCardToCliente,
  unlinkGiftCardFromCliente,
  searchGiftCardsStaff,
  looksLikeGiftCardQuery,
  clienteOrigenLabel,
  SALON_CONTACTO,
  deleteGiftCardStaff,
  deleteGiftCardActivationCodeStaff,
  db,
} from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, SalonSearchBar } from '../components/luxury';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { ClienteOrigenIcon } from '../components/ClienteOrigenIcon';
import { GiftCardSearchHitRow } from '../components/GiftCardSearchHitRow';
import { useTheme } from '../theme/ThemeProvider';
import { GiftCardQrScannerModal } from '../components/GiftCardQrScannerModal';
import { offerGiftCardClienteWhatsApp } from '../utils/salonStaffWhatsApp';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function formatQ(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `Q${v.toFixed(2)}`;
}

function estadoLabel(estado) {
  if (estado === 'depleted') return 'Completado';
  if (estado === 'issued') return 'Emitida';
  if (estado === 'activated') return 'Activa';
  if (estado === 'expired') return 'Vencida';
  if (estado === 'cancelled') return 'Cancelada';
  return estado || '—';
}

const WEB_ACTIVATE_URL = 'https://appsalon-pro-web-catalogo.vercel.app/tarjeta-regalo/activar';
const SALDO_GREEN = '#22c55e';
const SALDO_RED = '#ef4444';
const COMPLETADO_BLUE = '#2563eb';

export function TarjetasRegaloScreen({ onBack, initialCodigo, onConsumeInitialCodigo }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const sel = useListSelection();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [cards, setCards] = useState([]);
  const [pendingCodes, setPendingCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emitOpen, setEmitOpen] = useState(true);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [emitForm, setEmitForm] = useState({
    monto: '',
    paraNombre: '',
    deNombre: '',
    mensaje: '',
    compradorTelefono: '',
  });
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkTargetCard, setLinkTargetCard] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [giftCardHits, setGiftCardHits] = useState([]);
  const [giftSearchBusy, setGiftSearchBusy] = useState(false);
  const giftSearchTimerRef = useRef(null);
  const handledInitialRef = useRef(false);

  const loadList = useCallback(async () => {
    const [cardsRes, codesRes] = await Promise.all([
      listGiftCardsStaff(40),
      listGiftCardActivationCodesStaff(15),
    ]);
    if (cardsRes.ok) setCards(cardsRes.cards || []);
    if (codesRes.ok) setPendingCodes(codesRes.codes || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadList();
      setLoading(false);
    })();
  }, [loadList]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadList();
    setRefreshing(false);
  }, [loadList]);

  const runEmitCode = useCallback(async () => {
    const monto = Number(String(emitForm.monto).replace(',', '.'));
    if (!Number.isFinite(monto) || monto < 50 || monto > 10000) {
      Alert.alert('Monto', 'El monto debe estar entre Q50 y Q10,000.');
      return;
    }
    if (!emitForm.paraNombre.trim() || !emitForm.deNombre.trim() || !emitForm.compradorTelefono.trim()) {
      Alert.alert('Datos', 'Completa para, de y teléfono del comprador.');
      return;
    }
    const phone = normalizeGtWhatsappPhone(emitForm.compradorTelefono);
    if (!phone) {
      Alert.alert('Teléfono', 'Ingresá un número válido (8 dígitos o 502 + 8).');
      return;
    }
    setBusy(true);
    try {
      const res = await createGiftCardActivationCode({
        monto,
        paraNombre: emitForm.paraNombre.trim(),
        deNombre: emitForm.deNombre.trim(),
        mensaje: emitForm.mensaje.trim(),
        compradorTelefono: phone,
      });
      if (!res.ok) {
        Alert.alert('Código de activación', res.error || 'No se pudo generar.');
        return;
      }
      setGeneratedCode(res);
      await loadList();
      setEmitForm({ monto: '', paraNombre: '', deNombre: '', mensaje: '', compradorTelefono: '' });
    } finally {
      setBusy(false);
    }
  }, [emitForm, loadList]);

  const shareActivationCode = useCallback((codeRow) => {
    const code = codeRow?.codigo_activacion || codeRow?.codigoActivacion;
    if (!code) return;
    const phone =
      normalizeGtWhatsappPhone(codeRow?.comprador_telefono || codeRow?.compradorTelefono) ||
      SALON_CONTACTO.whatsapp;
    const msg = [
      `Tarjeta VIP ANDREAS · código de activación: ${code}`,
      `Monto: ${formatQ(codeRow.monto)}`,
      `Actívala en: ${WEB_ACTIVATE_URL}`,
      `Servicio al cliente: ${SALON_CONTACTO.telefonoLabel}`,
    ].join('\n');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    void Linking.openURL(url);
  }, []);

  const notifyGiftCardCliente = useCallback(async (item) => {
    if (!item?.cliente_vinculado_id) return;
    setBusy(true);
    try {
      const { data: cliente, error } = await db.clientes.getById(item.cliente_vinculado_id);
      if (error || !cliente) {
        Alert.alert('WhatsApp', 'No se encontró el cliente vinculado.');
        return;
      }
      await offerGiftCardClienteWhatsApp({
        telefono: cliente.telefono,
        clienteNombre: cliente.nombre || item.cliente_vinculado_nombre,
        codigo: item.codigo,
        saldo: item.saldo,
        montoInicial: item.monto_inicial,
        emitidaEn: item.emitida_en,
        activadaEn: item.activada_en,
        venceEn: item.vence_en,
        estado: item.estado,
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const runActivate = useCallback(
    async (codigo) => {
      Alert.alert(
        'Activar tarjeta',
        '¿Confirmás identidad del destinatario? La tarjeta quedará activa para usar saldo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Activar',
            onPress: async () => {
              setBusy(true);
              try {
                const res = await activateGiftCardAtSalon(codigo);
                if (!res.ok) {
                  Alert.alert('Tarjeta regalo', res.error || 'No se pudo activar.');
                  return;
                }
                await loadList();
                Alert.alert('Listo', 'Tarjeta activada.');
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
    },
    [loadList],
  );

  const openLinkModal = useCallback(async (card) => {
    setLinkTargetCard(card);
    setClienteSearch('');
    setLinkModalOpen(true);
    const { data } = await db.clientes.getAll();
    setClientes(data || []);
  }, []);

  const clientesFiltrados = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return clientes
      .filter((cl) => {
        const blob = [cl.nombre, cl.telefono, cl.email].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 30);
  }, [clientes, clienteSearch]);

  useEffect(() => {
    if (!linkModalOpen) {
      setGiftCardHits([]);
      setGiftSearchBusy(false);
      return undefined;
    }
    if (giftSearchTimerRef.current) clearTimeout(giftSearchTimerRef.current);
    const q = clienteSearch.trim();
    if (!looksLikeGiftCardQuery(q)) {
      setGiftCardHits([]);
      setGiftSearchBusy(false);
      return undefined;
    }
    setGiftSearchBusy(true);
    giftSearchTimerRef.current = setTimeout(() => {
      void (async () => {
        const res = await searchGiftCardsStaff(q, 8);
        setGiftCardHits(res.ok ? res.results || [] : []);
        setGiftSearchBusy(false);
      })();
    }, 350);
    return () => {
      if (giftSearchTimerRef.current) clearTimeout(giftSearchTimerRef.current);
    };
  }, [clienteSearch, linkModalOpen]);

  useEffect(() => {
    if (!initialCodigo || loading || handledInitialRef.current) return;

    handledInitialRef.current = true;

    void (async () => {
      const code = String(initialCodigo).trim().toUpperCase();
      if (!code) {
        onConsumeInitialCodigo?.();
        return;
      }

      let card = cards.find((x) => String(x.codigo || '').toUpperCase() === code);
      const act = pendingCodes.find(
        (x) => String(x.codigo_activacion || '').toUpperCase() === code,
      );

      if (!card && !act) {
        const res = await searchGiftCardsStaff(code, 5);
        const hit = (res.results || []).find(
          (r) => String(r.codigo || '').toUpperCase() === code,
        );
        if (hit?.kind === 'card') {
          card = {
            codigo: hit.codigo,
            para_nombre: hit.para_nombre,
            de_nombre: hit.de_nombre,
            saldo: hit.saldo,
            estado: hit.estado,
            cliente_vinculado_id: hit.cliente_vinculado_id,
            cliente_vinculado_nombre: hit.cliente_vinculado_nombre,
          };
        } else if (hit?.kind === 'activation') {
          onConsumeInitialCodigo?.();
          Alert.alert('Código ACT', `${code} está pendiente de activación en la web.`);
          return;
        }
      }

      onConsumeInitialCodigo?.();

      if (card && card.estado === 'activated' && !card.cliente_vinculado_id) {
        await openLinkModal(card);
        return;
      }
      if (act) {
        Alert.alert('Código ACT', `${code} está pendiente de activación en la web.`);
        return;
      }
      if (card) {
        Alert.alert(
          'Tarjeta encontrada',
          card.cliente_vinculado_nombre
            ? `${code} vinculada a ${card.cliente_vinculado_nombre}.`
            : `${code} — revisá la lista de tarjetas.`,
        );
      }
    })();
  }, [initialCodigo, loading, cards, pendingCodes, openLinkModal, onConsumeInitialCodigo]);

  const handleLinkModalGiftHit = useCallback(
    async (hit) => {
      if (!hit?.codigo) return;
      if (hit.kind === 'activation') {
        Alert.alert('Código ACT', `${hit.codigo} debe activarse en la web antes de vincular.`);
        return;
      }
      const card =
        cards.find((x) => String(x.codigo || '').toUpperCase() === String(hit.codigo).toUpperCase()) ||
        {
          codigo: hit.codigo,
          para_nombre: hit.para_nombre,
          de_nombre: hit.de_nombre,
          saldo: hit.saldo,
          estado: hit.estado,
        };
      if (hit.cliente_vinculado_id) {
        Alert.alert(
          'Ya vinculada',
          `Esta tarjeta está vinculada a ${hit.cliente_vinculado_nombre || 'un cliente'}.`,
        );
        return;
      }
      setGiftCardHits([]);
      setClienteSearch('');
      await openLinkModal(card);
    },
    [cards, openLinkModal],
  );

  const confirmLink = useCallback(
    async (cliente) => {
      if (!linkTargetCard?.codigo || !cliente?.id) return;
      setBusy(true);
      try {
        const res = await linkGiftCardToCliente(linkTargetCard.codigo, cliente.id);
        if (!res.ok) {
          Alert.alert('Vincular', res.error || 'No se pudo vincular.');
          return;
        }
        setLinkModalOpen(false);
        setLinkTargetCard(null);
        await loadList();
        Alert.alert('Vinculado', `Tarjeta asociada a ${cliente.nombre}. El saldo se aplicará en Vender.`);
      } finally {
        setBusy(false);
      }
    },
    [linkTargetCard, loadList],
  );

  const confirmUnlink = useCallback(
    (card) => {
      Alert.alert('Desvincular', `¿Quitar la vinculación de ${card.cliente_vinculado_nombre || 'cliente'}?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const res = await unlinkGiftCardFromCliente(card.codigo);
              if (!res.ok) {
                Alert.alert('Desvincular', res.error || 'No se pudo desvincular.');
                return;
              }
              await loadList();
            } finally {
              setBusy(false);
            }
          },
        },
      ]);
    },
    [loadList],
  );

  const onScanCode = useCallback(
    async (codigo) => {
      setScannerOpen(false);
      await loadList();
      Alert.alert('Tarjeta escaneada', `Código ${codigo} — revisá la lista.`);
    },
    [loadList],
  );

  const selectionKey = (kind, id) => `${kind}:${String(id)}`;

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar selección',
      `¿Eliminar ${sel.count} registro(s)? Se guardará una copia en Basurero antes de borrar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            let ok = 0;
            const errs = [];
            for (const key of sel.selectedIds) {
              const [kind, id] = String(key).split(':');
              if (!id) continue;
              if (kind === 'card') {
                const row = cards.find((x) => String(x.id) === String(id));
                if (!row) continue;
                const r = await deleteRowWithBasurero('gift_cards', row, async () => {
                  const res = await deleteGiftCardStaff(row.id);
                  return res.ok ? { error: null } : { error: { message: res.error || 'Error' } };
                });
                if (r.ok) ok += 1;
                else errs.push(r.error);
              } else if (kind === 'act') {
                const row = pendingCodes.find((x) => String(x.id) === String(id));
                if (!row) continue;
                const r = await deleteRowWithBasurero('gift_card_activation_codes', row, async () => {
                  const res = await deleteGiftCardActivationCodeStaff(row.id);
                  return res.ok ? { error: null } : { error: { message: res.error || 'Error' } };
                });
                if (r.ok) ok += 1;
                else errs.push(r.error);
              }
            }
            sel.exitSelectMode();
            await loadList();
            setDeleteBusy(false);
            if (errs.length) {
              Alert.alert('Completado con errores', `Eliminados: ${ok}. Fallos: ${errs.length}.`);
            } else {
              Alert.alert('Listo', ok === 1 ? 'Registro eliminado.' : `Se eliminaron ${ok} registros.`);
            }
          },
        },
      ],
    );
  };

  const inputStyle = [
    styles.input,
    { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card },
  ];

  const renderCard = (item) => {
    const depleted = item.estado === 'depleted';
    const saldoNum = Number(item.saldo);
    const saldoColor =
      depleted || saldoNum <= 0 ? SALDO_RED : SALDO_GREEN;
    const cardBorder = depleted ? COMPLETADO_BLUE : c.cardBorder;
    const cardBg = depleted ? `${COMPLETADO_BLUE}12` : c.card;
    const picked = sel.isSelected(selectionKey('card', item.id));

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        onPress={() => {
          if (sel.active) sel.toggleId(selectionKey('card', item.id));
        }}
        onLongPress={() => {
          if (!sel.active) sel.setActive(true);
          sel.toggleId(selectionKey('card', item.id));
        }}
        style={[
          styles.cardBox,
          { backgroundColor: picked ? c.surfaceMuted : cardBg, borderColor: cardBorder },
        ]}
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
        <View style={styles.cardTopRow}>
          <Gift size={18} color={depleted ? COMPLETADO_BLUE : c.primary} />
          <Text style={[styles.cardCode, { color: c.foreground, flex: 1 }]}>{item.codigo}</Text>
          {item.estado === 'activated' && saldoNum > 0 && !sel.active ? (
            <TouchableOpacity
              onPress={() =>
                item.cliente_vinculado_id
                  ? confirmUnlink(item)
                  : void openLinkModal(item)
              }
              hitSlop={8}
              accessibilityLabel={
                item.cliente_vinculado_id ? 'Desvincular cliente' : 'Vincular cliente'
              }
            >
              {item.cliente_vinculado_id ? (
                <Link2 size={20} color={c.primary} />
              ) : (
                <UserPlus size={20} color={c.primary} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.cardMeta, { color: c.foregroundMuted }]}>
          Para: {item.para_nombre} · De: {item.de_nombre}
        </Text>
        {item.mensaje ? (
          <Text style={[styles.cardQuote, { color: c.foreground }]}>&ldquo;{item.mensaje}&rdquo;</Text>
        ) : null}
        <Text style={[styles.cardSaldo, { color: saldoColor }]}>
          Saldo: {formatQ(item.saldo)} / {formatQ(item.monto_inicial)}
        </Text>
        <Text style={[styles.cardMeta, { color: depleted ? COMPLETADO_BLUE : c.foregroundMuted }]}>
          {estadoLabel(item.estado)}
          {item.cliente_vinculado_nombre ? ` · ${item.cliente_vinculado_nombre}` : ''}
        </Text>
        <Text style={[styles.cardMeta, { color: c.foregroundMuted }]}>
          Emisión: {formatWhen(item.emitida_en)} · Vence: {formatWhen(item.vence_en)}
        </Text>

        {item.cliente_vinculado_id &&
        !sel.active &&
        ((item.estado === 'activated' && saldoNum < Number(item.monto_inicial)) ||
          item.estado === 'depleted') ? (
          <View style={styles.waSaldoRow}>
            <Text style={[styles.waSaldoHint, { color: c.foregroundSubtle }]}>
              {item.estado === 'depleted' ? 'Tarjeta completada' : 'Saldo actualizado'}
            </Text>
            <TouchableOpacity
              hitSlop={10}
              onPress={() => void notifyGiftCardCliente(item)}
              disabled={busy}
              accessibilityLabel={
                item.estado === 'depleted'
                  ? 'Agradecer por WhatsApp'
                  : 'Avisar saldo por WhatsApp'
              }
            >
              <Text style={[styles.waSaldoLink, { color: c.primary }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {item.estado === 'issued' && !sel.active ? (
          <SalonButton
            title="Activar tarjeta (verificar ID)"
            variant="heroGold"
            fullWidth
            onPress={() => void runActivate(item.codigo)}
            disabled={busy}
            style={{ marginTop: spacing.sm }}
          />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Tarjetas regalo"
        subtitle="VIP · código · activación y saldo"
        onBack={onBack}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: sel.count ? 100 : spacing.xxl }}>
          <TouchableOpacity
            style={[styles.emitHeader, { borderColor: c.cardBorder, backgroundColor: c.card }]}
            onPress={() => setEmitOpen((v) => !v)}
          >
            <KeyRound size={18} color={c.primary} />
            <Text style={[styles.emitHeaderTxt, { color: c.foreground }]}>
              Emitir código de activación
            </Text>
          </TouchableOpacity>

          {emitOpen ? (
            <View style={[styles.emitBox, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <Text style={[styles.emitHint, { color: c.foregroundMuted }]}>
                Tras validar monto y pago, generá un código de 6 dígitos para que el comprador lo
                ingrese en la web.
              </Text>
              <TextInput style={inputStyle} placeholder="Monto Q (50–10,000)" placeholderTextColor={c.foregroundSubtle} keyboardType="decimal-pad" value={emitForm.monto} onChangeText={(v) => setEmitForm((f) => ({ ...f, monto: v }))} />
              <TextInput style={inputStyle} placeholder="Para (destinatario)" placeholderTextColor={c.foregroundSubtle} value={emitForm.paraNombre} onChangeText={(v) => setEmitForm((f) => ({ ...f, paraNombre: v }))} />
              <TextInput style={inputStyle} placeholder="De (comprador)" placeholderTextColor={c.foregroundSubtle} value={emitForm.deNombre} onChangeText={(v) => setEmitForm((f) => ({ ...f, deNombre: v }))} />
              <TextInput style={inputStyle} placeholder="Teléfono comprador (WhatsApp)" placeholderTextColor={c.foregroundSubtle} keyboardType="phone-pad" value={emitForm.compradorTelefono} onChangeText={(v) => setEmitForm((f) => ({ ...f, compradorTelefono: v }))} />
              <TextInput style={inputStyle} placeholder="Mensaje (opcional)" placeholderTextColor={c.foregroundSubtle} value={emitForm.mensaje} onChangeText={(v) => setEmitForm((f) => ({ ...f, mensaje: v }))} />
              <SalonButton title="Generar código ACT-" variant="heroGold" fullWidth onPress={() => void runEmitCode()} disabled={busy} />
            </View>
          ) : null}

          {pendingCodes.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <Text style={[styles.sectionLbl, { color: c.foreground }]}>Códigos pendientes</Text>
              {pendingCodes.map((row) => {
                const picked = sel.isSelected(selectionKey('act', row.id));
                return (
                  <TouchableOpacity
                    key={row.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (sel.active) sel.toggleId(selectionKey('act', row.id));
                      else shareActivationCode(row);
                    }}
                    onLongPress={() => {
                      if (!sel.active) sel.setActive(true);
                      sel.toggleId(selectionKey('act', row.id));
                    }}
                    style={[
                      styles.row,
                      {
                        backgroundColor: picked ? c.surfaceMuted : c.card,
                        borderColor: c.cardBorder,
                      },
                    ]}
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
                        {picked ? (
                          <Check size={14} color={isDark ? '#141414' : '#fff'} strokeWidth={3} />
                        ) : null}
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: c.foreground }]}>{row.codigo_activacion}</Text>
                      <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>
                        {row.para_nombre} · {formatQ(row.monto)}
                      </Text>
                    </View>
                    {!sel.active ? (
                      <Text style={{ color: c.primary, fontFamily: typography.fontSansMedium, fontSize: 13 }}>
                        WhatsApp
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <SalonButton
            title="Escanear QR tarjeta"
            variant="outlineGold"
            fullWidth
            onPress={() => setScannerOpen(true)}
            disabled={busy}
            style={{ marginTop: spacing.lg, marginBottom: spacing.md }}
          />

          {!loading && (cards.length > 0 || pendingCodes.length > 0) ? (
            <View style={styles.listToolbar}>
              <Text style={[styles.hintInline, { color: c.foregroundMuted }]}>Mantené presionado para seleccionar</Text>
              <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
          ) : cards.length === 0 ? (
            <Text style={[styles.empty, { color: c.foregroundMuted }]}>
              Las tarjetas activadas aparecerán aquí cuando el comprador use su código en la web.
            </Text>
          ) : (
            <>
              <Text style={[styles.sectionLbl, { color: c.foreground }]}>Tarjetas</Text>
              {cards.map((item) => renderCard(item))}
            </>
          )}
        </ScrollView>
      </SubScreenChrome>

      {sel.active && sel.count > 0 ? (
        <ListSelectionActionBar
          count={sel.count}
          onCancel={sel.exitSelectMode}
          onConfirm={confirmDeleteSelected}
          confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar'}
          confirmTextStyle={{ color: c.error }}
          confirmStyle={{ borderColor: c.error }}
          colors={c}
          bottomInset={insets.bottom}
        />
      ) : null}

      <Modal visible={Boolean(generatedCode)} transparent animationType="fade" onRequestClose={() => setGeneratedCode(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Código generado</Text>
            <Text style={[styles.modalCode, { color: c.primary }]}>{generatedCode?.codigo_activacion}</Text>
            <Text style={[styles.modalMeta, { color: c.foregroundMuted }]}>
              {generatedCode?.para_nombre} · {formatQ(generatedCode?.monto)}
            </Text>
            <Text style={[styles.modalHint, { color: c.foregroundMuted }]}>
              Dictá este código al comprador. Debe ingresarlo en la web para obtener la tarjeta PNG.
            </Text>
            <SalonButton title="Enviar por WhatsApp" variant="heroGold" fullWidth onPress={() => shareActivationCode(generatedCode)} style={{ marginTop: spacing.md }} />
            <SalonButton title="Cerrar" variant="outlineGray" fullWidth onPress={() => setGeneratedCode(null)} style={{ marginTop: spacing.sm }} />
          </View>
        </View>
      </Modal>

      <Modal visible={linkModalOpen} transparent animationType="slide" onRequestClose={() => setLinkModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.linkModalCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Vincular cliente</Text>
            <Text style={[styles.modalHint, { color: c.foregroundMuted }]}>
              Tarjeta {linkTargetCard?.codigo} — buscá el cliente para aplicar saldo en Vender.
            </Text>
            <SalonSearchBar
              value={clienteSearch}
              onChangeText={setClienteSearch}
              placeholder="Nombre, teléfono, email o código GC-/ACT-"
            />
            {giftSearchBusy ? (
              <ActivityIndicator style={{ marginTop: spacing.sm }} color={c.primary} size="small" />
            ) : null}
            {giftCardHits.length > 0 ? (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={[styles.linkSectionLbl, { color: c.primary }]}>Tarjeta regalo</Text>
                {giftCardHits.map((hit) => (
                  <GiftCardSearchHitRow
                    key={`${hit.kind}-${hit.codigo}`}
                    hit={hit}
                    onPress={() => void handleLinkModalGiftHit(hit)}
                  />
                ))}
              </View>
            ) : null}
            <FlatList
              data={clientesFiltrados}
              keyExtractor={(item) => String(item.id)}
              style={{ maxHeight: 280, marginTop: spacing.sm }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                clienteSearch.trim().length >= 2 ? (
                  <Text style={[styles.empty, { color: c.foregroundMuted }]}>Sin resultados</Text>
                ) : (
                  <Text style={[styles.empty, { color: c.foregroundMuted }]}>Escribí al menos 2 caracteres</Text>
                )
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.clienteRow, { borderBottomColor: c.cardBorder }]}
                  onPress={() => void confirmLink(item)}
                  disabled={busy}
                >
                  <View style={styles.clienteRowMain}>
                    <ClienteOrigenIcon row={item} size={15} showLabel />
                    <View style={styles.clienteRowText}>
                      <Text style={[styles.rowTitle, { color: c.foreground }]}>{item.nombre}</Text>
                      <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>
                        {[item.telefono, item.email, clienteOrigenLabel(item)]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
            <SalonButton title="Cancelar" variant="outlineGray" fullWidth onPress={() => setLinkModalOpen(false)} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>

      <GiftCardQrScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onPayload={(code) => void onScanCode(code)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  emitHeaderTxt: { fontFamily: typography.fontSansMedium, fontSize: 15, flex: 1 },
  emitBox: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  emitHint: { fontFamily: typography.fontSans, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  sectionLbl: { fontFamily: typography.fontSansMedium, fontSize: 14, marginBottom: spacing.sm },
  listToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  hintInline: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    flex: 1,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardBox: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardCode: { fontFamily: typography.fontSansMedium, fontSize: 16 },
  cardMeta: { fontFamily: typography.fontSans, fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardQuote: { fontFamily: typography.fontSans, fontSize: 13, fontStyle: 'italic', marginTop: spacing.xs },
  cardSaldo: { fontFamily: typography.fontSansMedium, fontSize: 16, marginTop: spacing.xs },
  waSaldoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: 4,
  },
  waSaldoHint: { fontFamily: typography.fontSans, fontSize: 11 },
  waSaldoLink: { fontFamily: typography.fontSansMedium, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: typography.fontSans,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  empty: { fontFamily: typography.fontSans, fontSize: 14, textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowTitle: { fontFamily: typography.fontSansMedium, fontSize: 15 },
  rowSub: { fontFamily: typography.fontSans, fontSize: 13, marginTop: 2 },
  clienteRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  clienteRowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clienteRowText: { flex: 1, minWidth: 0 },
  linkSectionLbl: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  linkModalCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, maxHeight: '85%' },
  modalTitle: { fontFamily: typography.fontSansMedium, fontSize: 16 },
  modalCode: { fontFamily: typography.fontDisplay, fontSize: 28, marginTop: spacing.md, letterSpacing: 2 },
  modalMeta: { fontFamily: typography.fontSans, fontSize: 14, marginTop: spacing.xs },
  modalHint: { fontFamily: typography.fontSans, fontSize: 13, marginTop: spacing.md, lineHeight: 19 },
});
