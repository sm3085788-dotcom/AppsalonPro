import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ChevronLeft, Star, Truck, Package, CreditCard, Wallet, QrCode } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SalonButton } from '../luxury/SalonButton';
import { createSubStyles } from '../luxury/SubScreenChrome';
import { useTheme } from '../../theme/ThemeProvider';
import { useTiendaCart } from '../../context/TiendaCartContext';
import { TiendaCatalogGrid } from './TiendaCatalogGrid';
import { ClientSucursalPicker } from '../sucursal/ClientSucursalPicker';
import { ProductImageStrip } from './ProductImageStrip';
import { PickupQrDisplay } from './PickupQrDisplay';
import { TarjetaPagoForm } from './TarjetaPagoForm';
import { TiendaCartItemCard } from './TiendaCartItemCard';
import {
  confirmarCompraConTarjeta,
  crearPedidoEfectivo,
  buildTiendaProductFicha,
  db,
  mapInventarioToTiendaProduct,
  getArticuloTipo,
  splitClienteNotasEnvio,
  mergeClienteNotasEnvio,
  normalizeEnvioGuardado,
  REFERIDO_PREMIOS_COPY,
  applyDiscountToSubtotal,
  isProductAvailableAtBranch,
  validateCartBranchStock,
  fetchBranchStock,
  validateTarjetaForm,
  isStripeConfigured,
  listStripeSavedCards,
  formatSavedCardLabel,
  formatSavedCardSub,
} from '@appsalon/shared-config';
import { TiendaDomicilioStripePay } from '../stripe/TiendaDomicilioStripePay';
import { ProductReviewsSection } from './ProductReviewsSection';
import {
  buildTiendaCanjeCatalogSummary,
  buildTiendaCanjeSuccessNote,
  fetchTiendaProductoCanjesPendientes,
  formatPctCanje,
} from '../../utils/tiendaCanjePremios';
import {
  ANDREAS_CANJE_PROMO_BLOCK_MSG,
  ANDREAS_CANJE_PROMO_PARTIAL_MSG,
  cartHasPromoItems,
  itemsBlockAndreasCanje,
  subtotalEligibleForAndreasCanje,
} from '../../utils/andreasCanjePromo';

const STAR_GOLD = '#FFB800';
const STAR_EMPTY = '#E3E3E3';

function formatQ(amount) {
  return `Q ${Number(amount).toFixed(2)}`;
}

function RatingStars({ rating }) {
  const styles = useTiendaStyles();
  const { isDark } = useTheme();
  const starEmpty = isDark ? '#525252' : STAR_EMPTY;
  const full = Math.floor(Math.min(5, Math.max(0, rating)));
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          color={s <= full ? STAR_GOLD : starEmpty}
          fill={s <= full ? STAR_GOLD : starEmpty}
          strokeWidth={0}
        />
      ))}
    </View>
  );
}

