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
import { Plus, Search, Star, Truck, X, Image as ImageIcon } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  db,
  uploadInventarioMediaFromUri,
  DEFAULT_TIENDA_META,
  splitNotas,
  getArticuloTipo,
  mergeNotas,
} from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

const GAP = 6;
const GRID_COLS = 3;
const GRID_H_PAD = spacing.sm;
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

function rowToTiendaCard(row) {
  const { meta } = splitNotas(row.notas);
  const venta = Number(row.precio_venta || 0);
  const costo = Number(row.precio_costo ?? row.costo ?? 0);
  const priceLabel = formatQ(venta);
  const compareAtLabel = costo > venta && venta > 0 ? formatQ(costo) : null;
  const brandLine = String(row.categoria || (meta.articuloTipo === 'servicio' ? 'Servicio' : 'Producto')).toUpperCase();
  const stock = Number(row.stock_actual ?? 0);
  const stockHint =
    meta.articuloTipo === 'servicio'
      ? 'Servicio en salón · agenda'
      : stock > 0
        ? `En stock · ${stock} u.`
        : 'Sin stock';
  const imageUris = [row.imagen_url, ...(Array.isArray(row.imagenes_urls) ? row.imagenes_urls : [])].filter(Boolean);
  return {
    id: row.id,
    brandLine,
    title: row.nombre,
    priceLabel,
    compareAtLabel,
    badge: meta.badge?.trim() || null,
    rating: Math.min(5, Math.max(0, Number(meta.rating) || 4.5)),
    reviewCount: Math.max(0, Math.floor(Number(meta.reviewCount) || 0)),
    shippingLabel: meta.shippingLabel || 'Envío y retiro · coordinar en recepción',
    stockHint,
    imageUris,
    visibleTienda: !!row.visible_en_tienda,
    row,
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
          fill={s <= full ? STAR_GOLD : emptyColor}
          strokeWidth={0}
        />
      ))}
    </View>
  );
}

