import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ChevronLeft, Star, Truck, Package, CreditCard, Wallet, Building2 } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '@appsalon/design-tokens';
import { SalonButton } from '../luxury/SalonButton';
import { ss as subStyles } from '../luxury/SubScreenChrome';
import { TiendaCatalogGrid } from './TiendaCatalogGrid';
import { ProductImageStrip } from './ProductImageStrip';
import {
  TIENDA_DEMO_SPECS,
  TIENDA_DEMO_LONG_COPY,
} from '../../data/tiendaPlaceholders';

const STAR_GOLD = '#FFB800';
const STAR_EMPTY = '#E3E3E3';

function formatQ(amount) {
  return `Q ${Number(amount).toFixed(2)}`;
}

function RatingStars({ rating }) {
  const full = Math.floor(Math.min(5, Math.max(0, rating)));
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          color={s <= full ? STAR_GOLD : STAR_EMPTY}
          fill={s <= full ? STAR_GOLD : STAR_EMPTY}
          strokeWidth={0}
        />
      ))}
    </View>
  );
}

function PhaseBack({ label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.phaseBack}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
    >
      <ChevronLeft size={22} color={colors.foreground} strokeWidth={2} />
      <Text style={styles.phaseBackTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function SpecRow({ label, value }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

/**
 * Catálogo → ficha → resumen → envío → pago → venta cerrada. Solo UI y botones (sin integración real).
 */
export function TiendaFlow({ onClose }) {
  const [phase, setPhase] = useState('catalog');
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [cartHint, setCartHint] = useState(false);
  const [shipId, setShipId] = useState('ship-home');
  const [payId, setPayId] = useState('pay-card');

  const unitPrice = selected?.priceAmount ?? 0;
  const lineTotal = useMemo(() => unitPrice * qty, [unitPrice, qty]);

  const specsAndCopy = useMemo(() => {
    if (selected?.id === 'demo-keratin-kit') {
      return { specs: TIENDA_DEMO_SPECS, longCopy: TIENDA_DEMO_LONG_COPY };
    }
    return { specs: [], longCopy: '' };
  }, [selected]);

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
    setPhase('detail');
  };

  const bumpQty = (delta) => {
    setQty((q) => Math.min(9, Math.max(1, q + delta)));
  };

  const shipOptions = [
    { id: 'ship-home', label: 'Envío a domicilio', sub: 'Zona metropolitana · 2–4 días hábiles (demo)' },
    { id: 'ship-salon', label: 'Retiro en salón', sub: 'Aura Salón · listo en 24 h (demo)' },
  ];

  const payOptions = [
    { id: 'pay-card', label: 'Tarjeta guardada', sub: 'Visa ··· 4242 · demo', Icon: CreditCard },
    { id: 'pay-cash', label: 'Efectivo al retirar', sub: 'Pagas cuando recoges en salón', Icon: Wallet },
    { id: 'pay-wire', label: 'Transferencia', sub: 'Banco Industrial · referencia en siguiente paso', Icon: Building2 },
  ];

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
            <RatingStars rating={selected.rating} />
            <Text style={styles.ratingNum}>{selected.rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({selected.reviewCount} opiniones)</Text>
          </View>

          <View style={styles.priceBlock}>
            {selected.compareAtLabel ? (
              <Text style={styles.compareAt}>{selected.compareAtLabel}</Text>
            ) : null}
            <Text style={styles.priceBig}>{selected.priceLabel}</Text>
            <Text style={styles.sku}>SKU · {selected.sku ?? '—'}</Text>
          </View>

          <View style={styles.shipInline}>
            <Truck size={16} color={colors.foregroundMuted} strokeWidth={2} />
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
              <Text style={[subStyles.rowLabel, { marginBottom: spacing.sm }]}>Especificaciones</Text>
              {specsAndCopy.specs.map((row) => (
                <SpecRow key={row.label} label={row.label} value={row.value} />
              ))}
            </View>
          ) : null}

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
            <Text style={styles.cartBanner}>Añadido al carrito (demo · sin persistencia)</Text>
          ) : null}

          <SalonButton
            title="Añadir al carrito · demo"
            variant="outlineGray"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() => setCartHint(true)}
          />
          <SalonButton
            title="Comprar ahora"
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.sm }}
            onPress={() => setPhase('summary')}
          />
        </View>
      ) : null}

      {phase === 'summary' && selected ? (
        <View style={styles.section}>
          <PhaseBack label="Producto" onPress={() => setPhase('detail')} />

          <Text style={styles.stepHead}>Resumen del pedido</Text>
          <Text style={styles.stepSub}>Revisa importes antes de envío y pago (solo maquetación).</Text>

          <View style={subStyles.card}>
            <View style={styles.summaryTop}>
              <Package size={40} color={colors.foregroundMuted} strokeWidth={1.25} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.sumTitle} numberOfLines={2}>
                  {selected.title}
                </Text>
                <Text style={styles.sumMeta}>
                  {qty} × {formatQ(unitPrice)}
                </Text>
              </View>
              <Text style={styles.sumPrice}>{formatQ(lineTotal)}</Text>
            </View>
            <View style={subStyles.divider} />
            <RowAmt label="Subtotal" value={formatQ(lineTotal)} />
            <RowAmt label="Envío (demo)" value="Q 0.00" muted />
            <View style={subStyles.divider} />
            <RowAmt label="Total estimado" value={formatQ(lineTotal)} bold />
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
              style={[styles.choiceCard, shipId === o.id && styles.choiceCardOn]}
              onPress={() => setShipId(o.id)}
              activeOpacity={0.88}
            >
              <Text style={styles.choiceTitle}>{o.label}</Text>
              <Text style={styles.choiceSub}>{o.sub}</Text>
            </TouchableOpacity>
          ))}

          <SalonButton
            title="Continuar · pago"
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.md }}
            onPress={() => setPhase('pay')}
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
              onPress={() => setPayId(id)}
              activeOpacity={0.88}
            >
              <Icon size={22} color={colors.foreground} strokeWidth={1.6} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.choiceTitle}>{label}</Text>
                <Text style={styles.choiceSub}>{sub}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <SalonButton
            title="Confirmar pedido y cerrar venta · demo"
            variant="heroGold"
            fullWidth
            style={{ marginTop: spacing.lg }}
            onPress={() => setPhase('success')}
          />
        </View>
      ) : null}

      {phase === 'success' ? (
        <View style={styles.section}>
          <View style={[subStyles.card, styles.successCard]}>
            <Text style={styles.successTitle}>Venta cerrada</Text>
            <Text style={subStyles.bullets}>
              Pedido demo #882041 · El salón vería este pedido en su panel cuando conectemos inventario y
              pagos. No se ha cobrado nada.
            </Text>
          </View>

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
  return (
    <View style={styles.amtRow}>
      <Text style={[styles.amtLabel, muted && { color: colors.foregroundMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.amtVal,
          muted && { color: colors.foregroundMuted },
          bold && { fontFamily: typography.fontSansMedium, fontSize: 16 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.foreground,
  },
  heroCard: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  brandLine: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: colors.foregroundMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 24,
    lineHeight: 30,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  starRow: { flexDirection: 'row', gap: 2 },
  ratingNum: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  ratingCount: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  priceBlock: {
    marginBottom: spacing.sm,
  },
  compareAt: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    color: colors.foregroundMuted,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  priceBig: {
    fontFamily: typography.fontSansMedium,
    fontSize: 28,
    color: colors.foreground,
  },
  sku: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: colors.foregroundMuted,
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
    color: colors.foregroundMuted,
    lineHeight: 19,
  },
  stockHint: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  copyCard: {
    marginTop: spacing.sm,
  },
  specCard: {
    marginTop: spacing.md,
  },
  specRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  specLabel: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    color: colors.foregroundMuted,
    marginBottom: 4,
  },
  specValue: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foreground,
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
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 20,
    color: colors.foreground,
  },
  qtyVal: {
    fontFamily: typography.fontSansMedium,
    fontSize: 18,
    minWidth: 28,
    textAlign: 'center',
    color: colors.foreground,
  },
  cartBanner: {
    marginTop: spacing.sm,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: colors.success,
  },
  stepHead: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  stepSub: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foregroundMuted,
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
    color: colors.foreground,
    lineHeight: 21,
  },
  sumMeta: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  sumPrice: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: colors.foreground,
    marginLeft: spacing.sm,
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
    color: colors.foreground,
  },
  amtVal: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foreground,
  },
  choiceCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  choiceCardOn: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceMuted,
  },
  choiceTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 4,
  },
  choiceSub: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: colors.foregroundMuted,
    lineHeight: 18,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  payRowOn: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceMuted,
  },
  successCard: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
});