function PhaseBack({ label, onPress }) {
  const styles = useTiendaStyles();
  const { colors: tc } = useTheme();
  return (
    <TouchableOpacity
      style={styles.phaseBack}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
    >
      <ChevronLeft size={22} color={tc.foreground} strokeWidth={2} />
      <Text style={styles.phaseBackTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function SpecRow({ label, value }) {
  const styles = useTiendaStyles();
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

/**
 * Catálogo → ficha → resumen → envío → pago → confirmación.
 * Tarjeta y efectivo crean pedido en `ecommerce_orders`; dirección de envío opcional se guarda en la ficha cliente.
 */
export function TiendaFlow({
  onClose,
  clienteId,
  clienteNombre,
  clienteTelefono,
  clienteDireccion,
  clientUserId,
  initialProductId = null,
  initialPhase = null,
  /** Al abrir desde carrusel publicidad: agregar producto al carrito y mostrar fase «cart». */
  tiendaAddToCart = false,
  /** Cambia al abrir el carrito desde el header para forzar fase «cart» aunque el payload sea igual. */
  tiendaOpenKey = 0,
  onPurchaseComplete,
  onPedidosChanged,
}) {
  const { colors: tc, isDark } = useTheme();
  const styles = useTiendaStyles();
  const subStyles = useMemo(() => createSubStyles(tc), [tc]);
  const { cartItems, setCartItems } = useTiendaCart();
  const [phase, setPhase] = useState(initialPhase || 'catalog');
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(0);
  const [savedCards, setSavedCards] = useState([]);
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [shipId, setShipId] = useState('ship-home');
  const [homeAddressType, setHomeAddressType] = useState('casa');
  const [homeContactName, setHomeContactName] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [homeAddressFull, setHomeAddressFull] = useState('');
  const [homeSaved, setHomeSaved] = useState(false);
  const [pickupQrIssued, setPickupQrIssued] = useState(false);
  const [payId, setPayId] = useState('pay-card');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [cardSavedToast, setCardSavedToast] = useState(false);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [lastOrder, setLastOrder] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [gridCartToast, setGridCartToast] = useState(null);
  const [sucursalId, setSucursalId] = useState(null);
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const [referidorCheckout, setReferidorCheckout] = useState(null);
  const [esReferidoInvitado, setEsReferidoInvitado] = useState(false);
  const [referidorCodigoInput, setReferidorCodigoInput] = useState('');
  const [tiendaCanjeAvisos, setTiendaCanjeAvisos] = useState([]);
  const [payCanjePreview, setPayCanjePreview] = useState(null);
  const deepLinkDone = useRef(false);
  const stripePayRef = useRef(null);

  useEffect(() => {
    deepLinkDone.current = false;
  }, [initialProductId, tiendaOpenKey, tiendaAddToCart]);

  useEffect(() => {
    if (!clientUserId) {
      setReferidorCheckout(null);
      setEsReferidoInvitado(false);
      return;
    }
    void db.referidosAndreas.checkoutInfo(clientUserId).then(({ data }) => {
      if (data?.needs_code) {
        setReferidorCheckout(data);
        setReferidorCodigoInput(String(data.referidor_codigo || '').trim().toUpperCase());
      } else {
        setReferidorCheckout(null);
      }
    });
    if (clienteId) {
      void db.clientes.getById(clienteId).then(({ data }) => {
        setEsReferidoInvitado(Boolean(data?.referido_por));
      });
    } else {
      setEsReferidoInvitado(false);
    }
  }, [clientUserId, clienteId]);

  const avisarPremiosPedidoCreado = () => {
    if (!clientUserId || !clienteId || !esReferidoInvitado) return;
    void db.premiosAndreas.notifyReferidoAccion({
      clientUserId,
      clienteId,
      titulo: 'Pedido registrado',
      mensaje: REFERIDO_PREMIOS_COPY.compraPendiente,
      targetScreen: 'premios',
    });
  };

  const buildCheckoutSnapshot = () => {
    const snap = {};
    if (referidorCheckout?.needs_code) {
      const codigo = String(referidorCodigoInput || referidorCheckout.referidor_codigo || '')
        .trim()
        .toUpperCase();
      if (codigo) {
        snap.referidor_codigo = codigo;
        snap.referidor_user_id = referidorCheckout.referidor_user_id || null;
        snap.primera_compra_referido = true;
      }
    }
    return Object.keys(snap).length ? snap : null;
  };

  const resolveAndreasCanjeForCheckout = async (payment_method) => {
    const eligibleSubtotal = subtotalEligibleForAndreasCanje(cartItems);
    if (eligibleSubtotal <= 0) {
      return {
        total: cartSubtotal,
        snapExtra: null,
        discount: null,
        pending: null,
        blockedByPromo: cartHasPromoItems(cartItems),
      };
    }
    if (!clienteId) return { total: cartSubtotal, snapExtra: null, discount: null };
    const { data: row, error } = await db.clientes.getById(clienteId);
    if (error || !row) return { total: cartSubtotal, snapExtra: null, discount: null };
    const { data: pending } = await db.premiosAndreas.getCanjeCheckout({
      clienteRow: row,
      shipId,
      payment_method,
    });
    if (!pending?.ruleId) return { total: cartSubtotal, snapExtra: null, discount: null, pending: null };
    const calc = applyDiscountToSubtotal(eligibleSubtotal, pending.descuento_pct);
    const promoSubtotal = Math.max(0, cartSubtotal - eligibleSubtotal);
    const total = Math.round((promoSubtotal + calc.total) * 100) / 100;
    return {
      total,
      discount: calc,
      pending,
      partialPromo: cartHasPromoItems(cartItems),
      snapExtra: {
        andreas_canje: {
          rule_id: pending.ruleId,
          descuento_pct: calc.descuento_pct,
          descuento_monto: calc.discount,
          subtotal_antes: calc.subtotal,
          excluye_promocion: cartHasPromoItems(cartItems) || undefined,
        },
      },
    };
  };

  const buildAndreasCanjeFromCheckout = (canjeResult) => {
    if (!canjeResult?.discount || !canjeResult?.pending?.ruleId) return null;
    return {
      ruleId: canjeResult.pending.ruleId,
      descuento_pct: canjeResult.discount.descuento_pct,
      descuento_monto: canjeResult.discount.discount,
      subtotal_antes: canjeResult.discount.subtotal,
    };
  };

  useEffect(() => {
    if (phase !== 'catalog' || !clienteId) {
      if (phase === 'catalog') setTiendaCanjeAvisos([]);
      return;
    }
    let cancelled = false;
    void fetchTiendaProductoCanjesPendientes(clienteId, db).then((avisos) => {
      if (!cancelled) setTiendaCanjeAvisos(avisos);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, clienteId, tiendaOpenKey]);

  useEffect(() => {
    if (phase !== 'pay' || !clienteId || !cartItems.length || itemsBlockAndreasCanje(cartItems)) {
      setPayCanjePreview(null);
      return;
    }
    const pm = payId === 'pay-card' ? 'tarjeta' : 'efectivo';
    let cancelled = false;
    void resolveAndreasCanjeForCheckout(pm).then((r) => {
      if (!cancelled) setPayCanjePreview(r.discount ? r : null);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, payId, shipId, clienteId, cartSubtotal, cartItems]);
  const gridToastTimer = useRef(null);

  useEffect(() => {
    if (initialPhase) setPhase(initialPhase);
  }, [initialPhase, tiendaOpenKey]);

  useEffect(() => {
    if (phase !== 'ship' || shipId !== 'ship-home' || !clienteId) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await db.clientes.getById(clienteId);
        if (cancelled || error || !data) return;
        const { envio } = splitClienteNotasEnvio(data.notas);
        const n = normalizeEnvioGuardado(envio);
        if (!n) {
          setHomeContactName((p) => p || String(clienteNombre || '').trim());
          const tel = String(clienteTelefono || '')
            .replace(/—/g, '')
            .trim();
          if (tel.length >= 6) setHomePhone((p) => p || tel);
          const dirPerfil = String(clienteDireccion || '').trim();
          if (dirPerfil.length >= 10) setHomeAddressFull((p) => p || dirPerfil);
          return;
        }
        setHomeAddressType(n.tipo);
        setHomeContactName(n.contacto || String(clienteNombre || '').trim());
        const tel =
          n.telefono ||
          String(clienteTelefono || '')
            .replace(/—/g, '')
            .trim();
        setHomePhone(tel);
        setHomeAddressFull(n.direccion || '');
        const contactOk = String(n.contacto || clienteNombre || '').trim().length > 0;
        const telOk = String(n.telefono || tel || '').trim().length >= 6;
        const dirOk = String(n.direccion || '').trim().length >= 10;
        if (contactOk && telOk && dirOk) setHomeSaved(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, shipId, clienteId, clienteNombre, clienteTelefono, clienteDireccion]);

  useEffect(
    () => () => {
      if (gridToastTimer.current) clearTimeout(gridToastTimer.current);
    },
    [],
  );

  const specsAndCopy = useMemo(() => {
    if (selected?.inventarioId || selected?.id) {
      return buildTiendaProductFicha(selected);
    }
    return { specs: [], longCopy: selected?.descripcion || '' };
  }, [selected]);
  const cartSubtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.priceAmount * item.qty, 0),
    [cartItems],
  );
  const cartBloqueaCanjePorPromo = itemsBlockAndreasCanje(cartItems);
  const cartCanjeParcialPromo = cartHasPromoItems(cartItems) && !cartBloqueaCanjePorPromo;
  const tiendaCanjeResumen = useMemo(
    () => (tiendaCanjeAvisos.length ? buildTiendaCanjeCatalogSummary(tiendaCanjeAvisos) : ''),
    [tiendaCanjeAvisos],
  );

  const goCatalog = () => {
    setPhase('catalog');
    setSelected(null);
    setQty(0);
  };

  const showGridCartToast = (title) => {
    if (gridToastTimer.current) clearTimeout(gridToastTimer.current);
    setGridCartToast(title || 'Producto');
    gridToastTimer.current = setTimeout(() => setGridCartToast(null), 2200);
  };

  const quickAddToCart = (product) => {
    if (!isProductAvailableAtBranch(product)) {
      Alert.alert(
        'Sin existencia',
        `«${product?.title || 'Este producto'}» no tiene stock en la sucursal elegida. Cambiá de sucursal o elegí otro producto.`,
      );
      return;
    }
    addToCart(product, 1);
    showGridCartToast(product?.title);
  };

  const openProduct = (product) => {
    if (product?.catalogKind === 'promo') {
      Alert.alert(
        product.title || 'Promoción',
        product.promoBody?.trim() || 'Consultá condiciones en recepción Salon Andreas.',
        [{ text: 'OK' }],
      );
      return;
    }
    const inCart = cartItems.find((i) => i.id === product.id);
    setSelected(product);
    setQty(inCart ? Math.min(9, inCart.qty) : 0);
    setSpecsExpanded(!!(product?.inventarioId || product?.articuloTipo));
    setPhase('detail');
  };

  const bumpQty = (delta) => {
    setQty((q) => {
      const max = selected?.stockActual != null ? Math.min(9, selected.stockActual) : 9;
      return Math.min(max, Math.max(0, q + delta));
    });
  };

  const setCartProductQty = useCallback((product, quantity) => {
    if (!product || product.precioVariable) return;
    if (quantity < 1) {
      setCartItems((prev) => prev.filter((i) => i.id !== product.id));
      return;
    }
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.id === product.id);
      const capped = Math.min(99, quantity);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                qty: capped,
                imageUri: item.imageUri || product.imageUri || null,
                stockHint: item.stockHint || product.stockHint || null,
                shippingLabel: item.shippingLabel || product.shippingLabel || null,
                promocionVigente: Boolean(item.promocionVigente || product.promocionVigente),
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          priceAmount: product.priceAmount ?? 0,
          priceLabel: product.priceLabel ?? 'Q 0.00',
          imageUri: product.imageUri || null,
          stockHint: product.stockHint || null,
          shippingLabel: product.shippingLabel || null,
          promocionVigente: Boolean(product.promocionVigente),
          qty: capped,
        },
      ];
    });
  }, [setCartItems]);

  useEffect(() => {
    if (phase !== 'detail' || !selected?.id || selected.precioVariable) return;
    setCartProductQty(selected, qty);
  }, [phase, selected, qty, setCartProductQty]);

  const addToCart = (product, quantity = 1) => {
    if (!product || quantity < 1) return;
    if (product.precioVariable) {
      Alert.alert(
        'Precio variable',
        'Este servicio se cotiza en el salón según el volumen de tu cabello. Agendá tu cita para conocer el precio.',
      );
      return;
    }
    if (!isProductAvailableAtBranch(product)) {
      Alert.alert(
        'Sin existencia',
        `«${product.title || 'Este producto'}» no tiene stock en la sucursal elegida.`,
      );
      return;
    }
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.id === product.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                qty: Math.min(99, item.qty + quantity),
                imageUri: item.imageUri || product.imageUri || null,
                stockHint: item.stockHint || product.stockHint || null,
                shippingLabel: item.shippingLabel || product.shippingLabel || null,
                promocionVigente: Boolean(item.promocionVigente || product.promocionVigente),
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          priceAmount: product.priceAmount ?? 0,
          priceLabel: product.priceLabel ?? 'Q 0.00',
          imageUri: product.imageUri || null,
          stockHint: product.stockHint || null,
          shippingLabel: product.shippingLabel || null,
          promocionVigente: Boolean(product.promocionVigente),
          qty: quantity,
        },
      ];
    });
  };

  useEffect(() => {
    if (!sucursalId || !cartItems.length) return undefined;
    let cancelled = false;
    void (async () => {
      const kept = [];
      const removed = [];
      for (const item of cartItems) {
        const stock = await fetchBranchStock(item.id, sucursalId);
        if (cancelled) return;
        if (stock >= Number(item.qty || 0) && stock > 0) {
          kept.push(item);
        } else {
          removed.push(item.title || 'Producto');
        }
      }
      if (cancelled || removed.length === 0) return;
      setCartItems(kept);
      Alert.alert(
        'Carrito actualizado',
        removed.length === 1
          ? `«${removed[0]}» no tiene existencia en la sucursal elegida y se quitó del carrito.`
          : `${removed.length} productos sin stock en esta sucursal se quitaron del carrito.`,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [sucursalId]);

  useEffect(() => {
    const productId = initialProductId != null ? String(initialProductId).trim() : '';
    if (!productId || deepLinkDone.current) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await db.inventario.getById(productId, { sucursalId: sucursalId || undefined });
      if (cancelled || error || !data) {
        if (tiendaAddToCart && !cancelled) {
          Alert.alert(
            'Tienda',
            'No se pudo cargar el producto de la publicidad. Probá desde Tienda en el menú.',
          );
        }
        return;
      }
      if (getArticuloTipo(data) === 'servicio') {
        deepLinkDone.current = true;
        Alert.alert(
          'Servicio',
          'Este ítem se agenda en Mis citas. Abrí la pestaña Servicios desde Inicio.',
        );
        return;
      }
      const product = mapInventarioToTiendaProduct(data);
      if (!product) return;
      deepLinkDone.current = true;
      if (tiendaAddToCart) {
        if (product.precioVariable) {
          Alert.alert(
            'Servicio',
            'Este ítem se agenda en Mis citas, no en la tienda.',
          );
          return;
        }
        if (!isProductAvailableAtBranch(product)) {
          Alert.alert(
            'Sin existencia',
            `«${product.title}» no tiene stock en la sucursal elegida.`,
          );
          return;
        }
        addToCart(product, 1);
        setPhase('cart');
        return;
      }
      setSelected(product);
      setQty(0);
      setPhase('detail');
    })();
    return () => {
      cancelled = true;
    };
  }, [initialProductId, tiendaAddToCart, tiendaOpenKey]);

  const updateCartQty = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(0, Math.min(99, item.qty + delta)) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const shipOptions = [
    {
      id: 'ship-home',
      label: 'Envío a domicilio',
      sub: 'Confirmá tu dirección y pagá con tarjeta. Tu pedido queda en camino al completar el pago.',
    },
    { id: 'ship-salon', label: 'Retiro en salón', sub: 'Aura Salón · listo en 24 h' },
  ];

  const payOptions = useMemo(
    () => [
      {
        id: 'pay-card',
        label: shipId === 'ship-home' ? 'Tarjeta de crédito o débito' : 'Tarjeta guardada',
        sub:
          shipId === 'ship-home'
            ? 'Ingresá los datos de tu tarjeta. El pago se confirma al finalizar la compra.'
            : 'Se envía el pedido al salón; el cobro lo confirma el equipo con su pasarela.',
        Icon: CreditCard,
      },
      {
        id: 'pay-cash',
        label: 'Pagar en efectivo',
        sub:
          shipId === 'ship-home'
            ? 'Un agente del salón te llamará para coordinar el envío y el cobro.'
            : 'Pagás al retirar en recepción. Recibirás un código QR para el salón.',
        Icon: Wallet,
      },
    ],
    [shipId],
  );
  useEffect(() => {
    if (phase !== 'pay' || !isStripeConfigured() || !clientUserId) return;
    let cancelled = false;
    void listStripeSavedCards().then((res) => {
      if (cancelled) return;
      const cards = (res.ok ? res.cards : []).map((c) => ({
        ...c,
        label: formatSavedCardLabel(c),
        sub: formatSavedCardSub(c),
      }));
      setSavedCards(cards);
      if (cards.length && !selectedCardId) setSelectedCardId(cards[0].id);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, clientUserId, selectedCardId]);

  const savedCardsUi = useMemo(
    () =>
      savedCards.map((c) => ({
        id: c.id,
        label: c.label || formatSavedCardLabel(c),
        sub: c.sub || formatSavedCardSub(c),
        last4: c.last4,
      })),
    [savedCards],
  );
  const selectedCard = savedCardsUi.find((c) => c.id === selectedCardId) ?? savedCardsUi[0];
  const homeShipFieldsOk =
    String(homeContactName).trim().length > 0 &&
    String(homePhone).trim().length >= 6 &&
    String(homeAddressFull).trim().length >= 10;
  const shippingReady = shipId === 'ship-home' ? homeSaved && homeShipFieldsOk : pickupQrIssued;

  const buildDeliveryAddressSnapshot = () => {
    if (shipId !== 'ship-home') return null;
    return [
      `Tipo: ${homeAddressType === 'casa' ? 'Casa' : 'Trabajo'}`,
      `Contacto: ${String(homeContactName).trim()}`,
      `Tel: ${String(homePhone).trim()}`,
      `Dirección: ${String(homeAddressFull).trim()}`,
    ].join('\n');
  };

  const cardLast4FromSelection = () => {
    if (selectedCard?.last4) return String(selectedCard.last4);
    const m = String(selectedCardId || '').match(/(\d{4})$/);
    return m ? m[1] : null;
  };

  const resolveCardPaymentForCheckout = () => {
    if (shipId === 'ship-home') {
      return validateTarjetaForm({
        holder: cardHolder,
        number: cardNumber,
        exp: cardExp,
        cvv: cardCvv,
      });
    }
    return { ok: true, last4: cardLast4FromSelection() };
  };

  const domicilioUsaStripe = shipId === 'ship-home' && payId === 'pay-card' && isStripeConfigured();

  const checkoutButtonTitle = useMemo(() => {
    if (checkoutBusy) return 'Procesando…';
    if (domicilioUsaStripe) return 'Pagar con Stripe';
    if (shipId === 'ship-home' && payId === 'pay-card') return 'Confirmar pago y pedido';
    return 'Enviar pedido al salón';
  }, [checkoutBusy, shipId, payId, domicilioUsaStripe]);

  return (
    <View style={styles.wrap}>
      {phase === 'catalog' && (
        <>
          {gridCartToast ? (
            <Text style={styles.cartBanner}>✓ {gridCartToast} · añadido al carrito</Text>
          ) : null}
          <ClientSucursalPicker
            compact
            canjeSummary={tiendaCanjeResumen}
            onChange={(id) => {
              setSucursalId(id);
              setCatalogReloadKey((k) => k + 1);
            }}
          />
          <TiendaCatalogGrid
            key={`${sucursalId || 'none'}-${catalogReloadKey}`}
            sucursalId={sucursalId}
            onProductPress={openProduct}
            onAddToCart={quickAddToCart}
          />
        </>
      )}

      {phase === 'detail' && selected ? (
        <View style={styles.section}>
          <PhaseBack label="Catálogo" onPress={goCatalog} />

          <View style={styles.heroCard}>
            <ProductImageStrip
              uris={
                selected.imageUris?.length
                  ? selected.imageUris
                  : selected.imageUri
                    ? [selected.imageUri]
                    : []
              }
              badgeText={selected.badge}
              badgePromo={!!selected.promocionVigente}
            />
          </View>

          {selected.brandLine ? (
            <Text style={styles.brandLine}>{selected.brandLine}</Text>
          ) : null}
          <Text style={styles.detailTitle}>{selected.title}</Text>

          {selected.promocionVigente ? (
            <View style={[styles.canjeBanner, { borderColor: tc.foregroundSubtle, backgroundColor: tc.surfaceMuted, marginBottom: spacing.sm }]}>
              <Text style={[styles.canjeBannerTxt, { color: tc.foregroundMuted }]}>
                {ANDREAS_CANJE_PROMO_BLOCK_MSG}
              </Text>
            </View>
          ) : null}

          <View style={styles.ratingBlock}>
            <View style={styles.ratingAction}>
              <RatingStars rating={selected.rating} />
              <Text style={styles.ratingNum}>{selected.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.ratingCount}>({selected.reviewCount} opiniones)</Text>
          </View>

          <View style={styles.priceBlock}>
            {selected.compareAtLabel ? (
              <Text style={styles.compareAt}>{selected.compareAtLabel}</Text>
            ) : null}
            <Text
              style={[
                styles.priceBig,
                selected.precioVariable && { fontSize: 20, letterSpacing: 0.2 },
              ]}
            >
              {selected.priceLabel}
            </Text>
            {selected.precioVariable ? (
              <Text style={styles.precioVariableNote}>
                El precio depende del volumen de tu cabello. En el salón te indican el monto antes del servicio.
              </Text>
            ) : null}
          </View>

          <View style={styles.shipInline}>
            <Truck size={16} color={tc.foregroundMuted} strokeWidth={2} />
            <Text style={styles.shipInlineTxt}>{selected.shippingLabel}</Text>
          </View>
          {selected.stockHint ? (
            <Text style={styles.stockHint}>{selected.stockHint}</Text>
          ) : null}

          <View style={[subStyles.card, styles.copyCard]}>
            <Text style={subStyles.rowLabel}>Descripción</Text>
            <Text style={subStyles.bullets}>{specsAndCopy.longCopy}</Text>
          </View>

          {specsAndCopy.specs.length > 0 ? (
            <View style={[subStyles.card, styles.specCard]}>
              <TouchableOpacity
                style={styles.specHead}
                onPress={() => setSpecsExpanded((v) => !v)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Mostrar u ocultar especificaciones"
              >
                <Text style={subStyles.rowLabel}>Más información</Text>
                <Text style={styles.specToggleTxt}>{specsExpanded ? 'Ocultar' : 'Ver'}</Text>
              </TouchableOpacity>
              {specsExpanded
                ? specsAndCopy.specs.map((row) => (
                    <SpecRow key={row.label} label={row.label} value={row.value} />
                  ))
                : null}
            </View>
          ) : null}

          {selected.precioVariable ? (
            <View style={[subStyles.card, { marginTop: spacing.md }]}>
              <Text style={subStyles.bullets}>
                Este servicio no se compra con precio fijo en la tienda. Agendá tu cita en Inicio y el salón te
                confirmará el precio según tu cabello.
              </Text>
            </View>
          ) : (
            <>
              {!isProductAvailableAtBranch(selected) ? (
                <View style={[subStyles.card, { marginTop: spacing.md }]}>
                  <Text style={[subStyles.rowLabel, { color: tc.foregroundMuted }]}>
                    Sin existencia en esta sucursal
                  </Text>
                  <Text style={subStyles.bullets}>
                    Este producto no tiene stock en la sucursal elegida. Cambiá de sucursal en el catálogo o elegí otro
                    artículo.
                  </Text>
                </View>
              ) : (
                <>
              <Text style={[subStyles.rowLabel, { marginTop: spacing.md }]}>Cantidad</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => bumpQty(-1)}
                  accessibilityRole="button"
                  accessibilityLabel="Menos"
                >
                  <Text style={styles.qtyBtnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => bumpQty(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Más"
                  disabled={selected.stockActual != null && qty >= selected.stockActual}
                >
                  <Text style={styles.qtyBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>

              <SalonButton
                title="Comprar ahora"
                variant="heroGold"
                fullWidth
                style={{ marginTop: spacing.md }}
                disabled={qty < 1}
                onPress={() => {
                  if (qty < 1) return;
                  setPhase('cart');
                }}
              />
                </>
              )}
            </>
          )}

          {(selected.inventarioId || selected.id) ? (
            <ProductReviewsSection
              inventarioId={selected.inventarioId || selected.id}
              clienteId={clienteId}
              clientUserId={clientUserId}
              autorNombre={clienteNombre}
              ratingSummary={selected.rating}
              reviewCount={selected.reviewCount}
              onMetaUpdated={async () => {
                const invId = selected.inventarioId || selected.id;
                if (!invId) return;
                const { data } = await db.inventario.getById(invId, { sucursalId });
                if (data) {
                  const mapped = mapInventarioToTiendaProduct(data);
                  if (mapped) setSelected((prev) => (prev ? { ...prev, ...mapped } : prev));
                }
              }}
            />
          ) : null}
        </View>
      ) : null}

      {phase === 'cart' ? (
        <View style={styles.section}>
          <PhaseBack label="Catálogo" onPress={goCatalog} />

          <Text style={styles.stepHead}>Carrito</Text>
          <Text style={styles.stepSub}>Todo el checkout se construye desde lo que tengas aquí.</Text>

          {cartItems.length === 0 ? (
            <View style={subStyles.card}>
              <Text style={subStyles.rowLabel}>Tu carrito está vacío</Text>
              <Text style={subStyles.bullets}>
                Agrega productos desde el catálogo para continuar con el flujo de compra.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.cartListCard}>
                {cartItems.map((item, index) => (
                  <TiendaCartItemCard
                    key={item.id}
                    item={item}
                    isLast={index === cartItems.length - 1}
                    onQtyChange={(delta) => updateCartQty(item.id, delta)}
                    onRemove={() => removeFromCart(item.id)}
                  />
                ))}
              </View>
              <View style={[subStyles.card, styles.cartSubtotalCard]}>
                <RowAmt label="Subtotal carrito" value={formatQ(cartSubtotal)} bold />
                <Text style={styles.cartSubtotalHint}>
                  {cartItems.length === 1
                    ? '1 producto'
                    : `${cartItems.length} productos`}{' '}
                  · Envío y pago en los siguientes pasos
                </Text>
              </View>
              {cartBloqueaCanjePorPromo ? (
                <View style={[styles.canjeBanner, { borderColor: tc.foregroundSubtle, backgroundColor: tc.surfaceMuted }]}>
                  <Text style={[styles.canjeBannerTxt, { color: tc.foregroundMuted }]}>
                    {ANDREAS_CANJE_PROMO_BLOCK_MSG}
                  </Text>
                </View>
              ) : cartCanjeParcialPromo ? (
                <View style={[styles.canjeBanner, { borderColor: tc.foregroundSubtle, backgroundColor: tc.surfaceMuted }]}>
                  <Text style={[styles.canjeBannerTxt, { color: tc.foregroundMuted }]}>
                    {ANDREAS_CANJE_PROMO_PARTIAL_MSG}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          <SalonButton
            title="Continuar con carrito · resumen"
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() => setPhase('summary')}
            disabled={cartItems.length === 0}
          />
        </View>
      ) : null}

      {phase === 'summary' ? (
        <View style={styles.section}>
          <PhaseBack label="Carrito" onPress={() => setPhase('cart')} />

          <Text style={styles.stepHead}>Resumen del pedido</Text>
          <Text style={styles.stepSub}>Revisa importes antes de envío y pago.</Text>

          <View style={subStyles.card}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.summaryTop}>
                <Package size={40} color={tc.foregroundMuted} strokeWidth={1.25} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.sumTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.sumMeta}>
                    {item.qty} × {formatQ(item.priceAmount)}
                  </Text>
                </View>
                <Text style={styles.sumPrice}>{formatQ(item.priceAmount * item.qty)}</Text>
              </View>
            ))}
            <View style={subStyles.divider} />
            <RowAmt label="Subtotal" value={formatQ(cartSubtotal)} />
            <RowAmt label="Envío" value="Q 0.00" muted />
            <View style={subStyles.divider} />
            <RowAmt label="Total estimado" value={formatQ(cartSubtotal)} bold />
          </View>

          {cartBloqueaCanjePorPromo ? (
            <View style={[styles.canjeBanner, { borderColor: tc.foregroundSubtle, backgroundColor: tc.surfaceMuted }]}>
              <Text style={[styles.canjeBannerTxt, { color: tc.foregroundMuted }]}>
                {ANDREAS_CANJE_PROMO_BLOCK_MSG}
              </Text>
            </View>
          ) : cartCanjeParcialPromo ? (
            <View style={[styles.canjeBanner, { borderColor: tc.foregroundSubtle, backgroundColor: tc.surfaceMuted }]}>
              <Text style={[styles.canjeBannerTxt, { color: tc.foregroundMuted }]}>
                {ANDREAS_CANJE_PROMO_PARTIAL_MSG}
              </Text>
            </View>
          ) : null}

          <SalonButton
            title="Continuar · envío"
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() => setPhase('ship')}
          />
        </View>
      ) : null}

      {phase === 'ship' ? (
        <View style={styles.section}>
          <PhaseBack label="Resumen" onPress={() => setPhase('summary')} />

          <Text style={styles.stepHead}>¿Cómo lo recibes?</Text>
          <Text style={styles.stepSub}>Elegí envío o retiro en salón. Si pedís envío, completá la dirección.</Text>

          {shipOptions.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[styles.choiceCard, shipId === o.id && styles.choiceCardOn]}
              onPress={() => {
                setShipId(o.id);
                setHomeSaved(false);
                if (o.id === 'ship-home') {
                  setPickupQrIssued(false);
                  setPayId('pay-card');
                }
                if (o.id === 'ship-salon') {
                  setHomeSaved(false);
                  setPickupQrIssued(true);
                }
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.choiceTitle}>{o.label}</Text>
              <Text style={styles.choiceSub}>{o.sub}</Text>
            </TouchableOpacity>
          ))}

          {shipId === 'ship-home' ? (
            <View style={[subStyles.card, styles.shipScenarioCard]}>
              <Text style={subStyles.rowLabel}>Dirección de entrega</Text>
              <Text style={styles.choiceSub}>
                Completá estos datos para el envío. En el siguiente paso confirmás el pago con tarjeta y tu pedido queda
                en preparación.
              </Text>

              <View style={styles.shipChipRow}>
                <TouchableOpacity
                  style={[
                    styles.shipChip,
                    homeAddressType === 'casa' && styles.shipChipOn,
                  ]}
                  onPress={() => {
                    setHomeAddressType('casa');
                    setHomeSaved(false);
                  }}
                  activeOpacity={0.86}
                >
                  <Text style={styles.shipChipText}>Casa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.shipChip,
                    homeAddressType === 'trabajo' && styles.shipChipOn,
                  ]}
                  onPress={() => {
                    setHomeAddressType('trabajo');
                    setHomeSaved(false);
                  }}
                  activeOpacity={0.86}
                >
                  <Text style={styles.shipChipText}>Trabajo</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Nombre de contacto</Text>
              <TextInput
                style={styles.formField}
                value={homeContactName}
                onChangeText={(t) => {
                  setHomeContactName(t);
                  setHomeSaved(false);
                }}
                placeholder="Nombre y apellido"
                placeholderTextColor={tc.foregroundSubtle}
                autoCapitalize="words"
              />
              <Text style={styles.formLabel}>Teléfono</Text>
              <TextInput
                style={styles.formField}
                value={homePhone}
                onChangeText={(t) => {
                  setHomePhone(t);
                  setHomeSaved(false);
                }}
                placeholder="Ej. 502 1234 5678"
                placeholderTextColor={tc.foregroundSubtle}
                keyboardType="phone-pad"
              />
              <Text style={styles.formLabel}>Dirección completa</Text>
              <TextInput
                style={[styles.formField, styles.formFieldMultiline]}
                value={homeAddressFull}
                onChangeText={(t) => {
                  setHomeAddressFull(t);
                  setHomeSaved(false);
                }}
                placeholder="Zona, calle, número, referencias…"
                placeholderTextColor={tc.foregroundSubtle}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.shipContactMsg}>
                La persona asignada para tu envío se comunicará contigo para coordinar la hora exacta de entrega.
              </Text>

              {homeSaved ? (
                <Text style={styles.shipOkMsg}>Dirección guardada · lista para pasar a pago.</Text>
              ) : null}
              <SalonButton
                title="Guardar dirección de envío"
                variant="outlineGold"
                fullWidth
                loading={savingAddress}
                onPress={async () => {
                  if (!homeShipFieldsOk) {
                    Alert.alert(
                      'Dirección incompleta',
                      'Completá nombre, teléfono (mín. 6 dígitos) y una dirección clara (mín. 10 caracteres).',
                    );
                    return;
                  }
                  if (!clienteId) {
                    Alert.alert(
                      'Iniciá sesión',
                      'Para guardar tu dirección en tu cuenta y reutilizarla en la próxima compra, iniciá sesión en App Clientes.',
                    );
                    return;
                  }
                  setSavingAddress(true);
                  try {
                    const { data: row, error: gErr } = await db.clientes.getById(clienteId);
                    if (gErr || !row) {
                      Alert.alert('No se guardó', gErr?.message || 'No se pudo leer tu ficha de cliente.');
                      return;
                    }
                    const { staffNotas } = splitClienteNotasEnvio(row.notas);
                    const envio = {
                      tipo: homeAddressType,
                      contacto: String(homeContactName).trim(),
                      telefono: String(homePhone).trim(),
                      direccion: String(homeAddressFull).trim(),
                      updatedAt: new Date().toISOString(),
                    };
                    const notas = mergeClienteNotasEnvio(staffNotas, envio);
                    const { error: uErr } = await db.clientes.update(clienteId, { notas });
                    if (uErr) {
                      Alert.alert('No se guardó', uErr.message || 'Revisá permisos o conexión.');
                      return;
                    }
                    setHomeSaved(true);
                  } finally {
                    setSavingAddress(false);
                  }
                }}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : (
            <View style={[subStyles.card, styles.shipScenarioCard]}>
              <Text style={subStyles.rowLabel}>Retiro en salón</Text>
              <Text style={styles.choiceSub}>
                Al confirmar el pedido en efectivo recibirás un código QR único en esta app. El salón lo escaneará
                al cobrarte.
              </Text>
              {!pickupQrIssued ? (
                <SalonButton
                  title="Entendido · continuar"
                  variant="outlineGold"
                  fullWidth
                  onPress={() => setPickupQrIssued(true)}
                  style={{ marginTop: spacing.sm }}
                />
              ) : (
                <Text style={styles.shipOkMsg}>Listo · podés pasar a pago.</Text>
              )}
            </View>
          )}

          <SalonButton
            title="Continuar · pago"
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() => setPhase('pay')}
            disabled={!shippingReady}
          />
        </View>
      ) : null}

      {phase === 'pay' ? (
        <View style={styles.section}>
          <PhaseBack label="Envío" onPress={() => setPhase('ship')} />

          <Text style={styles.stepHead}>Método de pago</Text>
          <Text style={styles.stepSub}>
            {shipId === 'ship-home'
              ? 'Envío a domicilio: pagá con tarjeta para confirmar tu pedido al instante. Efectivo: el salón te contactará para coordinar.'
              : 'Efectivo: pedido al salón y pagás al retirar con QR. Tarjeta: el salón confirma el cobro con su pasarela antes de preparar tu compra.'}
          </Text>

          {referidorCheckout?.needs_code ? (
            <View style={[subStyles.card, { marginBottom: spacing.md, borderColor: tc.primary }]}>
              <Text style={subStyles.rowLabel}>Código de quien te invitó</Text>
              <Text style={subStyles.bullets}>
                Es tu primera compra con referido. Usá el mismo código una sola vez; el salón lo validará al escanear tu
                QR al retirar o entregar.
              </Text>
              <TextInput
                style={[
                  styles.referralInput,
                  { borderColor: tc.cardBorder, color: tc.foreground, backgroundColor: tc.card },
                ]}
                value={referidorCodigoInput}
                onChangeText={(t) => setReferidorCodigoInput(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="ANDREAS-…"
                placeholderTextColor={tc.foregroundSubtle}
              />
            </View>
          ) : null}

          {payOptions.map(({ id, label, sub, Icon }) => (
            <TouchableOpacity
              key={id}
              style={[styles.payRow, payId === id && styles.payRowOn]}
              onPress={() => {
                setPayId(id);
                if (id !== 'pay-card') {
                  setShowAddCardForm(false);
                  setCardSavedToast(false);
                }
              }}
              activeOpacity={0.88}
            >
              <Icon size={22} color={tc.foreground} strokeWidth={1.6} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.choiceTitle}>{label}</Text>
                <Text style={styles.choiceSub}>{sub}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {payId === 'pay-card' ? (
            shipId === 'ship-home' && isStripeConfigured() ? (
              <View style={[subStyles.card, styles.cardManager]}>
                <TiendaDomicilioStripePay ref={stripePayRef} />
              </View>
            ) : shipId === 'ship-home' ? (
              <View style={[subStyles.card, styles.cardManager]}>
                <TarjetaPagoForm
                  holder={cardHolder}
                  onHolderChange={setCardHolder}
                  number={cardNumber}
                  onNumberChange={setCardNumber}
                  exp={cardExp}
                  onExpChange={setCardExp}
                  cvv={cardCvv}
                  onCvvChange={setCardCvv}
                />
                <Text style={[styles.choiceSub, { marginTop: spacing.sm }]}>
                  Modo demo sin Stripe. Configurá EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY para pagos reales.
                </Text>
              </View>
            ) : (
            <View style={[subStyles.card, styles.cardManager]}>
              <Text style={subStyles.rowLabel}>Tus tarjetas guardadas</Text>
              <Text style={styles.choiceSub}>Selecciona una o agrega una nueva.</Text>

              {savedCardsUi.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.savedCardRow, selectedCardId === card.id && styles.savedCardRowOn]}
                  onPress={() => {
                    setSelectedCardId(card.id);
                    setShowAddCardForm(false);
                  }}
                  activeOpacity={0.86}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.choiceTitle}>{card.label}</Text>
                    <Text style={styles.choiceSub}>{card.sub}</Text>
                  </View>
                  <Text style={styles.cardPickText}>
                    {selectedCardId === card.id ? 'Seleccionada' : 'Seleccionar'}
                  </Text>
                </TouchableOpacity>
              ))}

              <SalonButton
                title={showAddCardForm ? 'Ocultar formulario' : 'Agregar nueva tarjeta'}
                variant="outlineGold"
                fullWidth
                style={{ marginTop: spacing.sm }}
                onPress={() => {
                  setShowAddCardForm((v) => !v);
                  setCardSavedToast(false);
                }}
              />

              {showAddCardForm ? (
                <View style={styles.newCardForm}>
                  <Text style={styles.formLabel}>Nombre del titular</Text>
                  <View style={subStyles.fauxInput} />
                  <Text style={styles.formLabel}>Número de tarjeta</Text>
                  <View style={subStyles.fauxInput} />
                  <View style={styles.duoFormRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>MM/AA</Text>
                      <View style={subStyles.fauxInput} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>CVV</Text>
                      <View style={subStyles.fauxInput} />
                    </View>
                  </View>
                  <SalonButton
                    title="Guardar tarjeta"
                    variant="heroGold"
                    fullWidth
                    onPress={() => {
                      setCardSavedToast(true);
                      setShowAddCardForm(false);
                      setSelectedCardId('card-1189');
                    }}
                  />
                </View>
              ) : null}

              {cardSavedToast ? (
                <Text style={styles.shipOkMsg}>Tarjeta guardada y lista para usar.</Text>
              ) : null}
            </View>
            )
          ) : null}

          {cartBloqueaCanjePorPromo ? (
            <View style={[styles.canjeBanner, { borderColor: tc.foregroundSubtle, backgroundColor: tc.surfaceMuted }]}>
              <Text style={[styles.canjeBannerTxt, { color: tc.foregroundMuted }]}>
                {ANDREAS_CANJE_PROMO_BLOCK_MSG}
              </Text>
            </View>
          ) : cartCanjeParcialPromo && payCanjePreview?.discount ? (
            <View style={[styles.canjeBanner, { borderColor: tc.foregroundSubtle, backgroundColor: tc.surfaceMuted }]}>
              <Text style={[styles.canjeBannerTxt, { color: tc.foregroundMuted }]}>
                {ANDREAS_CANJE_PROMO_PARTIAL_MSG}
              </Text>
            </View>
          ) : null}

          {!cartBloqueaCanjePorPromo && payCanjePreview?.discount ? (
            <View style={[styles.canjeBanner, { borderColor: tc.primary, backgroundColor: tc.surfaceMuted }]}>
              <Text style={[styles.canjeBannerTxt, { color: tc.foregroundMuted }]}>
                Canje {formatPctCanje(payCanjePreview.discount.descuento_pct)} · subtotal elegible{' '}
                {formatQ(payCanjePreview.discount.subtotal)} → total {formatQ(payCanjePreview.total)}.
              </Text>
            </View>
          ) : null}

          <SalonButton
            title={checkoutButtonTitle}
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.lg }}
            onPress={async () => {
              if (payId === 'pay-card') {
                if (!clientUserId) {
                  Alert.alert(
                    'Sesión requerida',
                    'Iniciá sesión con tu cuenta para enviar el pedido al salón (tarjeta o efectivo).',
                  );
                  return;
                }
                if (!cartItems.length) {
                  Alert.alert('Carrito', 'Agregá productos antes de confirmar.');
                  return;
                }
                const cardPayment = resolveCardPaymentForCheckout();
                if (shipId === 'ship-home' && !domicilioUsaStripe && !cardPayment.ok) {
                  Alert.alert('Tarjeta', cardPayment.message || 'Revisá los datos de la tarjeta.');
                  return;
                }
                const hasLiveIds = cartItems.every((i) => i.id && !String(i.id).startsWith('sample-'));
                if (!hasLiveIds) {
                  Alert.alert(
                    'Producto de ejemplo',
                    'Este artículo es solo demostración. El salón debe publicar productos reales en inventario (visible en tienda).',
                  );
                  return;
                }
                const snapBase = buildCheckoutSnapshot() || {};
                if (referidorCheckout?.needs_code && !snapBase.referidor_codigo) {
                  Alert.alert('Código de referido', 'Ingresá el código de quien te invitó para tu primera compra.');
                  return;
                }
                const stockOk = await validateCartBranchStock(cartItems, sucursalId);
                if (!stockOk.ok) {
                  Alert.alert('Sin existencia', stockOk.message || 'No hay stock en la sucursal elegida.');
                  return;
                }
                setCheckoutBusy(true);
                const canjeCard = await resolveAndreasCanjeForCheckout('tarjeta');
                const snapCard = canjeCard.snapExtra
                  ? { ...snapBase, ...canjeCard.snapExtra }
                  : Object.keys(snapBase).length
                    ? snapBase
                    : null;

                let res;
                if (domicilioUsaStripe) {
                  if (!stripePayRef.current?.checkout) {
                    setCheckoutBusy(false);
                    Alert.alert('Stripe', 'El módulo de pago no está listo. Reintentá en unos segundos.');
                    return;
                  }
                  res = await stripePayRef.current.checkout({
                    cartItems,
                    total_amount: canjeCard.total,
                    sucursalId: stockOk.sucursalId,
                    checkout_snapshot: snapCard,
                    clienteNombre,
                    clienteTelefono,
                    shipId,
                    homeAddressType,
                    deliveryAddress: buildDeliveryAddressSnapshot(),
                  });
                } else {
                  res = await confirmarCompraConTarjeta({
                    clienteNombre,
                    clienteTelefono,
                    clientUserId: clientUserId || null,
                    cartItems,
                    shipId,
                    homeAddressType,
                    deliveryAddress: buildDeliveryAddressSnapshot(),
                    cardLast4: cardPayment.last4 || cardLast4FromSelection(),
                    cardPayment: shipId === 'ship-home' ? cardPayment : null,
                    checkout_snapshot: snapCard,
                    total_amount: canjeCard.total,
                    sucursalId: stockOk.sucursalId,
                  });
                }
                setCheckoutBusy(false);
                if (!res.ok) {
                  if (res.cancelled) return;
                  Alert.alert('No se envió el pedido', res.error?.message || 'Intentá de nuevo.');
                  return;
                }
                const orderCode = res.trackingCode || res.order?.tracking_code || `APS-${String(Date.now()).slice(-6)}`;
                const domicilioTarjeta = shipId === 'ship-home';
                const stripeBrand = res.cardBrand ? String(res.cardBrand) : null;
                const stripeLast4 = res.cardLast4 || res.order?.card_last4;
                setLastOrder({
                  code: orderCode,
                  items: cartItems,
                  subtotal: cartSubtotal,
                  total: canjeCard.total,
                  andreasDiscount: canjeCard.discount,
                  andreasCanje: buildAndreasCanjeFromCheckout(canjeCard),
                  paymentSummary: domicilioTarjeta
                    ? domicilioUsaStripe
                      ? `Stripe · ${stripeBrand || 'Tarjeta'} · **** ${stripeLast4 || '—'} · pago confirmado`
                      : `Tarjeta ${cardPayment.brand || '—'} · **** ${cardPayment.last4 || '—'} · pago confirmado`
                    : `Tarjeta · últimos ${cardLast4FromSelection() || '—'} · pendiente de cobro en salón`,
                  shippingSummary:
                    shipId === 'ship-home'
                      ? `Envío a domicilio · ${homeAddressType === 'casa' ? 'Casa' : 'Trabajo'} · en preparación`
                      : 'Retiro en salón con QR',
                  qrCode: null,
                  realSale: domicilioTarjeta ? 'card_captured_delivery' : 'pending_card',
                });
                setPhase('success');
                setCartItems([]);
                avisarPremiosPedidoCreado();
                onPurchaseComplete?.();
                onPedidosChanged?.();
                return;
              }

              if (payId === 'pay-cash') {
                if (!clientUserId) {
                  Alert.alert(
                    'Sesión requerida',
                    'Cerrá sesión y volvé a entrar con tu correo y contraseña para enviar el pedido al salón.',
                  );
                  return;
                }
                if (!cartItems.length) {
                  Alert.alert('Carrito', 'Agregá productos antes de confirmar.');
                  return;
                }
                const hasLiveIds = cartItems.every((i) => i.id && !String(i.id).startsWith('sample-'));
                if (!hasLiveIds) {
                  Alert.alert(
                    'Producto de ejemplo',
                    'Publicá productos reales en inventario (visible en tienda) para pedir en efectivo.',
                  );
                  return;
                }
                const snapBaseCash = buildCheckoutSnapshot() || {};
                if (referidorCheckout?.needs_code && !snapBaseCash.referidor_codigo) {
                  Alert.alert('Código de referido', 'Ingresá el código de quien te invitó para tu primera compra.');
                  return;
                }
                const stockOkCash = await validateCartBranchStock(cartItems, sucursalId);
                if (!stockOkCash.ok) {
                  Alert.alert('Sin existencia', stockOkCash.message || 'No hay stock en la sucursal elegida.');
                  return;
                }
                setCheckoutBusy(true);
                const canjeCash = await resolveAndreasCanjeForCheckout('efectivo');
                const snapCash = canjeCash.snapExtra
                  ? { ...snapBaseCash, ...canjeCash.snapExtra }
                  : Object.keys(snapBaseCash).length
                    ? snapBaseCash
                    : null;
                const res = await crearPedidoEfectivo({
                  clienteNombre: clienteNombre || 'Cliente tienda',
                  clienteTelefono: clienteTelefono || '—',
                  clientUserId: clientUserId || null,
                  cartItems,
                  shipId,
                  homeAddressType,
                  deliveryAddress: buildDeliveryAddressSnapshot(),
                  checkout_snapshot: snapCash,
                  total_amount: canjeCash.total,
                  sucursalId: stockOkCash.sucursalId,
                });
                setCheckoutBusy(false);
                if (!res.ok) {
                  Alert.alert('No se envió el pedido', res.error?.message || 'Intentá de nuevo.');
                  return;
                }
                setLastOrder({
                  code: res.trackingCode || res.order?.tracking_code,
                  items: cartItems,
                  subtotal: cartSubtotal,
                  total: canjeCash.total,
                  andreasDiscount: canjeCash.discount,
                  andreasCanje: buildAndreasCanjeFromCheckout(canjeCash),
                  paymentSummary: 'Efectivo · pendiente de cobro en salón',
                  shippingSummary:
                    shipId === 'ship-home'
                      ? `Envío a domicilio · agente coordinará · ${homeAddressType === 'casa' ? 'Casa' : 'Trabajo'}`
                      : 'Retiro en salón',
                  qrCode: shipId === 'ship-salon' ? res.trackingCode : null,
                  realSale: 'pending_cash',
                });
                setPhase('success');
                setCartItems([]);
                avisarPremiosPedidoCreado();
                onPurchaseComplete?.();
                onPedidosChanged?.();
                return;
              }

              Alert.alert('Método de pago', 'Elegí tarjeta o efectivo para continuar.');
            }}
            disabled={checkoutBusy}
          />
        </View>
      ) : null}

      {phase === 'success' ? (
        <View style={styles.section}>
          <View style={[subStyles.card, styles.successCard]}>
            <Text style={styles.successTitle}>
              {lastOrder?.realSale === 'card_captured_delivery' ? 'Pedido confirmado' : 'Pedido enviado'}
            </Text>
            <Text style={subStyles.bullets}>
              Pedido #{lastOrder?.code ?? '—'}
              {lastOrder?.realSale === 'card_captured_delivery'
                ? ' · Pago con tarjeta confirmado. Tu pedido está en preparación para envío a domicilio; seguilo en Mis pedidos.'
                : lastOrder?.realSale === 'pending_card'
                ? ' · El salón recibió tu pedido con tarjeta indicada. El cobro real lo confirma el equipo con su pasarela; el stock se descuenta al cerrar la venta en Pedidos.'
                : lastOrder?.realSale === 'pending_cash'
                  ? ' · Pedido enviado al salón. Pagá en efectivo al retirar; el equipo lo confirmará en Pedidos.'
                  : ' · Guardá tu código de seguimiento en la app.'}
            </Text>
          </View>

          {lastOrder ? (
            <View style={subStyles.card}>
              <Text style={subStyles.rowLabel}>Detalle de compra</Text>
              <View style={subStyles.divider} />

              {lastOrder.items.map((item) => (
                <View key={item.id} style={styles.orderLine}>
                  <Text style={styles.orderItemTitle}>
                    {item.title} x{item.qty}
                  </Text>
                  <Text style={styles.orderItemPrice}>{formatQ(item.priceAmount * item.qty)}</Text>
                </View>
              ))}

              <View style={subStyles.divider} />
              <RowAmt label="Envío" value={lastOrder.shippingSummary} muted />
              <RowAmt label="Pago" value={lastOrder.paymentSummary} muted />
              {lastOrder.andreasCanje ? (
                <>
                  <View style={subStyles.divider} />
                  <RowAmt
                    label="Subtotal productos"
                    value={formatQ(lastOrder.andreasCanje.subtotal_antes ?? lastOrder.subtotal)}
                  />
                  <RowAmt
                    label={`Canje ANDREAS (${formatPctCanje(lastOrder.andreasCanje.descuento_pct)})`}
                    value={`−${formatQ(lastOrder.andreasCanje.descuento_monto)}`}
                  />
                  <Text style={[styles.canjeSuccessNote, { color: tc.foregroundMuted }]}>
                    {buildTiendaCanjeSuccessNote(lastOrder.andreasCanje)}
                  </Text>
                </>
              ) : null}
              <View style={subStyles.divider} />
              <RowAmt label="Total" value={formatQ(lastOrder.total)} bold />
            </View>
          ) : null}

          {lastOrder?.qrCode && lastOrder?.realSale === 'pending_cash' ? (
            <PickupQrDisplay
              trackingCode={lastOrder.qrCode}
              hint="Revisá Pedidos en Inicio: ahí se encuentra el QR de esta compra."
            />
          ) : null}

          <SalonButton
            title="Seguir comprando"
            variant="heroGold"
            fullWidth
            onPress={goCatalog}
          />
          <SalonButton
            title="Listo · salir de tienda"
            variant="outlineGray"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={onClose}
          />
        </View>
      ) : null}
    </View>
  );
}