function GalleryStrip({ uris, badgeText, width, colors, compact = false }) {
  const aspect = compact ? IMAGE_ASPECT_COMPACT : IMAGE_ASPECT;
  const data = (uris || []).filter(Boolean);
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
        <Text style={[stripStyles.imageHint, compact && stripStyles.imageHintCompact]}>Imagen</Text>
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
        <View style={[stripStyles.badge, compact && stripStyles.badgeCompact]}>
          <Text style={[stripStyles.badgeTxt, compact && stripStyles.badgeTxtCompact]} numberOfLines={1}>
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
    color: '#888',
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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
        },
        body: { padding: compact ? 6 : spacing.sm },
        brandLine: {
          fontFamily: typography.fontSans,
          fontSize: compact ? 8 : 10,
          color: colors.foregroundMuted,
          marginBottom: compact ? 2 : 4,
          letterSpacing: compact ? 0.3 : 0.6,
        },
        title: {
          fontFamily: typography.fontSansMedium,
          fontSize: compact ? 11 : 13,
          lineHeight: compact ? 14 : 17,
          color: colors.foreground,
          marginBottom: compact ? 4 : spacing.sm,
          minHeight: compact ? 28 : 34,
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
          fontSize: compact ? 9 : 12,
          color: colors.foregroundMuted,
          textDecorationLine: 'line-through',
        },
        priceLive: {
          fontFamily: typography.fontSansMedium,
          fontSize: compact ? 12 : 16,
          color: colors.foreground,
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
          fontSize: compact ? 9 : 11,
          color: colors.foreground,
        },
        ratingTxt: {
          fontFamily: typography.fontSans,
          fontSize: compact ? 9 : 11,
          color: colors.foregroundMuted,
        },
        shipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
        shipTxt: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: 10,
          color: colors.foregroundMuted,
          lineHeight: 14,
        },
        stockHint: {
          marginTop: compact ? 3 : 6,
          fontFamily: typography.fontSans,
          fontSize: compact ? 9 : 10,
          color: colors.primary,
        },
        tiendaTag: {
          alignSelf: 'flex-start',
          marginTop: compact ? 4 : 6,
          paddingHorizontal: compact ? 5 : 8,
          paddingVertical: compact ? 2 : 3,
          borderRadius: compact ? 4 : 6,
          backgroundColor: product.visibleTienda ? 'rgba(46,125,50,0.12)' : 'rgba(0,0,0,0.06)',
        },
        tiendaTagTxt: {
          fontSize: compact ? 8 : 10,
          fontFamily: typography.fontSansMedium,
          color: product.visibleTienda ? '#2E7D32' : colors.foregroundMuted,
        },
      }),
    [colors, compact, product.visibleTienda],
  );

  return (
    <TouchableOpacity style={[styles.card, { width }]} onPress={onPress} activeOpacity={0.92}>
      <GalleryStrip
        uris={product.imageUris}
        badgeText={product.badge}
        width={width}
        colors={colors}
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
          {!compact && product.compareAtLabel ? (
            <Text style={styles.compareAt}>{product.compareAtLabel}</Text>
          ) : null}
          <Text style={styles.priceLive}>{product.priceLabel}</Text>
        </View>
        <View style={styles.ratingRow}>
          <RatingStars rating={product.rating} emptyColor={emptyStar} size={compact ? 8 : 12} />
          <Text style={styles.ratingNum}>{product.rating.toFixed(1)}</Text>
          {!compact ? <Text style={styles.ratingTxt}>({product.reviewCount})</Text> : null}
        </View>
        {!compact ? (
          <View style={styles.shipRow}>
            <Truck size={12} color={colors.foregroundMuted} strokeWidth={2} />
            <Text style={styles.shipTxt} numberOfLines={2}>
              {product.shippingLabel}
            </Text>
          </View>
        ) : null}
        {product.stockHint ? (
          <Text style={styles.stockHint} numberOfLines={1}>
            {compact
              ? product.stockHint.replace('En stock · ', '').replace('Servicio en salón · agenda', 'Servicio')
              : product.stockHint}
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
  precio_costo: '',
  stock_actual: '',
  stock_minimo: '5',
  es_consumible: false,
  fecha_vencimiento: '',
  ubicacion: '',
  descripcion_tienda: '',
  visible_en_tienda: false,
  notasStaff: '',
  badge: '',
  shippingLabel: DEFAULT_TIENDA_META.shippingLabel,
  rating: '4.5',
  reviewCount: '0',
  articuloTipo: 'producto',
  duracion_minutos: '60',
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
  const [form, setForm] = useState(emptyForm);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortInv, setSortInv] = useState('nombre_asc');
  const [filterInv, setFilterInv] = useState('todos');

  const cardW = (winW - GRID_H_PAD * 2 - GAP * (GRID_COLS - 1)) / GRID_COLS;

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.inventario.getAll();
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      Alert.alert('Inventario', e?.message || 'No se pudo cargar.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    for (let i = 0; i < filtered.length; i += GRID_COLS) {
      out.push(filtered.slice(i, i + GRID_COLS));
    }
    return out;
  }, [filtered]);

  const openNew = () => {
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    const { staff, meta } = splitNotas(row.notas);
    const imgs = [row.imagen_url, ...(Array.isArray(row.imagenes_urls) ? row.imagenes_urls : [])].filter(Boolean);
    const main = imgs[0] || '';
    const rest = imgs.slice(1, 1 + MAX_GALERIA);
    setForm({
      id: row.id,
      nombre: row.nombre || '',
      categoria: row.categoria || '',
      barcode: row.barcode || '',
      precio_venta: row.precio_venta != null ? String(row.precio_venta) : '',
      precio_costo: row.precio_costo != null ? String(row.precio_costo) : row.costo != null ? String(row.costo) : '',
      stock_actual: String(row.stock_actual ?? 0),
      stock_minimo: String(row.stock_minimo ?? 5),
      es_consumible: !!row.es_consumible,
      fecha_vencimiento: row.fecha_vencimiento || '',
      ubicacion: row.ubicacion || '',
      descripcion_tienda: row.descripcion_tienda || '',
      visible_en_tienda: !!row.visible_en_tienda,
      notasStaff: staff,
      badge: meta.badge || '',
      shippingLabel: meta.shippingLabel || DEFAULT_TIENDA_META.shippingLabel,
      rating: String(meta.rating ?? 4.5),
      reviewCount: String(meta.reviewCount ?? 0),
      articuloTipo: meta.articuloTipo || 'producto',
      duracion_minutos: String(meta.duracion_minutos ?? 60),
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

  const save = async () => {
    if (!form.nombre.trim()) {
      Alert.alert('Nombre', 'El nombre del artículo es obligatorio.');
      return;
    }
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

      const meta = {
        badge: form.badge.trim(),
        shippingLabel: form.shippingLabel.trim() || DEFAULT_TIENDA_META.shippingLabel,
        rating: parseNum(form.rating) || 4.5,
        reviewCount: Math.max(0, Math.floor(parseNum(form.reviewCount))),
        articuloTipo: form.articuloTipo === 'servicio' ? 'servicio' : 'producto',
        duracion_minutos: Math.max(15, Math.floor(parseNum(form.duracion_minutos) || 60)),
      };
      const notas = mergeNotas(form.notasStaff, meta);

      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim() || null,
        barcode: form.barcode.trim() || null,
        precio_venta: parseNum(form.precio_venta) || null,
        precio_costo: parseNum(form.precio_costo) || null,
        stock_actual: Math.max(0, Math.floor(parseNum(form.stock_actual))),
        stock_minimo: Math.max(0, Math.floor(parseNum(form.stock_minimo))),
        es_consumible: !!form.es_consumible,
        fecha_vencimiento: form.fecha_vencimiento.trim() || null,
        ubicacion: form.ubicacion.trim() || null,
        descripcion_tienda: form.descripcion_tienda.trim() || null,
        visible_en_tienda: !!form.visible_en_tienda,
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
        const { error: syncErr } = await db.servicios.syncFromInventario({
          nombre: payload.nombre,
          precio_venta: payload.precio_venta,
          notas: payload.notas,
        });
        if (syncErr) {
          Alert.alert(
            'Guardado con aviso',
            `El artículo quedó en inventario, pero no se pudo sincronizar con la agenda (tabla servicios): ${syncErr.message || syncErr}`,
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
        Alert.alert('Listo', form.id ? 'Artículo actualizado.' : 'Artículo creado.');
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

  const addPersonIconColor = isDark ? '#141414' : c.foreground;

  const rightAction = (
    <TouchableOpacity
      onPress={openNew}
      style={[styles.addPersonCircle, isDark && styles.addPersonCircleDark]}
      hitSlop={12}
      accessibilityLabel="Nuevo artículo"
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
        subtitle="Perfil tipo tienda (App Clientes): precio, galería, envío, valoraciones y publicación."
        onBack={onBack}
        bottomPadding={0}
        disableBodyScroll
        edgeToEdge
        rightAction={rightAction}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.invHeaderPad}>
          <View style={[styles.searchWrap, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
            <Search size={18} color={c.foregroundMuted} />
            <TextInput
              style={[styles.searchIn, { color: c.foreground }]}
              placeholder="Buscar nombre, categoría, SKU…"
              placeholderTextColor={c.foregroundSubtle}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <View style={styles.invToolbar}>
            <Text style={[styles.invToolbarMeta, { color: c.foregroundMuted }]}>
              {filtered.length} artículo{filtered.length === 1 ? '' : 's'}
            </Text>
            <TouchableOpacity
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Ordenar y filtros"
              onPress={() => setModalFiltros(true)}
            >
              <Text style={[styles.invToolbarLink, { color: c.primary }]}>Ordenar · filtros</Text>
            </TouchableOpacity>
          </View>
          <Text style={[subStyles.muted, { fontSize: 12, lineHeight: 17, marginBottom: spacing.sm }]} numberOfLines={2}>
            {inventarioFiltroResumen}
          </Text>
          <Text style={[subStyles.muted, { marginTop: 0, marginBottom: spacing.md, fontSize: 12 }]}>
            Las tarjetas replican la jerarquía de la tienda en clientes (marca, título, precio tachado si el costo es mayor,
            estrellas, envío, stock). Los datos extra (insignia, envío, reseñas, tipo producto/servicio) se guardan junto
            con las notas internas en un bloque JSON reservado para el salón.
          </Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
          ) : (
            <FlatList
              data={gridRows}
              keyExtractor={(row, idx) => `row-${idx}-${row[0]?.id ?? 'e'}`}
              contentContainerStyle={{ paddingHorizontal: GRID_H_PAD, paddingBottom: padBottom }}
              renderItem={({ item: row }) => (
                <View style={styles.gridRow}>
                  {row.map((a) => (
                    <TiendaProductCard
                      key={a.id}
                      width={cardW}
                      product={rowToTiendaCard(a)}
                      onPress={() => openEdit(a)}
                      colors={c}
                      isDark={isDark}
                      compact
                    />
                  ))}
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
      </SubScreenChrome>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={[styles.modalHead, { borderBottomColor: c.cardBorder, paddingTop: insets.top + spacing.sm }]}>
          <Text style={[styles.modalTitle, { color: c.foreground }]}>{form.id ? 'Editar artículo' : 'Nuevo artículo'}</Text>
          <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={12}>
            <X size={24} color={c.foreground} />
          </TouchableOpacity>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: padBottom + 80 }}
        >
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
                  onPress={() => setForm((f) => ({ ...f, articuloTipo: opt.id }))}
                >
                  <Text style={{ color: on ? c.primary : c.foreground, fontFamily: typography.fontSansMedium }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Field label="Nombre (título en tienda) *" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.nombre}
              onChangeText={(t) => setForm((f) => ({ ...f, nombre: t }))}
              placeholder="Ej. Kit keratina 250 ml"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Línea / marca (texto pequeño en tarjeta)" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.categoria}
              onChangeText={(t) => setForm((f) => ({ ...f, categoria: t }))}
              placeholder="Ej. Keraplús · Profesional"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="SKU / código de barras" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.barcode}
              onChangeText={(t) => setForm((f) => ({ ...f, barcode: t }))}
              placeholder="Opcional"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Precio venta (GTQ) *" c={c}>
                <TextInput
                  style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={form.precio_venta}
                  onChangeText={(t) => setForm((f) => ({ ...f, precio_venta: t }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={c.foregroundSubtle}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Precio costo / lista (GTQ)" c={c}>
                <TextInput
                  style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                  value={form.precio_costo}
                  onChangeText={(t) => setForm((f) => ({ ...f, precio_costo: t }))}
                  keyboardType="decimal-pad"
                  placeholder="Para tachar si es mayor"
                  placeholderTextColor={c.foregroundSubtle}
                />
              </Field>
            </View>
          </View>

          {form.articuloTipo === 'servicio' ? (
            <Field label="Duración en agenda (minutos)" c={c}>
              <TextInput
                style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                value={form.duracion_minutos}
                onChangeText={(t) => setForm((f) => ({ ...f, duracion_minutos: t }))}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={c.foregroundSubtle}
              />
            </Field>
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
            <Switch value={form.es_consumible} onValueChange={(v) => setForm((f) => ({ ...f, es_consumible: v }))} />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: c.foreground, fontFamily: typography.fontSans }}>Visible en tienda (clientes)</Text>
            <Switch
              value={form.visible_en_tienda}
              onValueChange={(v) => setForm((f) => ({ ...f, visible_en_tienda: v }))}
              trackColor={{ false: c.cardBorder, true: `${c.primary}88` }}
              thumbColor={form.visible_en_tienda ? c.primary : c.foregroundSubtle}
            />
          </View>

          <Field label="Fecha vencimiento (AAAA-MM-DD)" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.fecha_vencimiento}
              onChangeText={(t) => setForm((f) => ({ ...f, fecha_vencimiento: t }))}
              placeholder="Opcional"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Ubicación en salón" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.ubicacion}
              onChangeText={(t) => setForm((f) => ({ ...f, ubicacion: t }))}
              placeholder="Estante, vitrina…"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>

          <Field label="Descripción larga (ficha tienda)" c={c}>
            <TextInput
              style={[styles.inp, styles.area, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.descripcion_tienda}
              onChangeText={(t) => setForm((f) => ({ ...f, descripcion_tienda: t }))}
              multiline
              textAlignVertical="top"
              placeholder="Ingredientes, uso, advertencias…"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>

          <Text style={[subStyles.rowLabel, { marginTop: spacing.md }]}>Ficha tienda (como en App Clientes)</Text>
          <Field label="Insignia en foto (ej. Más vendido)" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.badge}
              onChangeText={(t) => setForm((f) => ({ ...f, badge: t }))}
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Texto envío / retiro (una línea bajo estrellas)" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.shippingLabel}
              onChangeText={(t) => setForm((f) => ({ ...f, shippingLabel: t }))}
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
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
            Primera imagen = portada; hasta {MAX_GALERIA} adicionales en carrusel (como en la ficha de tienda).
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
      </Modal>

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background }]}>
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
      justifyContent: 'center',
      gap: GAP,
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
    chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
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
    thumb: { width: 72, height: 72, borderRadius: radii.sm },
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
