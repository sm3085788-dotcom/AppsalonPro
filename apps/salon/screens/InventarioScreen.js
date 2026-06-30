import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { VerticalDatePicker } from '../components/VerticalDatePicker';
import { Plus, Star, Truck, X, Image as ImageIcon, Check, ChevronRight, Minus } from 'lucide-react-native';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  db,
  uploadInventarioMediaFromUri,
  DEFAULT_TIENDA_META,
  getSalonSucursalScope,
  VOLUMEN_TRABAJO_OPCIONES,
  emptyPreciosPorVolumen,
  normalizePreciosPorVolumen,
  precioVentaReferencia,
  resolvePrecioRegularTienda,
  splitNotas,
  getArticuloTipo,
  mergeNotas,
  parseDuracionMinutosFromMeta,
  parseMontoInput,
  formatMontoInputLive,
  montoInputFromNumber,
  INVENTARIO_PROMO_DIAS_DEFAULT,
  isPromocionVigente,
  maybeRevertInventarioPromoExpired,
  computePromocionHastaISO,
  toInventarioISODate,
  formatPromocionHastaLabel,
  SERVICIO_CATEGORIAS,
  normalizeServicioCategoria,
  buildStockTransferPayload,
  stockTransferSucursalMatches,
} from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, SalonSearchBar, useSubStyles, modalSheetBottomPad } from '../components/luxury';
import { useSalonPullRefresh } from '../hooks/useSalonPullRefresh';
import { useTheme } from '../theme/ThemeProvider';
import { StockTransferQrScannerModal } from '../components/StockTransferQrScannerModal';
import { StockTransferQrDisplayModal } from '../components/StockTransferQrDisplayModal';

const GAP = 6;
const GRID_H_PAD = spacing.sm;
/** Laptop / BlueStacks horizontal: más columnas y tarjetas más chicas. */
const MAX_INV_CONTENT_WIDTH = 1120;
const MAX_INV_CARD_WIDTH = 172;
const MIN_INV_GRID_COLS = 2;
const MAX_INV_GRID_COLS = 6;

function computeInventoryGridLayout(windowWidth) {
  const effectiveW = Math.min(windowWidth, MAX_INV_CONTENT_WIDTH);
  const inner = Math.max(0, effectiveW - GRID_H_PAD * 2);
  let cols = Math.floor((inner + GAP) / (MAX_INV_CARD_WIDTH + GAP));
  cols = Math.max(MIN_INV_GRID_COLS, Math.min(MAX_INV_GRID_COLS, cols));
  const cardW = (inner - GAP * (cols - 1)) / cols;
  return { cols, cardW };
}
const IMAGE_ASPECT = 1;
const IMAGE_ASPECT_COMPACT = 1;
const MAX_GALERIA = 4;