function RowAmt({ label, value, muted, bold }) {
  const styles = useTiendaStyles();
  const { colors: tc } = useTheme();
  return (
    <View style={styles.amtRow}>
      <Text style={[styles.amtLabel, muted && { color: tc.foregroundMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.amtVal,
          muted && { color: tc.foregroundMuted },
          bold && { fontFamily: typography.fontSansMedium, fontSize: 16 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function createTiendaStyles(c) {
  return StyleSheet.create({
  wrap: {
    flexGrow: 1,
  },
  section: {
    paddingBottom: spacing.xl,
  },
  phaseBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing.md,
  },
  phaseBackTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: c.foreground,
  },
  heroCard: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    backgroundColor: c.surfaceMuted,
  },
  brandLine: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: c.foregroundMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 24,
    lineHeight: 30,
    color: c.foreground,
    marginBottom: spacing.sm,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  ratingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starRow: { flexDirection: 'row', gap: 2 },
  ratingNum: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: c.foreground,
  },
  ratingCount: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foregroundMuted,
    textDecorationLine: 'underline',
  },
  reviewCard: {
    marginBottom: spacing.md,
  },
  reviewLead: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foregroundMuted,
    lineHeight: 19,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  reviewStep: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: c.foreground,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  ratePickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  reviewTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  reviewTypeChip: {
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: c.card,
  },
  reviewTypeChipOn: {
    borderColor: c.primary,
    backgroundColor: c.surfaceMuted,
  },
  reviewTypeText: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foreground,
  },
  reviewOk: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.success,
    marginBottom: spacing.sm,
  },
  priceBlock: {
    marginBottom: spacing.sm,
  },
  compareAt: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    color: c.foregroundMuted,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  priceBig: {
    fontFamily: typography.fontSansMedium,
    fontSize: 28,
    color: c.foreground,
  },
  precioVariableNote: {
    marginTop: spacing.xs,
    fontFamily: typography.fontSans,
    fontSize: 14,
    lineHeight: 20,
    color: c.foregroundMuted,
  },
  sku: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foregroundMuted,
  },
  shipInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: spacing.sm,
  },
  shipInlineTxt: {
    flex: 1,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foregroundMuted,
    lineHeight: 19,
  },
  stockHint: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: c.primary,
    marginBottom: spacing.md,
  },
  copyCard: {
    marginTop: spacing.sm,
  },
  specCard: {
    marginTop: spacing.md,
  },
  specHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  specToggleTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    color: c.primary,
  },
  specRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.cardBorder,
  },
  specLabel: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    color: c.foregroundMuted,
    marginBottom: 4,
  },
  specValue: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: c.foreground,
    lineHeight: 20,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  qtyBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 20,
    color: c.foreground,
  },
  qtyVal: {
    fontFamily: typography.fontSansMedium,
    fontSize: 18,
    minWidth: 28,
    textAlign: 'center',
    color: c.foreground,
  },
  cartBanner: {
    marginTop: spacing.sm,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.success,
  },
  canjeBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  canjeBannerTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  canjeBannerTxt: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    lineHeight: 19,
  },
  payCanjeHint: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  canjeSuccessNote: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  stepHead: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    color: c.foreground,
    marginBottom: spacing.xs,
  },
  stepSub: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: c.foregroundMuted,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sumTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: c.foreground,
    lineHeight: 21,
  },
  sumMeta: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foregroundMuted,
  },
  sumPrice: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: c.foreground,
    marginLeft: spacing.sm,
  },
  cartListCard: {
    borderRadius: radii.lg,
    backgroundColor: c.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cartSubtotalCard: {
    marginBottom: spacing.xs,
  },
  cartSubtotalHint: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    lineHeight: 17,
    color: c.foregroundMuted,
    marginTop: spacing.xs,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cartQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  qtyMiniBtn: {
    minWidth: 30,
    minHeight: 30,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyMiniTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: c.foreground,
  },
  qtyMiniVal: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    minWidth: 20,
    textAlign: 'center',
    color: c.foreground,
  },
  amtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  amtLabel: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: c.foreground,
  },
  amtVal: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: c.foreground,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  orderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  orderItemTitle: {
    flex: 1,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foreground,
    lineHeight: 18,
  },
  orderItemPrice: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: c.foreground,
  },
  choiceCard: {
    backgroundColor: c.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  choiceCardOn: {
    borderColor: c.primary,
    borderWidth: 2,
    backgroundColor: c.surfaceMuted,
  },
  choiceTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: c.foreground,
    marginBottom: 4,
  },
  choiceSub: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foregroundMuted,
    lineHeight: 18,
  },
  shipScenarioCard: {
    marginTop: spacing.xs,
  },
  formLabel: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    color: c.foregroundMuted,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  referralInput: {
    minHeight: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    letterSpacing: 0.8,
  },
  formField: {
    minHeight: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: c.cardBorder,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: c.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontFamily: typography.fontSans,
    fontSize: 15,
    color: c.foreground,
  },
  formFieldMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  inlineHintText: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foregroundSubtle,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  shipContactMsg: {
    marginTop: spacing.sm,
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foregroundMuted,
    lineHeight: 18,
  },
  shipChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  shipChip: {
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: c.card,
  },
  shipChipOn: {
    borderColor: c.primary,
    backgroundColor: c.surfaceMuted,
  },
  shipChipText: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foreground,
  },
  shipOkMsg: {
    marginTop: spacing.sm,
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.success,
  },
  qrCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: radii.md,
    backgroundColor: c.surfaceMuted,
    padding: spacing.md,
    alignItems: 'center',
  },
  qrSquare: {
    width: 150,
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeText: {
    marginTop: spacing.sm,
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: c.foreground,
  },
  qrMeta: {
    marginTop: spacing.xs,
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foregroundMuted,
  },
  cardManager: {
    marginTop: spacing.sm,
  },
  savedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.cardBorder,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  savedCardRowOn: {
    borderColor: c.primary,
    backgroundColor: c.surfaceMuted,
    borderWidth: 2,
  },
  cardPickText: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    color: c.primary,
    marginLeft: spacing.sm,
  },
  newCardForm: {
    marginTop: spacing.sm,
  },
  duoFormRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  payRowOn: {
    borderColor: c.primary,
    borderWidth: 2,
    backgroundColor: c.surfaceMuted,
  },
  successCard: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    color: c.foreground,
    marginBottom: spacing.sm,
  },
});
}

function useTiendaStyles() {
  const { colors } = useTheme();
  return useMemo(() => createTiendaStyles(colors), [colors]);
}

