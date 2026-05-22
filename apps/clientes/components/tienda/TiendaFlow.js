import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { ChevronLeft, Star, Truck, Package, CreditCard, Wallet, Building2, QrCode } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SalonButton } from '../luxury/SalonButton';
import { createSubStyles } from '../luxury/SubScreenChrome';
import { useTheme } from '../../theme/ThemeProvider';
import { TiendaCatalogGrid } from './TiendaCatalogGrid';
import { ProductImageStrip } from './ProductImageStrip';
import {
  TIENDA_SAMPLE_SPECS,
  TIENDA_SAMPLE_LONG_COPY,
} from '../../data/tiendaPlaceholders';
import { confirmarCompraConTarjeta, crearPedidoEfectivo, buildTiendaProductFicha } from '@appsalon/shared-config';

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
 * Catálogo → ficha → resumen → envío → pago → venta cerrada.
 * Compra con tarjeta: venta real, descuenta stock y suma unidades a la meta global.
 */
export function TiendaFlow({ onClose, clienteId, clienteNombre, clienteTelefono, clientUserId }) {
  const { colors: tc, isDark } = useTheme();
  const styles = useTiendaStyles();
  const subStyles = useMemo(() => createSubStyles(tc), [tc]);
  const reviewStarEmpty = isDark ? '#525252' : STAR_EMPTY;
  const [phase, setPhase] = useState('catalog');
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [cartHint, setCartHint] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewType, setReviewType] = useState('compra_verificada');
  const [reviewPublished, setReviewPublished] = useState(false);
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [shipId, setShipId] = useState('ship-home');
  const [homeAddressType, setHomeAddressType] = useState('casa');
  const [homeSaved, setHomeSaved] = useState(false);
  const [pickupQrIssued, setPickupQrIssued] = useState(false);
  const [payId, setPayId] = useState('pay-card');
  const [wireTransferConfirmed, setWireTransferConfirmed] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('card-4242');
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [cardSavedToast, setCardSavedToast] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const specsAndCopy = useMemo(() => {
    if (selected?.id === 'sample-keratin-kit') {
      return { specs: TIENDA_SAMPLE_SPECS, longCopy: TIENDA_SAMPLE_LONG_COPY };
    }
    if (selected?.inventarioId || (selected?.id && selected.id !== 'sample-keratin-kit')) {
      return buildTiendaProductFicha(selected);
    }
    return { specs: [], longCopy: selected?.descripcion || '' };
  }, [selected]);
  const cartSubtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.priceAmount * item.qty, 0),
    [cartItems],
  );

  const goCatalog = () => {
    setPhase('catalog');
    setSelected(null);
    setQty(1);
    setCartHint(false);
  };

  const openProduct = (product) => {
    setSelected(product);
    setQty(1);
    setCartHint(false);
    setReviewOpen(false);
    setReviewPublished(false);
    setReviewRating(5);
    setReviewType('compra_verificada');
    setSpecsExpanded(!!(product?.inventarioId || product?.articuloTipo));
    setPhase('detail');
  };

  const bumpQty = (delta) => {
    setQty((q) => Math.min(9, Math.max(1, q + delta)));
  };

  const addToCart = (product, quantity = 1) => {
    if (!product || quantity < 1) return;
    if (product.precioVariable) {
      Alert.alert(
        'Precio variable',
        'Este servicio se cotiza en el salón según el volumen de tu cabello. Agendá tu cita para conocer el precio.',
      );
      return;
    }
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.id === product.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx ? { ...item, qty: Math.min(99, item.qty + quantity) } : item,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          priceAmount: product.priceAmount ?? 0,
          priceLabel: product.priceLabel ?? 'Q 0.00',
          qty: quantity,
        },
      ];
    });
  };

  const updateCartQty = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(0, Math.min(99, item.qty + delta)) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const shipOptions = [
    { id: 'ship-home', label: 'Envío a domicilio', sub: 'Zona metropolitana · 2–4 días hábiles' },
    { id: 'ship-salon', label: 'Retiro en salón', sub: 'Aura Salón · listo en 24 h' },
  ];

  const payOptions = [
    { id: 'pay-card', label: 'Tarjeta guardada', sub: 'Visa terminada en 4242', Icon: CreditCard },
    { id: 'pay-cash', label: 'Efectivo al retirar', sub: 'Pagas cuando recoges en salón', Icon: Wallet },
    { id: 'pay-wire', label: 'Transferencia', sub: 'Banco Industrial · referencia en siguiente paso', Icon: Building2 },
  ];
  const savedCards = [
    { id: 'card-4242', label: 'Visa ··· 4242', sub: 'Predeterminada · vence 08/29' },
    { id: 'card-1189', label: 'Mastercard ··· 1189', sub: 'Personal · vence 11/28' },
  ];
  const selectedCard = savedCards.find((c) => c.id === selectedCardId) ?? savedCards[0];
  const canConfirmPurchase = payId === 'pay-wire' ? wireTransferConfirmed : true;
  const homeShippingEligible = cartSubtotal >= 350;
  const shippingReady = shipId === 'ship-home' ? homeSaved : pickupQrIssued;

  return (
    <View style={styles.wrap}>
      {phase === 'catalog' && (
        <TiendaCatalogGrid onProductPress={openProduct} />
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
            />
          </View>

          {selected.brandLine ? (
            <Text style={styles.brandLine}>{selected.brandLine}</Text>
          ) : null}
          <Text style={styles.detailTitle}>{selected.title}</Text>

          <View style={styles.ratingBlock}>
            <TouchableOpacity
              style={styles.ratingAction}
              onPress={() => setReviewOpen(true)}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel="Calificar con estrellas"
            >
              <RatingStars rating={selected.rating} />
              <Text style={styles.ratingNum}>{selected.rating.toFixed(1)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setReviewOpen(true)}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel="Ver y escribir opiniones"
            >
              <Text style={styles.ratingCount}>({selected.reviewCount} opiniones)</Text>
            </TouchableOpacity>
          </View>

          {reviewOpen ? (
            <View style={[subStyles.card, styles.reviewCard]}>
              <Text style={subStyles.rowLabel}>Dejar reseña</Text>
              <Text style={styles.reviewLead}>
                Flujo sugerido: compras verificadas primero, luego reseña libre. Aquí solo UI.
              </Text>

              <Text style={styles.reviewStep}>1) Tu calificación</Text>
              <View style={styles.ratePickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} estrellas`}
                  >
                    <Star
                      size={20}
                      color={star <= reviewRating ? STAR_GOLD : reviewStarEmpty}
                      fill={star <= reviewRating ? STAR_GOLD : reviewStarEmpty}
                      strokeWidth={0}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.reviewStep}>2) Tipo de reseña</Text>
              <View style={styles.reviewTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.reviewTypeChip,
                    reviewType === 'compra_verificada' && styles.reviewTypeChipOn,
                  ]}
                  onPress={() => setReviewType('compra_verificada')}
                  activeOpacity={0.86}
                >
                  <Text style={styles.reviewTypeText}>Compra verificada</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reviewTypeChip,
                    reviewType === 'opinion_general' && styles.reviewTypeChipOn,
                  ]}
                  onPress={() => setReviewType('opinion_general')}
                  activeOpacity={0.86}
                >
                  <Text style={styles.reviewTypeText}>Opinión general</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.reviewStep}>3) Comentario y fotos</Text>
              <View style={subStyles.fauxInput} />
              <View style={[subStyles.fauxInput, { height: 90 }]} />

              {reviewPublished ? (
                <Text style={styles.reviewOk}>Reseña enviada. Gracias por tu opinión.</Text>
              ) : null}

              <SalonButton
                title="Publicar reseña"
                variant="heroGold"
                fullWidth
                onPress={() => setReviewPublished(true)}
              />
              <SalonButton
                title="Cerrar reseñas"
                variant="outlineGray"
                fullWidth
                style={{ marginTop: spacing.sm }}
                onPress={() => setReviewOpen(false)}
              />
            </View>
          ) : null}

          <View style={styles.priceBlock}>
            {selected.id === 'sample-keratin-kit' && selected.compareAtLabel ? (
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
                >
                  <Text style={styles.qtyBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>

              {cartHint ? (
                <Text style={styles.cartBanner}>Añadido al carrito (sin persistencia aún)</Text>
              ) : null}

              <SalonButton
                title="Añadir al carrito"
                variant="outlineGray"
                fullWidth
                style={{ marginTop: spacing.md }}
                onPress={() => {
                  addToCart(selected, qty);
                  setCartHint(true);
                }}
              />
              <SalonButton
                title="Comprar ahora"
                variant="heroGold"
                fullWidth
                style={{ marginTop: spacing.sm }}
                onPress={() => {
                  addToCart(selected, qty);
                  setPhase('cart');
                }}
              />
            </>
          )}
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
            <View style={subStyles.card}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sumTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.sumMeta}>{item.priceLabel}</Text>
                    <View style={styles.cartQtyRow}>
                      <TouchableOpacity
                        style={styles.qtyMiniBtn}
                        onPress={() => updateCartQty(item.id, -1)}
                      >
                        <Text style={styles.qtyMiniTxt}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyMiniVal}>{item.qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyMiniBtn}
                        onPress={() => updateCartQty(item.id, 1)}
                      >
                        <Text style={styles.qtyMiniTxt}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.sumPrice}>{formatQ(item.priceAmount * item.qty)}</Text>
                </View>
              ))}
              <View style={subStyles.divider} />
              <RowAmt label="Subtotal carrito" value={formatQ(cartSubtotal)} bold />
            </View>
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
          <Text style={styles.stepSub}>Toca una opción (solo selección visual).</Text>

          {shipOptions.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[
                styles.choiceCard,
                shipId === o.id && styles.choiceCardOn,
                o.id === 'ship-home' && !homeShippingEligible && styles.choiceCardDisabled,
              ]}
              onPress={() => {
                if (o.id === 'ship-home' && !homeShippingEligible) return;
                setShipId(o.id);
                if (o.id === 'ship-home') {
                  setPickupQrIssued(false);
                }
                if (o.id === 'ship-salon') {
                  setHomeSaved(false);
                  setPickupQrIssued(true);
                }
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.choiceTitle}>{o.label}</Text>
              <Text style={styles.choiceSub}>
                {o.id === 'ship-home' && !homeShippingEligible
                  ? 'Disponible para compras mayores a Q 350.00'
                  : o.sub}
              </Text>
            </TouchableOpacity>
          ))}

          {shipId === 'ship-home' ? (
            <View style={[subStyles.card, styles.shipScenarioCard]}>
              <Text style={subStyles.rowLabel}>Dirección de entrega</Text>
              <Text style={styles.choiceSub}>
                Completa estos datos para cotizar ruta y confirmar envío.
              </Text>

              <View style={styles.shipChipRow}>
                <TouchableOpacity
                  style={[
                    styles.shipChip,
                    homeAddressType === 'casa' && styles.shipChipOn,
                  ]}
                  onPress={() => setHomeAddressType('casa')}
                  activeOpacity={0.86}
                >
                  <Text style={styles.shipChipText}>Casa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.shipChip,
                    homeAddressType === 'trabajo' && styles.shipChipOn,
                  ]}
                  onPress={() => setHomeAddressType('trabajo')}
                  activeOpacity={0.86}
                >
                  <Text style={styles.shipChipText}>Trabajo</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Nombre de contacto</Text>
              <View style={subStyles.fauxInput} />
              <Text style={styles.formLabel}>Teléfono</Text>
              <View style={subStyles.fauxInput} />
              <Text style={styles.formLabel}>Dirección completa</Text>
              <View style={[subStyles.fauxInput, { height: 96, justifyContent: 'center' }]}>
                <Text style={styles.inlineHintText}>
                  Escribe tu dirección de forma clara para ubicarte rápido y sin errores.
                </Text>
              </View>

              <Text style={styles.shipContactMsg}>
                La persona asignada para tu envío se comunicará contigo para coordinar la hora exacta de
                entrega.
              </Text>

              {homeSaved ? (
                <Text style={styles.shipOkMsg}>Dirección guardada · lista para pasar a pago.</Text>
              ) : null}
              <SalonButton
                title="Guardar dirección de envío"
                variant="outlineGold"
                fullWidth
                onPress={() => setHomeSaved(true)}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : (
            <View style={[subStyles.card, styles.shipScenarioCard]}>
              <Text style={subStyles.rowLabel}>QR de retiro en salón</Text>
              <Text style={styles.choiceSub}>
                Muéstralo al recoger. Puede retirarlo cualquier persona que presente este QR.
              </Text>

              <View style={styles.qrCard}>
                <View style={styles.qrSquare}>
                  <QrCode size={78} color={tc.foreground} strokeWidth={1.8} />
                </View>
                <Text style={styles.qrCodeText}>APS-RET-2026-882041</Text>
                <Text style={styles.qrMeta}>Pedido listo · válido por 24 horas</Text>
              </View>

              <Text style={styles.shipOkMsg}>QR generado · listo para pasar a pago.</Text>
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
          <Text style={styles.stepSub}>El cobro real irá con tu pasarela; aquí solo botones.</Text>

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
                if (id !== 'pay-wire') {
                  setWireTransferConfirmed(false);
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
            <View style={[subStyles.card, styles.cardManager]}>
              <Text style={subStyles.rowLabel}>Tus tarjetas guardadas</Text>
              <Text style={styles.choiceSub}>Selecciona una o agrega una nueva.</Text>

              {savedCards.map((card) => (
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
          ) : null}

          {payId === 'pay-wire' ? (
            <View style={[subStyles.card, styles.cardManager]}>
              <Text style={subStyles.rowLabel}>Confirmación de transferencia</Text>
              <Text style={styles.choiceSub}>
                Debes comunicarte con el salón y confirmar la transferencia para proseguir con la compra.
              </Text>
              <TouchableOpacity
                style={styles.savedCardRow}
                onPress={() => Linking.openURL('tel:+50247132123').catch(() => {})}
                activeOpacity={0.86}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceTitle}>Llamar al salón</Text>
                  <Text style={styles.choiceSub}>+502 4713-2123</Text>
                </View>
                <Text style={styles.cardPickText}>Llamar</Text>
              </TouchableOpacity>

              {wireTransferConfirmed ? (
                <Text style={styles.shipOkMsg}>Transferencia confirmada · puedes finalizar tu compra.</Text>
              ) : (
                <Text style={styles.choiceSub}>
                  Si no se confirma la transferencia, el botón final permanecerá deshabilitado.
                </Text>
              )}

              <SalonButton
                title="Ya confirmé la transferencia"
                variant="outlineGold"
                fullWidth
                style={{ marginTop: spacing.sm }}
                onPress={() => setWireTransferConfirmed(true)}
              />
            </View>
          ) : null}

          <SalonButton
            title={checkoutBusy ? 'Procesando…' : 'Confirmar pedido y cerrar venta'}
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.lg }}
            onPress={async () => {
              if (payId === 'pay-card') {
                if (!clienteId) {
                  Alert.alert(
                    'Iniciá sesión',
                    'Para pagar con tarjeta necesitás una cuenta de cliente vinculada al salón.',
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
                    'Este artículo es solo demostración. El salón debe publicar productos reales en inventario (visible en tienda).',
                  );
                  return;
                }
                setCheckoutBusy(true);
                const res = await confirmarCompraConTarjeta({
                  clienteId,
                  clienteNombre,
                  cartItems,
                });
                setCheckoutBusy(false);
                if (!res.ok) {
                  Alert.alert('No se completó la compra', res.error?.message || 'Intentá de nuevo.');
                  return;
                }
                const orderCode = res.noFactura || `APS-${String(Date.now()).slice(-6)}`;
                setLastOrder({
                  code: orderCode,
                  items: cartItems,
                  subtotal: cartSubtotal,
                  total: cartSubtotal,
                  paymentSummary: `Tarjeta guardada · ${selectedCard.label}`,
                  shippingSummary:
                    shipId === 'ship-home'
                      ? `Envío a domicilio · ${homeAddressType === 'casa' ? 'Casa' : 'Trabajo'}`
                      : 'Retiro en salón con QR',
                  qrCode: shipId === 'ship-salon' ? 'APS-RET-2026-882041' : null,
                  realSale: true,
                });
                setPhase('success');
                setCartItems([]);
                return;
              }

              if (payId === 'pay-cash') {
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
                setCheckoutBusy(true);
                const res = await crearPedidoEfectivo({
                  clienteNombre: clienteNombre || 'Cliente tienda',
                  clienteTelefono: clienteTelefono || '—',
                  clientUserId: clientUserId || null,
                  cartItems,
                  shipId,
                  homeAddressType,
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
                  total: cartSubtotal,
                  paymentSummary: 'Efectivo · pendiente de cobro en salón',
                  shippingSummary:
                    shipId === 'ship-home'
                      ? `Envío a domicilio · ${homeAddressType === 'casa' ? 'Casa' : 'Trabajo'}`
                      : 'Retiro en salón',
                  qrCode: shipId === 'ship-salon' ? res.trackingCode : null,
                  realSale: 'pending_cash',
                });
                setPhase('success');
                setCartItems([]);
                return;
              }

              const orderCode = `APS-${String(Date.now()).slice(-6)}`;
              const paymentSummary = 'Transferencia confirmada por llamada';
              const shippingSummary =
                shipId === 'ship-home'
                  ? `Envío a domicilio · ${homeAddressType === 'casa' ? 'Casa' : 'Trabajo'}`
                  : 'Retiro en salón con QR';

              setLastOrder({
                code: orderCode,
                items: cartItems,
                subtotal: cartSubtotal,
                total: cartSubtotal,
                paymentSummary,
                shippingSummary,
                qrCode: shipId === 'ship-salon' ? 'APS-RET-2026-882041' : null,
                realSale: false,
              });
              setPhase('success');
              setCartItems([]);
            }}
            disabled={!canConfirmPurchase || checkoutBusy}
          />
        </View>
      ) : null}

      {phase === 'success' ? (
        <View style={styles.section}>
          <View style={[subStyles.card, styles.successCard]}>
            <Text style={styles.successTitle}>Venta cerrada</Text>
            <Text style={subStyles.bullets}>
              Pedido #{lastOrder?.code ?? '—'}
              {lastOrder?.realSale === true
                ? ' · Compra con tarjeta registrada, stock descontado y monto sumado a la meta.'
                : lastOrder?.realSale === 'pending_cash'
                  ? ' · Pedido enviado al salón. Pagá en efectivo al retirar; el equipo lo confirmará en Pedidos.'
                  : ' · Pedido de referencia (transferencia).'}
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
              {lastOrder.qrCode ? (
                <RowAmt label="QR retiro" value={lastOrder.qrCode} muted />
              ) : null}
              <View style={subStyles.divider} />
              <RowAmt label="Total" value={formatQ(lastOrder.total)} bold />
            </View>
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
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
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
  choiceCardDisabled: {
    opacity: 0.55,
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