const STAR_GOLD = '#FFB800';

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function guessExt(uri, mime) {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'jpg';
  const m = String(uri || '').match(/\.([a-z0-9]+)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

/** AAAA-MM-DD o null; rechaza números sueltos (ej. códigos de barras en el campo fecha). */
function parseFechaVencimiento(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { value: null, invalid: false };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { value: null, invalid: true };
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return { value: null, invalid: true };
  }
  return { value: s, invalid: false };
}

function preciosPorVolumenToForm(precios) {
  const p = normalizePreciosPorVolumen(precios);
  return {
    corto: p.corto != null ? montoInputFromNumber(p.corto) : '',
    medio: p.medio != null ? montoInputFromNumber(p.medio) : '',
    largo: p.largo != null ? montoInputFromNumber(p.largo) : '',
    muy_largo: p.muy_largo != null ? montoInputFromNumber(p.muy_largo) : '',
  };
}

function rowToTiendaCard(row) {
  const fresh = maybeRevertInventarioPromoExpired(row);
  const { meta } = splitNotas(fresh.notas);
  const venta = Number(fresh.precio_venta || 0);
  const esServicio = meta.articuloTipo === 'servicio';
  const promoVigente = isPromocionVigente(meta);
  let priceLabel = esServicio ? formatQ(venta) : String(venta);
  if (meta.volumenTrabajoActivo && meta.preciosPorVolumen) {
    const vals = VOLUMEN_TRABAJO_OPCIONES.map((o) => meta.preciosPorVolumen[o.id]).filter((n) => n != null && n > 0);
    if (vals.length) {
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      priceLabel =
        minV === maxV
          ? formatQ(minV)
          : `${formatQ(minV)} – ${formatQ(maxV)}`;
    }
  } else if (!esServicio && venta > 0) {
    priceLabel = venta.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const precioRegular =
    !meta.volumenTrabajoActivo && !esServicio && venta > 0 ? resolvePrecioRegularTienda(fresh, venta) : null;
  const compareAtLabel =
    precioRegular != null
      ? precioRegular.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;
  const brandLine = String(fresh.categoria || (meta.articuloTipo === 'servicio' ? 'Servicio' : 'Producto')).toUpperCase();
  const stock = Number(fresh.stock_actual ?? 0);
  const stockHint =
    meta.articuloTipo === 'servicio'
      ? meta.volumenTrabajoActivo
        ? '4 precios · Vender'
        : 'Servicio en salón · agenda'
      : stock > 0
        ? `En stock · ${stock} u.`
        : 'Sin stock';
  const imageUris = [...new Set([fresh.imagen_url, ...(Array.isArray(fresh.imagenes_urls) ? fresh.imagenes_urls : [])].filter(Boolean))];
  return {
    id: fresh.id,
    brandLine,
    title: fresh.nombre,
    priceLabel,
    compareAtLabel,
    badge: promoVigente ? meta.badge?.trim() || 'Promo' : meta.badge?.trim() || null,
    badgePromo: promoVigente,
    rating: Math.min(5, Math.max(0, Number(meta.rating) || 4.5)),
    reviewCount: Math.max(0, Math.floor(Number(meta.reviewCount) || 0)),
    shippingLabel: meta.shippingLabel || 'Envío y retiro · coordinar en recepción',
    stockHint,
    imageUris,
    visibleTienda: !!fresh.visible_en_tienda,
    row: fresh,
  };
}

function RatingStars({ rating, emptyColor, size = 12 }) {
  const full = Math.floor(Math.min(5, Math.max(0, rating)));
  return (
    <View style={{ flexDirection: 'row', gap: size <= 9 ? 1 : 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color={s <= full ? STAR_GOLD : emptyColor}
          fill={s <= full ? STAR_GOLD : 'transparent'}
          strokeWidth={s <= full ? 0 : 1.2}
        />
      ))}
    </View>
  );
}

function GalleryStrip({ uris, badgeText, badgePromo = false, width, colors, isDark = false, compact = false }) {
  const aspect = compact ? IMAGE_ASPECT_COMPACT : IMAGE_ASPECT;
  const data = (uris || []).filter(Boolean);
  const badgeStyle = badgePromo
    ? [
        stripStyles.badge,
        stripStyles.badgePromo,
        isDark && stripStyles.badgePromoDark,
        compact && stripStyles.badgeCompact,
        badgePromo && compact && stripStyles.badgePromoCompact,
      ]
    : [stripStyles.badge, compact && stripStyles.badgeCompact];
  const badgeTxtStyle = badgePromo
    ? [stripStyles.badgeTxt, stripStyles.badgePromoTxt, compact && stripStyles.badgeTxtCompact]
    : [stripStyles.badgeTxt, compact && stripStyles.badgeTxtCompact];
  if (!data.length) {
    return (
      <View
        style={[
          stripStyles.imageZone,
          {
            width,
            aspectRatio: aspect,
            backgroundColor: colors.iconCircleBg,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <ImageIcon size={compact ? 22 : 32} color={colors.foregroundSubtle} strokeWidth={1.4} />
        <Text style={[stripStyles.imageHint, compact && stripStyles.imageHintCompact, { color: colors.foregroundSubtle }]}>
          Imagen
        </Text>
      </View>
    );
  }
  if (data.length === 1) {
    return (
      <View
        style={[
          stripStyles.imageZone,
          { width, aspectRatio: aspect, borderBottomColor: colors.cardBorder, backgroundColor: colors.iconCircleBg },
        ]}
      >
        <Image source={{ uri: data[0] }} style={stripStyles.galleryImageFill} resizeMode="cover" />
        {badgeText ? (
          <View style={badgeStyle}>
            <Text style={badgeTxtStyle} numberOfLines={1}>
              {badgeText}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View
      style={[
        stripStyles.imageZone,
        { width, aspectRatio: aspect, borderBottomColor: colors.cardBorder, backgroundColor: colors.iconCircleBg },
      ]}
    >
      <FlatList
        horizontal
        data={data}
        keyExtractor={(u, i) => `${u}-${i}`}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ width, aspectRatio: aspect, overflow: 'hidden' }}>
            <Image source={{ uri: item }} style={stripStyles.galleryImageFill} resizeMode="cover" />
          </View>
        )}
      />
      {badgeText ? (
        <View style={badgeStyle}>
          <Text style={badgeTxtStyle} numberOfLines={1}>
            {badgeText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const stripStyles = StyleSheet.create({
  imageZone: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryImageFill: {
    ...StyleSheet.absoluteFillObject,
  },
  imageHint: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 11,
  },
  imageHintCompact: {
    marginTop: 4,
    fontSize: 9,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '70%',
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontFamily: typography.fontSansMedium },
  badgePromo: {
    backgroundColor: '#43A047',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#1B5E20',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  badgePromoDark: {
    backgroundColor: '#66BB6A',
    borderColor: '#C8E6C9',
  },
  badgePromoTxt: {
    fontSize: 11,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  badgePromoCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeCompact: {
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '80%',
  },
  badgeTxtCompact: { fontSize: 8 },
});

function TiendaProductCard({ width, product, onPress, colors, isDark, compact = false }) {
  const emptyStar = isDark ? '#525252' : '#E3E3E3';
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          marginBottom: GAP,
          overflow: 'hidden',
          ...Platform.select({
            ios: {
              shadowColor: 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
            },
            android: { elevation: 0 },
            default: {},
          }),
        },
        body: { padding: compact ? 5 : spacing.sm },
        brandLine: {
          fontFamily: typography.fontSans,
          fontSize: compact ? 7 : 10,
          color: colors.foregroundMuted,
          marginBottom: compact ? 2 : 4,
          letterSpacing: compact ? 0.2 : 0.6,
        },
        title: {
          fontFamily: typography.fontSansMedium,
          fontSize: compact ? 10 : 13,
          lineHeight: compact ? 13 : 17,
          color: colors.foreground,
          marginBottom: compact ? 3 : spacing.sm,
          minHeight: compact ? 26 : 34,
        },
        priceRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: compact ? 4 : 8,
          marginBottom: compact ? 4 : 6,
        },
        compareAt: {
          fontFamily: typography.fontSans,
          fontSize: compact ? 8 : 12,
          color: colors.foregroundMuted,
          textDecorationLine: 'line-through',
        },
        priceLive: {
          fontFamily: typography.fontSansMedium,
          fontSize: compact ? 11 : 16,
          color: colors.primary,
        },
        ratingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 3 : 6,
          marginBottom: compact ? 4 : 6,
          flexWrap: 'wrap',
        },
        ratingNum: {
          fontFamily: typography.fontSansMedium,
          fontSize: compact ? 8 : 11,
          color: colors.foreground,
        },
        ratingTxt: {
          fontFamily: typography.fontSans,
          fontSize: compact ? 8 : 11,
          color: colors.foregroundMuted,
        },
        shipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: compact ? 2 : 4, marginBottom: compact ? 2 : 0 },
        shipTxt: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: compact ? 7 : 10,
          color: colors.foregroundMuted,
          lineHeight: compact ? 10 : 14,
        },
        volumenPill: {
          alignSelf: 'flex-start',
          marginTop: compact ? 4 : 6,
          paddingHorizontal: compact ? 6 : 8,
          paddingVertical: compact ? 2 : 3,
          borderRadius: compact ? 4 : 6,
          backgroundColor: isDark ? 'rgba(201,169,98,0.22)' : 'rgba(201,169,98,0.18)',
        },
        volumenPillTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: compact ? 8 : 11,
          color: colors.primary,
        },
        stockHint: {
          marginTop: compact ? 2 : 4,
          fontFamily: typography.fontSans,
          fontSize: compact ? 7 : 10,
          color: colors.primary,
          lineHeight: compact ? 10 : 14,
        },
        tiendaTag: {
          alignSelf: 'flex-start',
          marginTop: compact ? 4 : 6,
          paddingHorizontal: compact ? 5 : 8,
          paddingVertical: compact ? 2 : 3,
          borderRadius: compact ? 4 : 6,
          backgroundColor: product.visibleTienda
            ? isDark
              ? 'rgba(129,199,132,0.18)'
              : 'rgba(46,125,50,0.12)'
            : isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.06)',
        },
        tiendaTagTxt: {
          fontSize: compact ? 7 : 10,
          fontFamily: typography.fontSansMedium,
          color: product.visibleTienda ? (isDark ? colors.success : '#2E7D32') : colors.foregroundMuted,
        },
      }),
    [colors, compact, product.visibleTienda, isDark],
  );

  const flatCard = Platform.select({
    ios: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
    android: { elevation: 0 },
    default: {},
  });

  return (
    <TouchableOpacity style={[styles.card, flatCard, { width }]} onPress={onPress} activeOpacity={0.92}>
      <GalleryStrip
        uris={product.imageUris}
        badgeText={product.badge}
        badgePromo={!!product.badgePromo}
        width={width}
        colors={colors}
        isDark={isDark}
        compact={compact}
      />
      <View style={styles.body}>
        {product.brandLine ? (
          <Text style={styles.brandLine} numberOfLines={1}>
            {product.brandLine}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={compact ? 2 : 2}>
          {product.title}
        </Text>
        <View style={styles.priceRow}>
          {product.compareAtLabel ? (
            <Text style={styles.compareAt}>{product.compareAtLabel}</Text>
          ) : null}
          <Text style={styles.priceLive}>{product.priceLabel}</Text>
        </View>
        <View style={styles.ratingRow}>
          <RatingStars rating={product.rating} emptyColor={emptyStar} size={compact ? 8 : 12} />
          <Text style={styles.ratingNum}>{product.rating.toFixed(1)}</Text>
          <Text style={styles.ratingTxt}>({product.reviewCount})</Text>
        </View>
        <View style={styles.shipRow}>
          <Truck size={compact ? 9 : 12} color={colors.foregroundMuted} strokeWidth={2} />
          <Text style={styles.shipTxt} numberOfLines={compact ? 2 : 2}>
            {product.shippingLabel}
          </Text>
        </View>
        {product.stockHint ? (
          <Text style={styles.stockHint} numberOfLines={compact ? 2 : 1}>
            {product.stockHint}
          </Text>
        ) : null}
        <View style={styles.tiendaTag}>
          <Text style={styles.tiendaTagTxt}>
            {product.visibleTienda ? (compact ? 'Tienda' : 'Visible en tienda') : compact ? 'Oculto' : 'No publicado'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const emptyForm = () => ({
  id: null,
  nombre: '',
  categoria: '',
  barcode: '',
  precio_venta: '',
  stock_actual: '',
  stock_minimo: '5',
  es_consumible: false,
  fecha_vencimiento: '',
  ubicacion: '',
  descripcion_tienda: '',
  visible_en_tienda: false,
  notasStaff: '',
  badge: '',
  hintTarjeta: '',
  shippingLabel: DEFAULT_TIENDA_META.shippingLabel,
  rating: '4.5',
  reviewCount: '0',
  articuloTipo: 'producto',
  duracion_agenda: '60 min',
  volumenTrabajoActivo: false,
  preciosPorVolumen: emptyPreciosPorVolumen(),
  /** Precio “antes” en tienda normal (JSON meta.precioRegular); vacío = reglas automáticas. */
  precio_regular_tienda: '',
  /** Precio promo y tachado promo (solo mientras promoción activa en el formulario). */
  precio_promo: '',
  precio_tachado_promo: '',
  promocionActiva: false,
  promocion_desde: '',
  promocion_hasta: '',
  promocion_precio_original: null,
  promocion_precios_original: null,
  localMain: null,
  localGallery: [],
  remoteMain: '',
  remoteGallery: [],
});

export function InventarioScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const { width: winW } = useWindowDimensions();
  const styles = useMemo(() => createStyles(c), [c]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promoSaving, setPromoSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [modalStockFiltros, setModalStockFiltros] = useState(false);
  const [sortInv, setSortInv] = useState('nombre_asc');
  const [filterInv, setFilterInv] = useState('todos');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [stockQuery, setStockQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('todos');
  const [stockSelected, setStockSelected] = useState({});
  const [stockBatchMeta, setStockBatchMeta] = useState(() => ({
    numero_lote: '',
    fecha_ingreso: new Date(),
  }));
  const [stockTargetSucursalId, setStockTargetSucursalId] = useState(null);
  const [stockSucursales, setStockSucursales] = useState([]);
  const [showStockQrModal, setShowStockQrModal] = useState(false);
  const [stockQrPayload, setStockQrPayload] = useState(null);
  const [showStockScanModal, setShowStockScanModal] = useState(false);
  const [showSucursalPicker, setShowSucursalPicker] = useState(false);
  const [showLoteDatePicker, setShowLoteDatePicker] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [categoriaPickerOpen, setCategoriaPickerOpen] = useState(false);
  const sel = useListSelection();
  const sucursalScope = getSalonSucursalScope();
  const stockOnlyMode = !sucursalScope.isGlobal;

  const esFormServicio = form.articuloTipo === 'servicio';

  const isNuevoStock = !form.id && form.articuloTipo === 'nuevo_stock';

  const { cols: gridCols, cardW } = useMemo(() => computeInventoryGridLayout(winW), [winW]);

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.inventario.getAll();
      if (error) throw error;
      let rows = data || [];
      if (!stockOnlyMode) {
        const persistExpired = [];
        rows = rows.map((row) => {
          const reverted = maybeRevertInventarioPromoExpired(row);
          if (
            reverted.id &&
            (reverted.precio_venta !== row.precio_venta || reverted.notas !== row.notas)
          ) {
            persistExpired.push(reverted);
          }
          return reverted;
        });
        for (const r of persistExpired) {
          await db.inventario.update(r.id, { precio_venta: r.precio_venta, notas: r.notas });
        }
      }
      if (stockOnlyMode && sucursalScope.sucursalId) {
        const { data: stocks, error: stErr } = await db.inventarioStockSucursal.getForSucursal(
          sucursalScope.sucursalId,
        );
        if (stErr) throw stErr;
        rows = db.inventarioStockSucursal.mergeCatalogo(rows, stocks);
      }
      setItems(rows);
    } catch (e) {
      Alert.alert('Inventario', e?.message || 'No se pudo cargar.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [stockOnlyMode, sucursalScope.sucursalId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen || !isNuevoStock || stockOnlyMode) return;
    let cancelled = false;
    void db.sucursales.listActivas().then(({ data, error }) => {
      if (cancelled || error) return;
      setStockSucursales(data || []);
    });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, isNuevoStock, stockOnlyMode]);

  const { refreshControl } = useSalonPullRefresh(load);

  const inventarioFiltroResumen = useMemo(() => {
    const sortLabel =
      sortInv === 'nombre_desc'
        ? 'Nombre Z → A'
        : sortInv === 'precio_asc'
          ? 'Precio menor primero'
          : sortInv === 'precio_desc'
            ? 'Precio mayor primero'
            : 'Nombre A → Z';
    const f =
      filterInv === 'tienda'
        ? 'Solo visibles en tienda'
        : filterInv === 'bajo_stock'
          ? 'Bajo stock'
          : filterInv === 'servicio'
            ? 'Servicios'
            : filterInv === 'producto'
              ? 'Productos'
              : 'Todos';
    return `${sortLabel} · ${f}`;
  }, [sortInv, filterInv]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = [...items];
    if (q) {
      rows = rows.filter((r) => {
        const blob = [r.nombre, r.categoria, r.barcode, r.ubicacion].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    if (filterInv === 'tienda') rows = rows.filter((r) => !!r.visible_en_tienda);
    if (filterInv === 'bajo_stock') {
      rows = rows.filter((r) => {
        const st = Number(r.stock_actual ?? 0);
        const min = Number(r.stock_minimo ?? 0);
        return st <= min;
      });
    }
    if (filterInv === 'servicio') rows = rows.filter((r) => getArticuloTipo(r) === 'servicio');
    if (filterInv === 'producto') rows = rows.filter((r) => getArticuloTipo(r) === 'producto');

    const precio = (r) => Number(r.precio_venta ?? 0);
    rows.sort((a, b) => {
      if (sortInv === 'nombre_asc' || sortInv === 'nombre_desc') {
        const cmp = String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' });
        return sortInv === 'nombre_desc' ? -cmp : cmp;
      }
      const pa = precio(a);
      const pb = precio(b);
      return sortInv === 'precio_desc' ? pb - pa : pa - pb;
    });
    return rows;
  }, [items, query, sortInv, filterInv]);

  const gridRows = useMemo(() => {
    const out = [];
    for (let i = 0; i < filtered.length; i += gridCols) {
      out.push(filtered.slice(i, i + gridCols));
    }
    return out;
  }, [filtered, gridCols]);

  const resetStockFlow = () => {
    setStockQuery('');
    setStockFilter('todos');
    setStockSelected({});
    setStockBatchMeta({ numero_lote: '', fecha_ingreso: new Date() });
    setStockTargetSucursalId(null);
    setShowStockQrModal(false);
    setStockQrPayload(null);
    setShowStockScanModal(false);
    setShowSucursalPicker(false);
    setShowLoteDatePicker(false);
  };

  const closeArticleModal = () => {
    setModalOpen(false);
    resetStockFlow();
  };

  const openNew = () => {
    if (stockOnlyMode) {
      setForm({ ...emptyForm(), articuloTipo: 'nuevo_stock' });
      resetStockFlow();
      setModalOpen(true);
      setShowStockScanModal(true);
      return;
    }
    setForm(emptyForm());
    resetStockFlow();
    setModalOpen(true);
  };

  const stockProducts = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    let rows = items.filter((r) => getArticuloTipo(r) === 'producto');
    if (q) {
      rows = rows.filter((r) => {
        const blob = [r.nombre, r.categoria, r.barcode, r.ubicacion].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    if (stockFilter === 'bajo_stock') {
      rows = rows.filter((r) => {
        const st = Number(r.stock_actual ?? 0);
        const min = Number(r.stock_minimo ?? 0);
        return st <= min;
      });
    }
    rows.sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }),
    );
    return rows;
  }, [items, stockQuery, stockFilter]);

  const stockFiltroResumen = useMemo(() => {
    const f = stockFilter === 'bajo_stock' ? 'Bajo stock' : 'Todos los productos';
    return f;
  }, [stockFilter]);

  const stockSelectedCount = useMemo(() => Object.keys(stockSelected).length, [stockSelected]);

  const stockTargetSucursal = useMemo(
    () => stockSucursales.find((s) => String(s.id) === String(stockTargetSucursalId)) || null,
    [stockSucursales, stockTargetSucursalId],
  );

  const stockProductLabels = useMemo(() => {
    const map = {};
    for (const row of items) {
      if (row?.id) map[String(row.id)] = row.nombre || 'Producto';
    }
    return map;
  }, [items]);

  const toggleStockProduct = (productId) => {
    const id = String(productId);
    setStockSelected((prev) => {
      if (prev[id] != null) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  };

  const adjustStockQty = (productId, delta) => {
    const id = String(productId);
    setStockSelected((prev) => {
      const cur = Math.max(1, Math.floor(Number(prev[id] || 1)));
      const nextQty = Math.max(1, cur + delta);
      return { ...prev, [id]: nextQty };
    });
  };

  const setStockQtyText = (productId, text) => {
    const id = String(productId);
    const n = Math.max(1, Math.floor(Number(String(text || '').replace(/[^0-9]/g, '')) || 1));
    setStockSelected((prev) => ({ ...prev, [id]: n }));
  };

  const handleGenerateStockQr = () => {
    const numero = stockBatchMeta.numero_lote.trim();
    if (!numero) {
      Alert.alert('Nuevo stock', 'Ingresá el número de lote.');
      return;
    }
    if (!stockTargetSucursalId) {
      Alert.alert('Nuevo stock', 'Seleccioná la sucursal destino.');
      return;
    }
    const itemsPayload = Object.entries(stockSelected).map(([inventario_id, cantidad]) => ({
      inventario_id,
      cantidad,
    }));
    const payload = buildStockTransferPayload({
      sucursalId: stockTargetSucursalId,
      numeroLote: numero,
      fechaIngreso: stockBatchMeta.fecha_ingreso.toISOString(),
      items: itemsPayload,
    });
    if (!payload) {
      Alert.alert('Nuevo stock', 'Seleccioná al menos un producto con cantidad válida.');
      return;
    }
    setStockQrPayload(payload);
    setShowStockQrModal(true);
  };

  const handleImportStockQr = async (payload) => {
    if (!stockTransferSucursalMatches(payload, sucursalScope.sucursalId)) {
      Alert.alert(
        'QR incorrecto',
        'Este código es para otra sucursal. Pedí a matriz que genere el QR con tu sucursal seleccionada.',
      );
      return;
    }
    setShowStockScanModal(false);
    setStockSaving(true);
    try {
      const { data, error } = await db.inventarioLotes.registrarIngresoBatch({
        sucursal_id: payload.sid,
        numero_lote: payload.l,
        fecha_ingreso: payload.f,
        items: payload.i,
      });
      if (error) throw error;
      await load();
      const imported = data?.imported ?? payload.i.length;
      Alert.alert(
        'Stock importado',
        `Se registraron ${imported} producto(s) del lote ${payload.l}.\n\nTu inventario local ya fue actualizado.`,
      );
      closeArticleModal();
    } catch (e) {
      const msg = e?.message || 'No se pudo importar el stock.';
      const low = String(msg).toLowerCase();
      if (low.includes('inventario_lotes') || low.includes('does not exist')) {
        Alert.alert(
          'Tabla de lotes',
          'Ejecutá en Supabase:\n1) supabase-inventario-lotes-setup.sql\n2) supabase-sucursales-stock-lotes.sql\n\nLuego volvé a escanear el QR.',
        );
      } else if (low.includes('row-level security') || low.includes('permission denied')) {
        Alert.alert(
          'Importar stock',
          `${msg}\n\nEjecutá supabase-sucursales-stock-lotes.sql en Supabase SQL Editor.`,
        );
      } else {
        Alert.alert('Importar stock', msg);
      }
    } finally {
      setStockSaving(false);
    }
  };

  const openEdit = (row) => {
    if (stockOnlyMode) {
      Alert.alert('Inventario', 'Tu sucursal solo puede ingresar stock. El catálogo lo administra la matriz.');
      return;
    }
    const rowFresh = maybeRevertInventarioPromoExpired(row);
    const { staff, meta } = splitNotas(rowFresh.notas);
    const imgs = [rowFresh.imagen_url, ...(Array.isArray(rowFresh.imagenes_urls) ? rowFresh.imagenes_urls : [])].filter(Boolean);
    const main = imgs[0] || '';
    const rest = imgs.slice(1, 1 + MAX_GALERIA);
    setForm({
      id: rowFresh.id,
      nombre: rowFresh.nombre || '',
      categoria: rowFresh.categoria || '',
      barcode: rowFresh.barcode || '',
      precio_venta:
        isPromocionVigente(meta) && meta.promocionPrecioOriginal != null && Number(meta.promocionPrecioOriginal) > 0
          ? montoInputFromNumber(meta.promocionPrecioOriginal)
          : montoInputFromNumber(rowFresh.precio_venta),
      precio_promo:
        isPromocionVigente(meta) && Number(rowFresh.precio_venta) > 0
          ? montoInputFromNumber(rowFresh.precio_venta)
          : '',
      precio_regular_tienda:
        meta.precioRegular != null && Number(meta.precioRegular) > 0
          ? montoInputFromNumber(meta.precioRegular)
          : '',
      precio_tachado_promo:
        meta.precioRegularPromo != null && Number(meta.precioRegularPromo) > 0
          ? montoInputFromNumber(meta.precioRegularPromo)
          : '',
      stock_actual: String(rowFresh.stock_actual ?? 0),
      stock_minimo: String(rowFresh.stock_minimo ?? 5),
      es_consumible: !!rowFresh.es_consumible,
      fecha_vencimiento: rowFresh.fecha_vencimiento || '',
      ubicacion: rowFresh.ubicacion || '',
      descripcion_tienda: rowFresh.descripcion_tienda || '',
      visible_en_tienda: !!rowFresh.visible_en_tienda,
      notasStaff: staff,
      badge: meta.badge || '',
      hintTarjeta: meta.hintTarjeta || '',
      shippingLabel: meta.shippingLabel || DEFAULT_TIENDA_META.shippingLabel,
      rating: String(meta.rating ?? 4.5),
      reviewCount: String(meta.reviewCount ?? 0),
      articuloTipo: meta.articuloTipo || 'producto',
      duracion_agenda: meta.duracion_agenda || (meta.duracion_minutos ? `${meta.duracion_minutos} min` : '60 min'),
      volumenTrabajoActivo: !!meta.volumenTrabajoActivo,
      preciosPorVolumen: preciosPorVolumenToForm(
        meta.volumenTrabajoActivo ? meta.preciosPorVolumen : emptyPreciosPorVolumen(),
      ),
      promocionActiva: isPromocionVigente(meta),
      promocion_desde: meta.promocionDesde || '',
      promocion_hasta: meta.promocionHasta || '',
      promocion_precio_original: meta.promocionPrecioOriginal ?? null,
      promocion_precios_original: meta.promocionPreciosPorVolumenOriginal || null,
      localMain: null,
      localGallery: [],
      remoteMain: main,
      remoteGallery: rest,
    });
    setModalOpen(true);
  };

  const pickMain = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Se necesita acceso a la galería.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets?.[0]) setForm((f) => ({ ...f, localMain: res.assets[0] }));
  };

  const pickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const cap = MAX_GALERIA - form.remoteGallery.length - form.localGallery.length;
    if (cap <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: cap,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return;
    setForm((f) => {
      const room = MAX_GALERIA - f.remoteGallery.length - f.localGallery.length;
      const add = res.assets.slice(0, Math.max(0, room));
      return { ...f, localGallery: [...f.localGallery, ...add] };
    });
  };

  const clearLocalMain = () => setForm((f) => ({ ...f, localMain: null }));
  const removeRemoteMain = () => setForm((f) => ({ ...f, remoteMain: '' }));
  const removeLocalGal = (i) =>
    setForm((f) => ({ ...f, localGallery: f.localGallery.filter((_, j) => j !== i) }));
  const removeRemoteGal = (i) =>
    setForm((f) => ({ ...f, remoteGallery: f.remoteGallery.filter((_, j) => j !== i) }));

  const parseNum = (s) => {
    const n = Number(String(s || '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const parsePrecioInput = (s) => {
    const n = parseMontoInput(s);
    return Number.isFinite(n) ? n : 0;
  };

  const computePromoFormState = (f, enabled) => {
    if (!enabled) {
      return {
        ...f,
        promocionActiva: false,
        promocion_desde: '',
        promocion_hasta: '',
        promocion_precio_original: null,
        promocion_precios_original: null,
        precio_promo: '',
        precio_tachado_promo: '',
      };
    }
    const desde = toInventarioISODate(new Date());
    const hasta = computePromocionHastaISO(new Date(), INVENTARIO_PROMO_DIAS_DEFAULT);
    const precioNormal = parsePrecioInput(f.precio_venta);
    const precioOrigGuardado =
      f.promocion_precio_original != null && Number(f.promocion_precio_original) > 0
        ? Number(f.promocion_precio_original)
        : null;
    const precioOrig = f.volumenTrabajoActivo
      ? null
      : precioOrigGuardado != null
        ? precioOrigGuardado
        : precioNormal;
    const preciosOrig = f.volumenTrabajoActivo
      ? normalizePreciosPorVolumen(
          f.promocion_precios_original || {
            corto: parsePrecioInput(f.preciosPorVolumen.corto),
            medio: parsePrecioInput(f.preciosPorVolumen.medio),
            largo: parsePrecioInput(f.preciosPorVolumen.largo),
            muy_largo: parsePrecioInput(f.preciosPorVolumen.muy_largo),
          },
        )
      : null;
    return {
      ...f,
      promocionActiva: true,
      promocion_desde: desde,
      promocion_hasta: hasta,
      promocion_precio_original: precioOrig,
      promocion_precios_original: preciosOrig,
      badge: f.badge?.trim() ? f.badge : 'Promo',
    };
  };

  const resolveFormPreciosTienda = (formSnap) => {
    const precioNormal =
      formSnap.articuloTipo === 'servicio' && formSnap.volumenTrabajoActivo
        ? 0
        : parsePrecioInput(formSnap.precio_venta);
    const precioPromo = formSnap.promocionActiva ? parsePrecioInput(formSnap.precio_promo) : 0;
    const precioTachadoNormal = parsePrecioInput(formSnap.precio_regular_tienda);
    const precioTachadoPromo = formSnap.promocionActiva ? parsePrecioInput(formSnap.precio_tachado_promo) : 0;
    const precioVentaPublicado =
      formSnap.promocionActiva && precioPromo > 0 ? precioPromo : precioNormal;
    return { precioNormal, precioPromo, precioTachadoNormal, precioTachadoPromo, precioVentaPublicado };
  };

  const buildInventarioTiendaMeta = (formSnap, { preciosVol, preciosTienda }) => {
    const esServicio = formSnap.articuloTipo === 'servicio';
    const { precioNormal, precioPromo, precioTachadoNormal, precioTachadoPromo } = preciosTienda;
    return {
      badge: formSnap.badge.trim(),
      hintTarjeta: esServicio ? String(formSnap.hintTarjeta || '').trim() : '',
      shippingLabel: esServicio
        ? ''
        : formSnap.shippingLabel.trim() || DEFAULT_TIENDA_META.shippingLabel,
      rating: parseNum(formSnap.rating) || 4.5,
      reviewCount: Math.max(0, Math.floor(parseNum(formSnap.reviewCount))),
      articuloTipo: esServicio ? 'servicio' : 'producto',
      duracion_agenda: esServicio ? String(formSnap.duracion_agenda || '').trim() : '',
      duracion_minutos: esServicio
        ? parseDuracionMinutosFromMeta({ duracion_agenda: formSnap.duracion_agenda })
        : DEFAULT_TIENDA_META.duracion_minutos,
      volumenTrabajoActivo: esServicio ? !!formSnap.volumenTrabajoActivo : false,
      volumenTrabajo: null,
      preciosPorVolumen: esServicio && formSnap.volumenTrabajoActivo ? preciosVol : null,
      precioRegular:
        esServicio && formSnap.volumenTrabajoActivo
          ? null
          : precioTachadoNormal > precioNormal && precioNormal > 0
            ? Math.round(precioTachadoNormal * 100) / 100
            : null,
      precioRegularPromo:
        formSnap.promocionActiva && precioTachadoPromo > precioPromo && precioPromo > 0
          ? Math.round(precioTachadoPromo * 100) / 100
          : null,
      promocionActiva: !!formSnap.promocionActiva,
      promocionDesde: formSnap.promocionActiva ? formSnap.promocion_desde || toInventarioISODate(new Date()) : null,
      promocionHasta: formSnap.promocionActiva
        ? formSnap.promocion_hasta || computePromocionHastaISO(new Date(), INVENTARIO_PROMO_DIAS_DEFAULT)
        : null,
      promocionPrecioOriginal:
        formSnap.promocionActiva && precioNormal > 0 ? Math.round(precioNormal * 100) / 100 : null,
      promocionPreciosPorVolumenOriginal:
        formSnap.promocionActiva && formSnap.volumenTrabajoActivo && formSnap.promocion_precios_original
          ? normalizePreciosPorVolumen(formSnap.promocion_precios_original)
          : null,
    };
  };

  const preciosVolFromForm = (formSnap) =>
    normalizePreciosPorVolumen(
      formSnap.articuloTipo === 'servicio' && formSnap.volumenTrabajoActivo
        ? {
            corto: parsePrecioInput(formSnap.preciosPorVolumen.corto),
            medio: parsePrecioInput(formSnap.preciosPorVolumen.medio),
            largo: parsePrecioInput(formSnap.preciosPorVolumen.largo),
            muy_largo: parsePrecioInput(formSnap.preciosPorVolumen.muy_largo),
          }
        : null,
    );

  const assertPromoFormPrices = (formSnap, preciosVol) => {
    if (formSnap.articuloTipo === 'servicio' && formSnap.volumenTrabajoActivo) {
      const faltan = VOLUMEN_TRABAJO_OPCIONES.filter((o) => !(preciosVol[o.id] > 0)).map((o) => o.label);
      if (faltan.length) {
        throw new Error(`Completá un precio mayor a 0 para: ${faltan.join(', ')}.`);
      }
      return;
    }
    if (!(parsePrecioInput(formSnap.precio_venta) > 0)) {
      throw new Error('Indicá el precio de venta normal.');
    }
    if (!(parsePrecioInput(formSnap.precio_promo) > 0)) {
      throw new Error('Indicá el precio de promoción.');
    }
  };

  const persistPromocionToggle = async (formSnap) => {
    if (!formSnap.id || stockOnlyMode || formSnap.articuloTipo === 'nuevo_stock') return;

    const preciosVol = preciosVolFromForm(formSnap);
    const preciosTienda = resolveFormPreciosTienda(formSnap);
    if (formSnap.promocionActiva) {
      assertPromoFormPrices(formSnap, preciosVol);
    }

    const meta = buildInventarioTiendaMeta(formSnap, { preciosVol, preciosTienda });
    const notas = mergeNotas(formSnap.notasStaff, meta);
    const precioVentaCol =
      formSnap.articuloTipo === 'servicio' && formSnap.volumenTrabajoActivo
        ? formSnap.visible_en_tienda
          ? null
          : precioVentaReferencia(meta, preciosVol.medio)
        : formSnap.promocionActiva
          ? preciosTienda.precioVentaPublicado || null
          : preciosTienda.precioNormal || null;

    setPromoSaving(true);
    try {
      const { error } = await db.inventario.update(formSnap.id, { notas, precio_venta: precioVentaCol });
      if (error) throw error;

      if (meta.articuloTipo === 'servicio') {
        const { error: syncErr, skipped } = await db.servicios.syncFromInventario({
          nombre: formSnap.nombre.trim(),
          precio_venta: precioVentaCol,
          notas,
        });
        if (syncErr && !skipped) {
          throw new Error(syncErr.message || String(syncErr));
        }
      }

      await load();
      Alert.alert(
        'Promoción',
        formSnap.promocionActiva
          ? `Promo activa ${INVENTARIO_PROMO_DIAS_DEFAULT} días · vence ${formatPromocionHastaLabel(formSnap.promocion_hasta)}.`
          : 'Promoción desactivada. Precio restaurado.',
      );
    } finally {
      setPromoSaving(false);
    }
  };

  const onPromocionToggle = (enabled) => {
    setForm((f) => {
      const prev = f;
      const next = computePromoFormState(f, enabled);
      const shouldPersist =
        f.id && !stockOnlyMode && (!enabled || parsePrecioInput(next.precio_promo) > 0);
      if (shouldPersist) {
        void (async () => {
          try {
            await persistPromocionToggle(next);
          } catch (e) {
            setForm(prev);
            Alert.alert('Promoción', e?.message || 'No se pudo guardar la promoción.');
          }
        })();
      }
      return next;
    });
  };

  const save = async () => {
    if (form.articuloTipo === 'nuevo_stock') return;
    if (!form.nombre.trim()) {
      Alert.alert('Nombre', 'El nombre del artículo es obligatorio.');
      return;
    }
    const fechaVenc = parseFechaVencimiento(form.fecha_vencimiento);
    if (fechaVenc.invalid) {
      Alert.alert(
        'Fecha de vencimiento',
        'Formato inválido. Usá AAAA-MM-DD (ej. 2026-12-31) o dejá el campo vacío.\n\nUn número suelto (como un código de barras) no es una fecha válida.',
      );
      return;
    }
    const preciosVol = preciosVolFromForm(form);
    if (form.articuloTipo === 'servicio' && form.volumenTrabajoActivo) {
      const faltan = VOLUMEN_TRABAJO_OPCIONES.filter((o) => !(preciosVol[o.id] > 0)).map((o) => o.label);
      if (faltan.length) {
        Alert.alert('Precios por volumen', `Completá un precio mayor a 0 para: ${faltan.join(', ')}.`);
        return;
      }
    } else if (!(parsePrecioInput(form.precio_venta) > 0)) {
      Alert.alert('Precio', 'Indicá el precio de venta.');
      return;
    }
    if (form.promocionActiva && !(form.articuloTipo === 'servicio' && form.volumenTrabajoActivo)) {
      if (!(parsePrecioInput(form.precio_promo) > 0)) {
        Alert.alert('Promoción', 'Indicá el precio de promoción.');
        return;
      }
    }
    if (
      !esFormServicio &&
      form.visible_en_tienda &&
      !(parsePrecioInput(form.precio_venta) > 0) &&
      !form.volumenTrabajoActivo &&
      !(form.promocionActiva && parsePrecioInput(form.precio_promo) > 0)
    ) {
      Alert.alert('Tienda', 'Para publicar en App Clientes, indicá un precio de venta mayor a 0.');
      return;
    }
    const preciosTienda = resolveFormPreciosTienda(form);

    setSaving(true);
    try {
      const uploadWarnings = [];
      const uploadOne = async (asset) => {
        try {
          const ext = guessExt(asset.uri, asset.mimeType);
          const { publicUrl, error } = await uploadInventarioMediaFromUri(asset.uri, {
            extension: ext,
            contentType: asset.mimeType || 'image/jpeg',
          });
          if (error) {
            uploadWarnings.push(error.message || 'Error al subir imagen');
            return null;
          }
          return publicUrl;
        } catch (e) {
          uploadWarnings.push(e?.message || 'Error al subir imagen');
          return null;
        }
      };

      const meta = buildInventarioTiendaMeta(form, { preciosVol, preciosTienda });
      const notas = mergeNotas(form.notasStaff, meta);
      const precioVentaCol =
        form.articuloTipo === 'servicio' && form.volumenTrabajoActivo
          ? form.visible_en_tienda
            ? null
            : precioVentaReferencia(meta, preciosVol.medio)
          : preciosTienda.precioVentaPublicado || null;

      const payload = {
        nombre: form.nombre.trim(),
        categoria:
          form.articuloTipo === 'servicio'
            ? normalizeServicioCategoria(form.categoria)
            : form.categoria.trim() || null,
        barcode: form.barcode.trim() || null,
        precio_venta: precioVentaCol,
        precio_costo: null,
        stock_actual: Math.max(0, Math.floor(parseNum(form.stock_actual))),
        stock_minimo: Math.max(0, Math.floor(parseNum(form.stock_minimo))),
        es_consumible: !!form.es_consumible,
        fecha_vencimiento: esFormServicio ? null : fechaVenc.value,
        ubicacion: form.ubicacion.trim() || null,
        descripcion_tienda: form.descripcion_tienda.trim() || null,
        visible_en_tienda: esFormServicio ? false : !!form.visible_en_tienda,
        notas,
        imagen_url: form.remoteMain || null,
        imagenes_urls: form.remoteGallery.filter(Boolean).slice(0, MAX_GALERIA),
      };

      let rowId = form.id;
      if (form.id) {
        const { error } = await db.inventario.update(form.id, payload);
        if (error) throw error;
      } else {
        const { data, error } = await db.inventario.create(payload);
        if (error) throw error;
        rowId = data?.id;
      }

      let imagen_url = payload.imagen_url;
      if (form.localMain?.uri) {
        const url = await uploadOne(form.localMain);
        if (url) imagen_url = url;
      }

      const galleryUrls = [...payload.imagenes_urls];
      for (const a of form.localGallery) {
        if (a?.uri) {
          const url = await uploadOne(a);
          if (url) galleryUrls.push(url);
        }
      }
      const imagenes_urls = galleryUrls.filter(Boolean).slice(0, MAX_GALERIA);

      const hasNewPhotos =
        imagen_url !== payload.imagen_url ||
        imagenes_urls.length !== payload.imagenes_urls.length ||
        imagenes_urls.some((u, i) => u !== payload.imagenes_urls[i]);

      if (hasNewPhotos && rowId) {
        const { error: imgErr } = await db.inventario.update(rowId, { imagen_url, imagenes_urls });
        if (imgErr) uploadWarnings.push(imgErr.message || 'No se pudieron guardar las URLs de fotos');
      }

      if (meta.articuloTipo === 'servicio') {
        const { error: syncErr, skipped } = await db.servicios.syncFromInventario({
          nombre: payload.nombre,
          precio_venta: payload.precio_venta,
          notas: payload.notas,
        });
        if (syncErr && !skipped) {
          Alert.alert(
            'Guardado con aviso',
            `El artículo quedó en inventario, pero no se pudo sincronizar con la agenda: ${syncErr.message || syncErr}`,
          );
        }
      }

      setModalOpen(false);
      setForm(emptyForm());
      load();
      if (uploadWarnings.length) {
        Alert.alert(
          'Artículo guardado',
          `Los datos quedaron en inventario, pero ${uploadWarnings.length} foto(s) no se subieron a Storage.\n\nCreá el bucket "inventario" en Supabase y políticas para admin, o guardá sin fotos nuevas.\n\n${uploadWarnings[0]}`,
        );
      } else {
        Alert.alert(
          'Listo',
          form.id
            ? 'Artículo actualizado.'
            : `Artículo creado.${
                form.visible_en_tienda
                  ? parseNum(form.stock_actual) <= 0
                    ? '\n\nVisible en tienda: sí. Con stock 0 el cliente lo verá como sin stock.'
                    : '\n\nYa debería aparecer en Tienda (App Clientes).'
                  : '\n\nPara que aparezca en Tienda, activá «Visible en tienda (clientes)».'
              }`,
        );
      }
    } catch (e) {
      const msg =
        e?.message ||
        (typeof e === 'string' ? e : null) ||
        'Error al guardar';
      Alert.alert(
        'Guardar',
        `${msg}\n\nSi el artículo no aparece: revisá conexión y permisos RLS en inventario.\nSi solo fallan fotos: Supabase → Storage → bucket "inventario" (público) + políticas para admin.`,
      );
    } finally {
      setSaving(false);
    }
  };

  const addPersonIconColor = c.foreground;

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar artículos',
      `¿Eliminar ${sel.count} artículo(s)? Copia en Basurero.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            let ok = 0;
            const errs = [];
            for (const id of sel.selectedIds) {
              const row = items.find((x) => String(x.id) === String(id));
              if (!row) continue;
              const r = await deleteRowWithBasurero('inventario', row, () => db.inventario.delete(row.id));
              if (r.ok) ok += 1;
              else errs.push(r.error);
            }
            sel.exitSelectMode();
            await load();
            setDeleteBusy(false);
            if (errs.length) Alert.alert('Parcial', `Eliminados: ${ok}. Fallos: ${errs.length}.`);
            else Alert.alert('Listo', ok === 1 ? 'Artículo eliminado.' : `Se eliminaron ${ok}.`);
          },
        },
      ],
    );
  };

  const rightAction = (
    <TouchableOpacity
      onPress={openNew}
      style={[styles.addPersonCircle, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      hitSlop={12}
      accessibilityLabel={stockOnlyMode ? 'Nuevo stock' : 'Nuevo artículo'}
      activeOpacity={0.85}
    >
      <Plus size={22} color={addPersonIconColor} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Inventario"
        subtitle={
          stockOnlyMode
            ? 'Catálogo de matriz (solo lectura). Podés ingresar stock local con «Nuevo stock».'
            : 'Perfil tipo tienda (App Clientes): precio, galería, envío, valoraciones y publicación.'
        }
        onBack={onBack}
        bottomPadding={0}
        disableBodyScroll
        edgeToEdge
        rightAction={rightAction}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.invHeaderPad}>
          <SalonSearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar nombre, categoría, código, servicio…"
            accessibilityLabel="Buscar en inventario"
          />

          <View style={styles.invToolbar}>
            <Text style={[styles.invToolbarMeta, { color: c.foregroundMuted }]}>
              {filtered.length} artículo{filtered.length === 1 ? '' : 's'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {!stockOnlyMode ? (
                <>
                  <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
                  <Text style={{ color: c.foregroundSubtle, fontSize: 13 }}> · </Text>
                </>
              ) : null}
              <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)}>
                <Text style={[styles.invToolbarLink, { color: c.primary }]}>Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[subStyles.muted, { fontSize: 12, lineHeight: 17, marginBottom: spacing.md }]} numberOfLines={2}>
            {inventarioFiltroResumen}
          </Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
          ) : (
            <FlatList
              key={`inv-grid-${gridCols}`}
              data={gridRows}
              keyExtractor={(row, idx) => `row-${idx}-${row[0]?.id ?? 'e'}`}
              refreshControl={refreshControl}
              contentContainerStyle={{
                paddingHorizontal: GRID_H_PAD,
                paddingBottom: sel.count ? 100 : padBottom,
              }}
              renderItem={({ item: row }) => (
                <View style={styles.gridRow}>
                  {row.map((a) => {
                    const picked = sel.isSelected(a.id);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        activeOpacity={0.9}
                        style={{ width: cardW, position: 'relative' }}
                        onLongPress={() => {
                          if (!sel.active) sel.setActive(true);
                          sel.toggleId(a.id);
                        }}
                      >
                        {sel.active ? (
                          <View
                            style={[
                              styles.gridCheck,
                              {
                                borderColor: picked ? c.primary : c.cardBorder,
                                backgroundColor: picked ? c.primary : c.card,
                              },
                            ]}
                          >
                            {picked ? <Check size={12} color={isDark ? '#141414' : '#fff'} strokeWidth={3} /> : null}
                          </View>
                        ) : null}
                        <TiendaProductCard
                          width={cardW}
                          product={rowToTiendaCard(a)}
                          onPress={() => {
                            if (sel.active) sel.toggleId(a.id);
                            else openEdit(a);
                          }}
                          colors={c}
                          isDark={isDark}
                          compact
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              ListEmptyComponent={
                <Text style={[subStyles.muted, { paddingHorizontal: spacing.sm }]}>
                  No hay artículos. Tocá + para crear el primero.
                </Text>
              }
            />
          )}
        </View>
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
      </SubScreenChrome>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeArticleModal}>
        <View style={[styles.modalShell, { backgroundColor: c.background }]}>
        <View style={[styles.modalHead, { borderBottomColor: c.cardBorder, paddingTop: insets.top + spacing.sm }]}>
          <Text style={[styles.modalTitle, { color: c.foreground }]}>
            {form.id ? 'Editar artículo' : isNuevoStock ? 'Nuevo stock' : 'Nuevo artículo'}
          </Text>
          <TouchableOpacity onPress={closeArticleModal} hitSlop={12}>
            <X size={24} color={c.foreground} />
          </TouchableOpacity>
        </View>

        {!form.id && !stockOnlyMode ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
            <Text style={[subStyles.rowLabel, { marginBottom: spacing.sm }]}>Tipo</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'producto', label: 'Producto' },
                { id: 'servicio', label: 'Servicio' },
                { id: 'nuevo_stock', label: 'Nuevo stock' },
              ].map((opt) => {
                const on = form.articuloTipo === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => {
                      if (opt.id === 'nuevo_stock') {
                        setForm((f) => ({ ...f, articuloTipo: 'nuevo_stock' }));
                        resetStockFlow();
                        return;
                      }
                      setForm((f) => ({
                        ...f,
                        articuloTipo: opt.id,
                        volumenTrabajoActivo: opt.id === 'servicio' ? f.volumenTrabajoActivo : false,
                        categoria:
                          opt.id === 'servicio' && !String(f.categoria || '').trim()
                            ? 'Otro'
                            : f.categoria,
                        visible_en_tienda: opt.id === 'servicio' ? false : f.visible_en_tienda,
                      }));
                      resetStockFlow();
                    }}
                  >
                    <Text style={{ color: on ? c.primary : c.foreground, fontFamily: typography.fontSansMedium }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {isNuevoStock ? (
          <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
            {stockOnlyMode ? (
              <View style={{ flex: 1, justifyContent: 'center', paddingBottom: padBottom }}>
                <Text style={[subStyles.muted, { textAlign: 'center', marginBottom: spacing.lg }]}>
                  Escaneá el código QR que generó matriz con los productos, cantidades, lote y fecha. El stock se sumará
                  automáticamente a esta sucursal.
                </Text>
                <SalonButton
                  title={stockSaving ? 'Importando…' : 'Escanear código QR'}
                  variant="heroGold"
                  fullWidth
                  loading={stockSaving}
                  onPress={() => setShowStockScanModal(true)}
                  style={{ marginBottom: spacing.md }}
                />
              </View>
            ) : (
              <>
                <SalonSearchBar
                  value={stockQuery}
                  onChangeText={setStockQuery}
                  placeholder="Buscar producto por nombre, categoría o código…"
                  accessibilityLabel="Buscar producto para ingreso de stock"
                />
                <View style={styles.stockToolbar}>
                  <Text style={[styles.stockToolbarMeta, { color: c.foregroundMuted }]}>
                    {stockProducts.length} producto{stockProducts.length === 1 ? '' : 's'}
                    {stockSelectedCount > 0 ? ` · ${stockSelectedCount} seleccionado${stockSelectedCount === 1 ? '' : 's'}` : ''}
                  </Text>
                  <View style={styles.stockToolbarActions}>
                    {stockSelectedCount > 0 ? (
                      <>
                        <TouchableOpacity hitSlop={12} onPress={() => setShowSucursalPicker(true)}>
                          <Text style={[styles.invToolbarLink, { color: c.primary }]} numberOfLines={1}>
                            {stockTargetSucursal ? stockTargetSucursal.nombre : 'Sucursal'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity hitSlop={12} onPress={handleGenerateStockQr}>
                          <Text style={[styles.invToolbarLink, { color: c.primary }]}>Generar QR</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity hitSlop={12} onPress={() => setModalStockFiltros(true)}>
                        <Text style={[styles.invToolbarLink, { color: c.primary }]}>Filtros</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={[styles.stockFiltroResumen, { color: c.foregroundSubtle }]} numberOfLines={1}>
                  {stockFiltroResumen}
                </Text>
                {stockSelectedCount > 0 ? (
                  <View style={[styles.stockBatchMeta, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                    <Field label="Número de lote *" c={c}>
                      <TextInput
                        style={[styles.inp, styles.inpCompact, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.background }]}
                        value={stockBatchMeta.numero_lote}
                        onChangeText={(t) => setStockBatchMeta((f) => ({ ...f, numero_lote: t }))}
                        placeholder="Ej. L-2026-0042"
                        placeholderTextColor={c.foregroundSubtle}
                        autoCapitalize="characters"
                      />
                    </Field>
                    <Field label="Fecha de ingreso *" c={c}>
                      <VerticalDatePicker
                        value={stockBatchMeta.fecha_ingreso}
                        onChange={(d) => setStockBatchMeta((f) => ({ ...f, fecha_ingreso: d }))}
                        colors={c}
                      />
                    </Field>
                  </View>
                ) : null}
                <View style={[styles.stockListShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                  <FlatList
                    data={stockProducts}
                    keyExtractor={(item) => String(item.id)}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                      paddingBottom: padBottom + spacing.lg,
                      flexGrow: stockProducts.length === 0 ? 1 : 0,
                    }}
                    renderItem={({ item }) => {
                      const id = String(item.id);
                      const selected = stockSelected[id] != null;
                      const qty = selected ? Math.max(1, Math.floor(Number(stockSelected[id] || 1))) : 1;
                      const st = Number(item.stock_actual ?? 0);
                      const min = Number(item.stock_minimo ?? 0);
                      const sub = [
                        item.categoria,
                        item.barcode ? `Cód. ${item.barcode}` : null,
                        `Stock ${st}${min > 0 ? ` · mín. ${min}` : ''}`,
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <View
                          style={[
                            styles.stockRow,
                            { borderBottomColor: c.cardBorder },
                            selected ? { backgroundColor: c.surfaceMuted } : null,
                          ]}
                        >
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={styles.stockRowMain}
                            onPress={() => toggleStockProduct(item.id)}
                          >
                            <View
                              style={[
                                styles.stockCheck,
                                {
                                  borderColor: selected ? c.primary : c.cardBorder,
                                  backgroundColor: selected ? c.primary : 'transparent',
                                },
                              ]}
                            >
                              {selected ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                            </View>
                            <View style={styles.stockRowBody}>
                              <Text style={[styles.stockRowName, { color: c.foreground }]} numberOfLines={1}>
                                {item.nombre || 'Sin nombre'}
                              </Text>
                              <Text style={[styles.stockRowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
                                {sub || '—'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          {selected ? (
                            <View style={styles.stockQtyRow}>
                              <TouchableOpacity
                                style={[styles.stockQtyBtn, { borderColor: c.cardBorder }]}
                                onPress={() => adjustStockQty(item.id, -1)}
                                hitSlop={8}
                              >
                                <Minus size={14} color={c.foreground} />
                              </TouchableOpacity>
                              <TextInput
                                style={[styles.stockQtyIn, { borderColor: c.cardBorder, color: c.foreground }]}
                                value={String(qty)}
                                onChangeText={(t) => setStockQtyText(item.id, t)}
                                keyboardType="number-pad"
                                maxLength={5}
                              />
                              <TouchableOpacity
                                style={[styles.stockQtyBtn, { borderColor: c.cardBorder }]}
                                onPress={() => adjustStockQty(item.id, 1)}
                                hitSlop={8}
                              >
                                <Plus size={14} color={c.foreground} />
                              </TouchableOpacity>
                            </View>
                          ) : null}
                        </View>
                      );
                    }}
                    ListEmptyComponent={
                      <Text style={[subStyles.muted, { padding: spacing.md, textAlign: 'center' }]}>
                        No hay productos. Creá uno con tipo «Producto» primero.
                      </Text>
                    }
                  />
                </View>
                {stockSelectedCount > 0 ? (
                  <SalonButton
                    title="Generar código QR"
                    variant="heroGold"
                    fullWidth
                    onPress={handleGenerateStockQr}
                    style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
                  />
                ) : null}
              </>
            )}
          </View>
        ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: padBottom + 80 }}
        >
          {!form.id ? (
            <Text style={[subStyles.rowLabel, { marginBottom: spacing.sm }]}>Datos del artículo</Text>
          ) : null}

          {form.id ? (
            <>
              <Text style={[subStyles.rowLabel, { marginBottom: spacing.sm }]}>Tipo</Text>
              <View style={styles.chipRow}>
                {[
                  { id: 'producto', label: 'Producto' },
                  { id: 'servicio', label: 'Servicio' },
                ].map((opt) => {
                  const on = form.articuloTipo === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.chip,
                        { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                      ]}
                      onPress={() =>
                        setForm((f) => ({
                          ...f,
                          articuloTipo: opt.id,
                          volumenTrabajoActivo: opt.id === 'servicio' ? f.volumenTrabajoActivo : false,
                          categoria:
                            opt.id === 'servicio' && !String(f.categoria || '').trim()
                              ? 'Otro'
                              : f.categoria,
                          visible_en_tienda: opt.id === 'servicio' ? false : f.visible_en_tienda,
                        }))
                      }
                    >
                      <Text style={{ color: on ? c.primary : c.foreground, fontFamily: typography.fontSansMedium }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          <Field label="Nombre (título en tienda) *" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.nombre}
              onChangeText={(t) => setForm((f) => ({ ...f, nombre: t }))}
              placeholder="Ej. Kit keratina 250 ml"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          {esFormServicio ? (
            <Field label="Categoría del servicio *" c={c}>
              <TouchableOpacity
                style={[styles.inp, styles.dateTouch, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                onPress={() => setCategoriaPickerOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={{ color: c.foreground, fontFamily: typography.fontSans }}>
                  {normalizeServicioCategoria(form.categoria)}
                </Text>
                <ChevronRight size={18} color={c.foregroundSubtle} style={{ position: 'absolute', right: 12 }} />
              </TouchableOpacity>
            </Field>
          ) : (
            <Field label="Línea / marca (texto pequeño en tarjeta)" c={c}>
              <TextInput
                style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                value={form.categoria}
                onChangeText={(t) => setForm((f) => ({ ...f, categoria: t }))}
                placeholder="Ej. Keraplús · Profesional"
                placeholderTextColor={c.foregroundSubtle}
              />
            </Field>
          )}
          <Field label="SKU / código de barras" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.barcode}
              onChangeText={(t) => setForm((f) => ({ ...f, barcode: t }))}
              placeholder="Opcional"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>

          {form.articuloTipo === 'servicio' && form.volumenTrabajoActivo ? null : (
            <Field
              label={
                form.promocionActiva
                  ? form.articuloTipo === 'servicio'
                    ? 'Precio venta normal (GTQ) *'
                    : 'Precio venta normal (Q) *'
                  : form.articuloTipo === 'servicio'
                    ? 'Precio venta (GTQ) *'
                    : 'Precio venta (Q) *'
              }
              c={c}
            >
              <PrecioGtqInput
                c={c}
                value={form.precio_venta}
                onChangeText={(t) => setForm((f) => ({ ...f, precio_venta: t }))}
              />
            </Field>
          )}

          {form.articuloTipo === 'servicio' && form.volumenTrabajoActivo ? null : (
            <Field
              label={
                form.promocionActiva
                  ? esFormServicio
                    ? 'Precio tachado normal (Q, opcional)'
                    : 'Precio tachado normal en tienda (Q, opcional)'
                  : esFormServicio
                    ? 'Precio tachado (Q, opcional)'
                    : 'Precio tachado en tienda (Q, opcional)'
              }
              c={c}
            >
              <PrecioGtqInput
                c={c}
                value={form.precio_regular_tienda}
                onChangeText={(t) => setForm((f) => ({ ...f, precio_regular_tienda: t }))}
                placeholder="Ej. 600"
              />
            </Field>
          )}
          {!esFormServicio ? (
            <Text style={[subStyles.muted, { fontSize: 12, marginBottom: spacing.md }]}>
              {form.promocionActiva
                ? 'Precios normales: se restauran al desactivar la promoción. En App Clientes se muestran solo mientras la promo esté apagada.'
                : 'Si es mayor al precio de venta, se muestra tachado en App Clientes. Vacío: costo o referencia automática.'}
            </Text>
          ) : null}

          {!stockOnlyMode ? (
            <View style={[styles.switchRow, { marginBottom: spacing.md }]}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={{ color: c.foreground, fontFamily: typography.fontSansMedium, fontSize: 14 }}>
                  Promoción
                </Text>
                <Text style={{ color: c.foregroundMuted, fontFamily: typography.fontSans, fontSize: 12, marginTop: 4 }}>
                  {form.promocionActiva
                    ? `Precio promo ${INVENTARIO_PROMO_DIAS_DEFAULT} días · vence ${formatPromocionHastaLabel(form.promocion_hasta)}. Completá precio promoción y guardá.${
                        form.id ? ' Al desactivar se restaura el precio normal.' : ''
                      }`
                    : `Activala para publicar precio promo ${INVENTARIO_PROMO_DIAS_DEFAULT} días en App Clientes.${
                        form.id ? ' Al activar aparecen campos de precio promo.' : ' Guardá el artículo para aplicar la promo.'
                      }`}
                </Text>
              </View>
              <Switch
                value={!!form.promocionActiva}
                onValueChange={onPromocionToggle}
                disabled={promoSaving || saving}
                trackColor={{ false: c.cardBorder, true: `${c.primary}88` }}
                thumbColor={form.promocionActiva ? c.primary : c.foregroundSubtle}
              />
            </View>
          ) : null}

          {form.promocionActiva && !(form.articuloTipo === 'servicio' && form.volumenTrabajoActivo) ? (
            <>
              <Field
                label={form.articuloTipo === 'servicio' ? 'Precio promoción (GTQ) *' : 'Precio promoción (Q) *'}
                c={c}
              >
                <PrecioGtqInput
                  c={c}
                  value={form.precio_promo}
                  onChangeText={(t) => setForm((f) => ({ ...f, precio_promo: t }))}
                />
              </Field>
              <Field
                label={
                  esFormServicio
                    ? 'Precio tachado promoción (Q, opcional)'
                    : 'Precio tachado promoción en tienda (Q, opcional)'
                }
                c={c}
              >
                <PrecioGtqInput
                  c={c}
                  value={form.precio_tachado_promo}
                  onChangeText={(t) => setForm((f) => ({ ...f, precio_tachado_promo: t }))}
                  placeholder="Ej. 600"
                />
              </Field>
              {!esFormServicio ? (
                <Text style={[subStyles.muted, { fontSize: 12, marginBottom: spacing.md }]}>
                  Estos precios se muestran en App Clientes mientras la promoción esté activa.
                </Text>
              ) : null}
            </>
          ) : null}

          {form.articuloTipo === 'servicio' ? (
            <>
              <Field label="Duración en agenda" c={c}>
                <TextInput
                  style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={form.duracion_agenda}
                  onChangeText={(t) => setForm((f) => ({ ...f, duracion_agenda: t }))}
                  placeholder="Ej. 60 min, 1 hora, media mañana"
                  placeholderTextColor={c.foregroundSubtle}
                />
              </Field>
              <Field label="Texto en tarjeta Mis citas (una línea)" c={c}>
                <TextInput
                  style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={form.hintTarjeta}
                  onChangeText={(t) => setForm((f) => ({ ...f, hintTarjeta: t }))}
                  placeholder="Ej. Según volumen de cabello · coordiná en salón"
                  placeholderTextColor={c.foregroundSubtle}
                />
              </Field>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={{ color: c.foreground, fontFamily: typography.fontSansMedium, fontSize: 14 }}>
                    Volumen de trabajo
                  </Text>
                  <Text style={{ color: c.foregroundMuted, fontFamily: typography.fontSans, fontSize: 12, marginTop: 4 }}>
                    Cuatro precios en GTQ; en Vender el cajero elige el nivel al cobrar.
                  </Text>
                </View>
                <Switch
                  value={form.volumenTrabajoActivo}
                  onValueChange={(v) => setForm((f) => ({ ...f, volumenTrabajoActivo: v }))}
                  trackColor={{ false: c.cardBorder, true: `${c.primary}88` }}
                  thumbColor={form.volumenTrabajoActivo ? c.primary : c.foregroundSubtle}
                />
              </View>

              {form.volumenTrabajoActivo ? (
                <>
                  <Text style={[subStyles.rowLabel, { marginTop: spacing.sm, marginBottom: spacing.xs }]}>
                    Precios por volumen (GTQ) *
                  </Text>
                  <Text style={[subStyles.muted, { fontSize: 12, marginBottom: spacing.sm }]}>
                    En Vender el cajero elige Corto, Medio, Largo o Muy largo al agregar este servicio.
                  </Text>
                  <View style={styles.row2}>
                    {VOLUMEN_TRABAJO_OPCIONES.slice(0, 2).map((opt) => (
                      <View key={opt.id} style={{ flex: 1 }}>
                        <Field label={opt.label} c={c}>
                          <PrecioGtqInput
                            c={c}
                            value={form.preciosPorVolumen[opt.id]}
                            onChangeText={(t) =>
                              setForm((f) => ({
                                ...f,
                                preciosPorVolumen: { ...f.preciosPorVolumen, [opt.id]: t },
                              }))
                            }
                          />
                        </Field>
                      </View>
                    ))}
                  </View>
                  <View style={styles.row2}>
                    {VOLUMEN_TRABAJO_OPCIONES.slice(2).map((opt) => (
                      <View key={opt.id} style={{ flex: 1 }}>
                        <Field label={opt.label} c={c}>
                          <PrecioGtqInput
                            c={c}
                            value={form.preciosPorVolumen[opt.id]}
                            onChangeText={(t) =>
                              setForm((f) => ({
                                ...f,
                                preciosPorVolumen: { ...f.preciosPorVolumen, [opt.id]: t },
                              }))
                            }
                          />
                        </Field>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Stock actual" c={c}>
                <TextInput
                  style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={form.stock_actual}
                  onChangeText={(t) => setForm((f) => ({ ...f, stock_actual: t }))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={c.foregroundSubtle}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Stock mínimo" c={c}>
                <TextInput
                  style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={form.stock_minimo}
                  onChangeText={(t) => setForm((f) => ({ ...f, stock_minimo: t }))}
                  keyboardType="number-pad"
                  placeholder="5"
                  placeholderTextColor={c.foregroundSubtle}
                />
              </Field>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={{ color: c.foreground, fontFamily: typography.fontSans }}>Consumible / insumo</Text>
            <Switch
              value={form.es_consumible}
              onValueChange={(v) => setForm((f) => ({ ...f, es_consumible: v }))}
              trackColor={{ false: c.cardBorder, true: `${c.primary}88` }}
              thumbColor={form.es_consumible ? c.primary : c.foregroundSubtle}
            />
          </View>
          {!esFormServicio ? (
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={{ color: c.foreground, fontFamily: typography.fontSans }}>
                  Visible en tienda (clientes)
                </Text>
              </View>
              <Switch
                value={form.visible_en_tienda}
                onValueChange={(v) => setForm((f) => ({ ...f, visible_en_tienda: v }))}
                trackColor={{ false: c.cardBorder, true: `${c.primary}88` }}
                thumbColor={form.visible_en_tienda ? c.primary : c.foregroundSubtle}
              />
            </View>
          ) : (
            <Text style={[subStyles.muted, { fontSize: 12, marginBottom: spacing.md }]}>
              Los servicios se publican solo en Mis citas (App Clientes), no en la tienda.
              {form.volumenTrabajoActivo
                ? ' En la app verán «Precio variable»; los 4 precios se usan en Vender.'
                : ''}
            </Text>
          )}

          {!esFormServicio ? (
            <Field label="Fecha vencimiento (AAAA-MM-DD)" c={c}>
              <TextInput
                style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                value={form.fecha_vencimiento}
                onChangeText={(t) => setForm((f) => ({ ...f, fecha_vencimiento: t }))}
                placeholder="Opcional · ej. 2026-12-31"
                placeholderTextColor={c.foregroundSubtle}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
          ) : null}
          <Field label="Ubicación en salón" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.ubicacion}
              onChangeText={(t) => setForm((f) => ({ ...f, ubicacion: t }))}
              placeholder="Estante, vitrina…"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>

          <Field
            label={esFormServicio ? 'Descripción (ficha Mis citas)' : 'Descripción larga (ficha tienda)'}
            c={c}
          >
            <TextInput
              style={[styles.inp, styles.area, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.descripcion_tienda}
              onChangeText={(t) => setForm((f) => ({ ...f, descripcion_tienda: t }))}
              multiline
              textAlignVertical="top"
              placeholder={
                esFormServicio ? 'Detalle del servicio para el cliente…' : 'Ingredientes, uso, advertencias…'
              }
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>

          <Text style={[subStyles.rowLabel, { marginTop: spacing.md }]}>
            {esFormServicio ? 'Ficha Mis citas (App Clientes)' : 'Ficha tienda (como en App Clientes)'}
          </Text>
          <Field label="Insignia en foto (ej. Más vendido)" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.badge}
              onChangeText={(t) => setForm((f) => ({ ...f, badge: t }))}
              placeholder={form.promocionActiva ? 'Promo' : undefined}
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          {form.promocionActiva ? (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[subStyles.muted, { fontSize: 12, marginBottom: spacing.xs }]}>
                Vista en foto (promoción activa):
              </Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: isDark ? '#66BB6A' : '#43A047',
                  borderWidth: 1.5,
                  borderColor: isDark ? '#C8E6C9' : '#A5D6A7',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  ...Platform.select({
                    ios: {
                      shadowColor: '#1B5E20',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.45,
                      shadowRadius: 4,
                    },
                    android: { elevation: 4 },
                    default: {},
                  }),
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontFamily: typography.fontSansMedium,
                    fontSize: 12,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}
                  numberOfLines={1}
                >
                  {form.badge.trim() || 'Promo'}
                </Text>
              </View>
            </View>
          ) : null}
          {!esFormServicio ? (
            <Field label="Texto envío / retiro (una línea bajo estrellas)" c={c}>
              <TextInput
                style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                value={form.shippingLabel}
                onChangeText={(t) => setForm((f) => ({ ...f, shippingLabel: t }))}
                placeholderTextColor={c.foregroundSubtle}
              />
            </Field>
          ) : null}
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Valoración (0–5)" c={c}>
                <TextInput
                  style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={form.rating}
                  onChangeText={(t) => setForm((f) => ({ ...f, rating: t }))}
                  keyboardType="decimal-pad"
                  placeholderTextColor={c.foregroundSubtle}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Nº reseñas" c={c}>
                <TextInput
                  style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={form.reviewCount}
                  onChangeText={(t) => setForm((f) => ({ ...f, reviewCount: t }))}
                  keyboardType="number-pad"
                  placeholderTextColor={c.foregroundSubtle}
                />
              </Field>
            </View>
          </View>

          <Field label="Notas internas (salón, sin JSON)" c={c}>
            <TextInput
              style={[styles.inp, styles.area, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.notasStaff}
              onChangeText={(t) => setForm((f) => ({ ...f, notasStaff: t }))}
              multiline
              textAlignVertical="top"
              placeholder="Proveedor, lote, uso interno…"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>

          <Text style={[subStyles.rowLabel, { marginTop: spacing.md }]}>Imágenes</Text>
          <Text style={[subStyles.muted, { fontSize: 12, marginBottom: spacing.sm }]}>
            Primera imagen = portada; hasta {MAX_GALERIA} adicionales en carrusel
            {esFormServicio ? ' en Mis citas.' : ' en la ficha de tienda.'}
          </Text>
          <SalonButton title="Portada (principal)" variant="outlineGray" onPress={pickMain} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            {form.localMain?.uri ? (
              <View>
                <Image source={{ uri: form.localMain.uri }} style={styles.thumb} />
                <TouchableOpacity onPress={clearLocalMain} style={styles.thumbX}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : form.remoteMain ? (
              <View>
                <Image source={{ uri: form.remoteMain }} style={styles.thumb} />
                <TouchableOpacity onPress={removeRemoteMain} style={styles.thumbX}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <SalonButton
            title="Galería (más fotos)"
            variant="outlineGray"
            style={{ marginTop: spacing.sm }}
            onPress={pickGallery}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            {form.remoteGallery.map((u, i) => (
              <View key={`r-${u}`}>
                <Image source={{ uri: u }} style={styles.thumb} />
                <TouchableOpacity onPress={() => removeRemoteGal(i)} style={styles.thumbX}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {form.localGallery.map((a, i) => (
              <View key={`l-${a.uri}`}>
                <Image source={{ uri: a.uri }} style={styles.thumb} />
                <TouchableOpacity onPress={() => removeLocalGal(i)} style={styles.thumbX}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <SalonButton title={saving ? 'Guardando…' : 'Guardar'} variant="heroGold" fullWidth loading={saving} onPress={save} style={{ marginTop: spacing.lg }} />
        </ScrollView>
        )}
        </View>
      </Modal>

      <Modal
        visible={categoriaPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoriaPickerOpen(false)}
      >
        <View style={styles.filterBackdrop}>
          <View
            style={[
              styles.filterSheet,
              { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets), maxHeight: '70%' },
            ]}
          >
            <View style={styles.filterHead}>
              <Text style={[styles.filterTitle, { color: c.foreground }]}>Categoría del servicio</Text>
              <TouchableOpacity onPress={() => setCategoriaPickerOpen(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {SERVICIO_CATEGORIAS.map((cat) => {
                const on = normalizeServicioCategoria(form.categoria) === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoriaPickRow,
                      { borderBottomColor: c.cardBorder, backgroundColor: on ? c.surfaceMuted : 'transparent' },
                    ]}
                    onPress={() => {
                      setForm((f) => ({ ...f, categoria: cat }));
                      setCategoriaPickerOpen(false);
                    }}
                  >
                    <Text
                      style={{
                        color: on ? c.primary : c.foreground,
                        fontFamily: on ? typography.fontSansMedium : typography.fontSans,
                        fontSize: 15,
                      }}
                    >
                      {cat}
                    </Text>
                    {on ? <Check size={18} color={c.primary} strokeWidth={2.5} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalStockFiltros} animationType="slide" transparent onRequestClose={() => setModalStockFiltros(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.filterHead}>
              <Text style={[styles.filterTitle, { color: c.foreground }]}>Filtrar productos</Text>
              <TouchableOpacity onPress={() => setModalStockFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.invFilterChipRow}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'bajo_stock', label: 'Bajo stock' },
              ].map((opt) => {
                const on = stockFilter === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setStockFilter(opt.id)}
                  >
                    <Text style={{ color: on ? c.primary : c.foreground, fontFamily: typography.fontSansMedium, fontSize: 13 }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SalonButton title="Aplicar" variant="heroGold" fullWidth onPress={() => setModalStockFiltros(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.filterHead}>
              <Text style={[styles.filterTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.filterSectionLbl, { color: c.foreground }]}>Orden</Text>
            <View style={styles.invFilterChipRow}>
              {[
                { id: 'nombre_asc', label: 'Nombre A → Z' },
                { id: 'nombre_desc', label: 'Nombre Z → A' },
                { id: 'precio_asc', label: 'Precio ↑' },
                { id: 'precio_desc', label: 'Precio ↓' },
              ].map((opt) => {
                const on = sortInv === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setSortInv(opt.id)}
                  >
                    <Text style={{ color: on ? c.primary : c.foreground, fontFamily: typography.fontSansMedium, fontSize: 13 }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.filterSectionLbl, { color: c.foreground }]}>Mostrar</Text>
            <View style={styles.invFilterChipRow}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'tienda', label: 'En tienda' },
                { id: 'bajo_stock', label: 'Bajo stock' },
                { id: 'producto', label: 'Productos' },
                { id: 'servicio', label: 'Servicios' },
              ].map((opt) => {
                const on = filterInv === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilterInv(opt.id)}
                  >
                    <Text style={{ color: on ? c.primary : c.foreground, fontFamily: typography.fontSansMedium, fontSize: 13 }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalFiltros(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showSucursalPicker} animationType="slide" transparent onRequestClose={() => setShowSucursalPicker(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.filterHead}>
              <Text style={[styles.filterTitle, { color: c.foreground }]}>Sucursal destino</Text>
              <TouchableOpacity onPress={() => setShowSucursalPicker(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {stockSucursales.length === 0 ? (
                <Text style={[subStyles.muted, { marginBottom: spacing.md }]}>
                  No hay sucursales activas. Creá una en el módulo Sucursales.
                </Text>
              ) : (
                stockSucursales.map((s) => {
                  const on = String(stockTargetSucursalId) === String(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.stockRow, { borderBottomColor: c.cardBorder }]}
                      onPress={() => {
                        setStockTargetSucursalId(s.id);
                        setShowSucursalPicker(false);
                      }}
                    >
                      <View style={styles.stockRowBody}>
                        <Text style={[styles.stockRowName, { color: c.foreground }]}>{s.nombre || s.codigo}</Text>
                        <Text style={[styles.stockRowSub, { color: c.foregroundMuted }]}>{s.codigo}</Text>
                      </View>
                      {on ? <Check size={18} color={c.primary} strokeWidth={2.5} /> : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StockTransferQrDisplayModal
        visible={showStockQrModal}
        payload={stockQrPayload}
        sucursalNombre={stockTargetSucursal?.nombre || stockTargetSucursal?.codigo}
        productLabels={stockProductLabels}
        onClose={() => {
          setShowStockQrModal(false);
          closeArticleModal();
        }}
      />

      <StockTransferQrScannerModal
        visible={showStockScanModal}
        onClose={() => setShowStockScanModal(false)}
        onPayload={handleImportStockQr}
      />
    </View>
  );
}

function PrecioGtqInput({ value, onChangeText, c, placeholder = '0' }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: c.cardBorder,
        borderRadius: radii.md,
        backgroundColor: c.card,
        minHeight: 46,
      }}
    >
      <Text
        style={{
          paddingLeft: spacing.md,
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: c.primary,
        }}
      >
        Q
      </Text>
      <TextInput
        style={{
          flex: 1,
          paddingVertical: Platform.OS === 'ios' ? 12 : 10,
          paddingHorizontal: spacing.sm,
          paddingRight: spacing.md,
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foreground,
        }}
        value={value}
        onChangeText={(t) => onChangeText(formatMontoInputLive(t))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={c.foregroundSubtle}
      />
    </View>
  );
}

function Field({ label, children, c }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: typography.fontSansMedium, fontSize: 13, color: c.foreground, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    modalShell: { flex: 1 },
    addPersonCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
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
    invToolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    invToolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    invToolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    invHeaderPad: {
      paddingHorizontal: GRID_H_PAD,
    },
    gridRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: GAP,
    },
    gridCheck: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3,
    },
    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    filterSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
    },
    filterHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    filterTitle: { fontFamily: typography.fontDisplay, fontSize: 20 },
    categoriaPickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    filterSectionLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    invFilterChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontFamily: typography.fontDisplay, fontSize: 22 },
    stockToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      marginBottom: 4,
    },
    stockToolbarMeta: { fontFamily: typography.fontSans, fontSize: 13, flex: 1, minWidth: 0 },
    stockToolbarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 0 },
    stockFiltroResumen: { fontFamily: typography.fontSans, fontSize: 11, marginBottom: spacing.sm },
    stockBatchMeta: {
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    stockListShell: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radii.lg,
      overflow: 'hidden',
      marginTop: spacing.xs,
    },
    stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
    },
    stockRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
    stockCheck: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stockQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
    stockQtyBtn: {
      width: 28,
      height: 28,
      borderRadius: radii.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stockQtyIn: {
      width: 44,
      height: 28,
      borderWidth: 1,
      borderRadius: radii.sm,
      textAlign: 'center',
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      paddingVertical: 0,
      paddingHorizontal: 4,
    },
    inpCompact: { paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 14 },
    stockRowBody: { flex: 1, minWidth: 0 },
    stockRowName: { fontFamily: typography.fontSansMedium, fontSize: 14 },
    stockRowSub: { fontFamily: typography.fontSans, fontSize: 11, lineHeight: 15, marginTop: 2 },
    dateTouch: { justifyContent: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    inp: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontFamily: typography.fontSans,
      fontSize: 15,
    },
    area: { minHeight: 100, textAlignVertical: 'top' },
    row2: { flexDirection: 'row', gap: spacing.sm },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    thumb: { width: 72, height: 72, borderRadius: radii.sm, borderWidth: 1, borderColor: c.cardBorder },
    thumbX: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 12,
      padding: 4,
    },
  });
}
