import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  RefreshControl,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Plus,
  Check,
  ShoppingCart,
  X,
  Star,
} from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { normalizeServicioCategoria } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { CLIENT_ALERT_BELL_RED } from '../../constants/clientAlertColors';
import { useServiciosCart } from '../../context/ServiciosCartContext';
import {
  formatServicioDuracion,
  formatServicioPrecio,
  loadServiciosTiendaCatalog,
} from '../../services/salonServiciosTienda';
import {
  formatCategoriaLabel,
  resolveServicioImageUris,
} from '../../data/servicioCategoryArt';
/** Más ancho que alto (menos altura en pantalla). */
const IMAGE_ASPECT = 16 / 9;
const STAR_GOLD = '#FFB800';

function RatingStars({ rating }) {
  const full = Math.floor(Math.min(5, Math.max(0, Number(rating) || 0)));
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={11}
          color={s <= full ? STAR_GOLD : 'rgba(255,255,255,0.35)'}
          fill={s <= full ? STAR_GOLD : 'transparent'}
          strokeWidth={0}
        />
      ))}
    </View>
  );
}

function formatCartBadge(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return null;
  return x > 99 ? '99+' : String(x);
}

function ServicioStackRow({ servicio, cardWidth, cardHeight, inCart, onAdd, styles, highlighted }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const imageUris = resolveServicioImageUris(servicio);
  const catLabel = formatCategoriaLabel(normalizeServicioCategoria(servicio.categoria));
  const rating = Number(servicio.rating) || 0;
  const reviewCount = Math.max(0, Math.floor(Number(servicio.reviewCount) || 0));
  const desc = String(servicio.descripcion || '').trim();
  const hint = String(servicio.stockHint || '').trim();
  const badge = String(servicio.badge || '').trim();
  const compareAt = String(servicio.compareAtLabel || '').trim();
  const priceNow = formatServicioPrecio(servicio);

  return (
    <View
      style={[
        styles.stackRow,
        { width: cardWidth },
        highlighted && styles.stackRowHighlight,
      ]}
    >
      <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden' }}>
        {imageUris.length > 1 ? (
          <FlatList
            data={imageUris}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, i) => `${i}-${uri}`}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / Math.max(cardWidth, 1));
              setActiveSlide(Math.min(imageUris.length - 1, Math.max(0, idx)));
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={{ width: cardWidth, height: cardHeight }}
                resizeMode="cover"
              />
            )}
            getItemLayout={(_, index) => ({
              length: cardWidth,
              offset: cardWidth * index,
              index,
            })}
          />
        ) : (
          <Image
            source={{ uri: imageUris[0] }}
            style={{ width: cardWidth, height: cardHeight }}
            resizeMode="cover"
          />
        )}
        {badge ? (
          <View style={styles.stackBadge} pointerEvents="none">
            <Text style={styles.stackBadgeTxt} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ) : null}
        {imageUris.length > 1 ? (
          <View style={styles.stackDots} pointerEvents="none">
            {imageUris.map((_, i) => (
              <View key={i} style={[styles.stackDot, i === activeSlide && styles.stackDotOn]} />
            ))}
          </View>
        ) : null}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
          locations={[0.35, 0.72, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.stackOverlay} pointerEvents="none">
          <Text style={styles.stackCat}>{catLabel}</Text>
          <Text style={styles.stackTitle} numberOfLines={2}>
            {servicio.nombre}
          </Text>
          <View style={styles.stackRatingRow}>
            <RatingStars rating={rating} />
            <Text style={styles.stackRatingTxt}>
              {rating.toFixed(1)} ({reviewCount})
            </Text>
          </View>
          <View style={styles.stackPriceRow}>
            {compareAt && !servicio.precioVariable ? (
              <Text style={styles.stackPriceWas} numberOfLines={1}>
                {compareAt}
              </Text>
            ) : null}
            <Text style={styles.stackPriceNow} numberOfLines={1}>
              {priceNow}
            </Text>
            <Text style={styles.stackMetaDot}> · </Text>
            <Text style={styles.stackMeta} numberOfLines={1}>
              {formatServicioDuracion(servicio)}
            </Text>
          </View>
          {hint ? (
            <Text style={styles.stackHint} numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
          {desc ? (
            <Text style={styles.stackDesc} numberOfLines={2}>
              {desc}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, inCart && styles.addBtnOn]}
          onPress={onAdd}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={
            inCart ? `${servicio.nombre} en tu lista` : `Agregar ${servicio.nombre}`
          }
        >
          {inCart ? (
            <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
          ) : (
            <Plus size={15} color="#FFFFFF" strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function servicioKey(s) {
  return String(s?.id ?? s?.nombre ?? '');
}

export function MisCitasTab({
  hasSupabaseEnv,
  scrollBottom,
  contentPaddingTop,
  onOpenServiciosCart,
  onRefreshCitas,
  highlightInventarioId = null,
  onHighlightConsumed,
}) {
  const { colors: c } = useTheme();
  const { width: winW } = useWindowDimensions();
  const bleed = spacing.lg;
  const cardWidth = winW;
  const cardHeight = Math.round(cardWidth / IMAGE_ASPECT);
  const styles = useMemo(() => createStyles(c), [c]);
  const { items: cartItems, addItem, removeItem, count: cartCount } = useServiciosCart();
  const cartKeys = useMemo(() => new Set(cartItems.map(servicioKey)), [cartItems]);
  const cartLabel = formatCartBadge(cartCount);

  const [servicios, setServicios] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [categoriaSel, setCategoriaSel] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoriaPickerOpen, setCategoriaPickerOpen] = useState(false);
  const scrollRef = useRef(null);
  const rowOffsetsRef = useRef({});
  const listTopRef = useRef(0);

  const loadServicios = useCallback(async () => {
    if (!hasSupabaseEnv) {
      setServicios([]);
      setLoadingServicios(false);
      return;
    }
    setLoadingServicios(true);
    try {
      const list = await loadServiciosTiendaCatalog();
      setServicios(list);
    } catch {
      setServicios([]);
    } finally {
      setLoadingServicios(false);
    }
  }, [hasSupabaseEnv]);

  useEffect(() => {
    void loadServicios();
  }, [loadServicios]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([onRefreshCitas?.(), loadServicios()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadServicios, onRefreshCitas]);

  const gruposCatalogo = useMemo(() => {
    const map = new Map();
    for (const s of servicios) {
      const cat = normalizeServicioCategoria(s.categoria);
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'es'))
      .map(([nombre, count]) => ({ nombre, count }));
  }, [servicios]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let list = servicios.filter((s) => {
      const cat = normalizeServicioCategoria(s.categoria);
      if (categoriaSel && cat !== categoriaSel) return false;
      if (!q) return true;
      return `${s.nombre || ''} ${cat}`.toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'),
    );
    return list;
  }, [busqueda, servicios, categoriaSel]);

  useEffect(() => {
    if (!highlightInventarioId || loadingServicios) return;
    const target = String(highlightInventarioId).trim();
    const idx = filtrados.findIndex(
      (s) => String(s.inventarioId || '').trim() === target,
    );
    if (idx < 0) {
      onHighlightConsumed?.();
      return;
    }
    const y = rowOffsetsRef.current[idx];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }
    const t = setTimeout(() => onHighlightConsumed?.(), 1200);
    return () => clearTimeout(t);
  }, [highlightInventarioId, filtrados, loadingServicios, onHighlightConsumed]);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: scrollBottom, paddingTop: contentPaddingTop },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.pageDisplay}>Servicios</Text>
            <Text style={styles.pageLead}>
              Agregá servicios con + y agendá desde el carrito.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={onOpenServiciosCart}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              cartLabel ? `Servicios por agendar, ${cartLabel}` : 'Servicios por agendar'
            }
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <ShoppingCart size={23} color={c.foreground} strokeWidth={1.85} />
            {cartLabel ? (
              <View style={[styles.cartBadge, { backgroundColor: CLIENT_ALERT_BELL_RED }]}>
                <Text style={styles.cartBadgeTxt}>{cartLabel}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          {hasSupabaseEnv ? (
            <View style={styles.searchWrap}>
              <Search size={18} color={c.foregroundSubtle} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar servicio…"
                placeholderTextColor={c.foregroundSubtle}
                value={busqueda}
                onChangeText={setBusqueda}
                returnKeyType="search"
              />
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Ordenar y filtrar servicios"
          >
            <SlidersHorizontal size={20} color={c.foreground} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {categoriaSel ? (
          <Text style={styles.activeFilters}>
            Filtro: {categoriaSel}
          </Text>
        ) : null}

        {loadingServicios ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
        ) : filtrados.length === 0 ? (
          <View style={styles.catalogEmpty}>
            <Sparkles size={28} color={c.foregroundSubtle} strokeWidth={1.5} />
            <Text style={styles.catalogEmptyTxt}>
              {busqueda.trim() || categoriaSel
                ? 'No hay servicios con ese filtro.'
                : 'El salón aún no publicó servicios.'}
            </Text>
          </View>
        ) : (
          <View
            style={[styles.stackList, { marginHorizontal: -bleed, width: cardWidth }]}
            onLayout={(e) => {
              listTopRef.current = e.nativeEvent.layout.y;
            }}
          >
            {filtrados.map((s, index) => {
              const isHighlight =
                highlightInventarioId != null &&
                String(s.inventarioId || '').trim() === String(highlightInventarioId).trim();
              return (
                <View
                  key={String(s.id)}
                  onLayout={(e) => {
                    rowOffsetsRef.current[index] =
                      listTopRef.current + e.nativeEvent.layout.y;
                  }}
                >
                  <ServicioStackRow
                    servicio={s}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    inCart={cartKeys.has(servicioKey(s))}
                    styles={styles}
                    highlighted={isHighlight}
                    onAdd={() => {
                      if (cartKeys.has(servicioKey(s))) removeItem(s);
                      else addItem(s);
                    }}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={filtersOpen} transparent animationType="fade" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Filtrar servicios</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSection}>Grupo de servicio</Text>
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setCategoriaPickerOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.pickerFieldTxt}>{categoriaSel || 'Todos'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearFilters}
              onPress={() => {
                setCategoriaSel('');
                setFiltersOpen(false);
              }}
            >
              <Text style={styles.clearFiltersTxt}>Mostrar todos</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={categoriaPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoriaPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoriaPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Grupo de servicio</Text>
              <TouchableOpacity onPress={() => setCategoriaPickerOpen(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            {[{ nombre: 'Todos', count: servicios.length }, ...gruposCatalogo].map((g) => {
              const on = (g.nombre === 'Todos' && !categoriaSel) || categoriaSel === g.nombre;
              return (
                <TouchableOpacity
                  key={g.nombre}
                  style={styles.pickRow}
                  onPress={() => {
                    setCategoriaSel(g.nombre === 'Todos' ? '' : g.nombre);
                    setCategoriaPickerOpen(false);
                    setFiltersOpen(false);
                  }}
                >
                  <Text style={[styles.pickRowTxt, on && styles.pickRowTxtOn]}>
                    {g.nombre} {g.nombre === 'Todos' ? '' : `(${g.count})`}
                  </Text>
                  {on ? <Check size={18} color={c.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    scrollInner: { flexGrow: 1, paddingHorizontal: spacing.lg },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    titleCopy: { flex: 1, minWidth: 0 },
    pageDisplay: {
      fontFamily: typography.fontDisplay,
      fontSize: 27,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    pageLead: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      lineHeight: 21,
    },
    cartBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginTop: 4,
    },
    cartBadge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: c.background,
    },
    cartBadgeTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      color: '#FFFFFF',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    searchWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      minHeight: 46,
    },
    searchInput: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 15,
      color: c.foreground,
      paddingVertical: 8,
    },
    filterBtn: {
      width: 46,
      height: 46,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeFilters: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.primary,
      marginBottom: spacing.sm,
    },
    gruposWrap: {
      marginBottom: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    gruposTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: c.foregroundSubtle,
      marginBottom: 4,
    },
    gruposList: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
      lineHeight: 20,
    },
    catalogEmpty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    catalogEmptyTxt: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      textAlign: 'center',
      maxWidth: 280,
    },
    stackList: { marginTop: spacing.xs, gap: 0 },
    stackRow: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: c.surfaceMuted,
      marginBottom: 0,
    },
    stackRowHighlight: {
      borderWidth: 2,
      borderColor: c.primary,
    },
    stackBadge: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.md,
      zIndex: 2,
      backgroundColor: 'rgba(20,20,20,0.85)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      maxWidth: '70%',
    },
    stackBadgeTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      color: '#FFF',
      letterSpacing: 0.3,
    },
    stackDots: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.md,
      flexDirection: 'row',
      gap: 5,
      zIndex: 2,
    },
    stackDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    stackDotOn: {
      backgroundColor: c.primary,
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    stackOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      paddingRight: spacing.xl + 28,
    },
    stackCat: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 4,
    },
    stackTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      lineHeight: 26,
      color: '#FFFFFF',
    },
    stackRatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    stackRatingTxt: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: 'rgba(255,255,255,0.82)',
    },
    stackPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 4,
    },
    stackPriceWas: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: 'rgba(255,255,255,0.55)',
      textDecorationLine: 'line-through',
      marginRight: 6,
    },
    stackPriceNow: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: '#FFFFFF',
    },
    stackMetaDot: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
    },
    stackMeta: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: 'rgba(255,255,255,0.88)',
      flexShrink: 1,
    },
    stackHint: {
      marginTop: 4,
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: 'rgba(255,255,255,0.75)',
    },
    stackDesc: {
      marginTop: 4,
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 16,
      color: 'rgba(255,255,255,0.8)',
    },
    addBtn: {
      position: 'absolute',
      right: spacing.md,
      bottom: spacing.md,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.38)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    addBtnOn: {
      backgroundColor: 'rgba(212,175,55,0.75)',
      borderColor: 'rgba(255,255,255,0.65)',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '78%',
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 18,
      color: c.foreground,
    },
    modalSection: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: c.foregroundSubtle,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    pickerField: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: radii.lg,
      minHeight: 46,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      backgroundColor: c.background,
    },
    pickerFieldTxt: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      color: c.foreground,
    },
    pickRow: {
      minHeight: 46,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.cardBorder,
    },
    pickRowTxt: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
    },
    pickRowTxtOn: {
      color: c.foreground,
      fontFamily: typography.fontSansMedium,
    },
    sortRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    sortChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    sortChipOn: { borderColor: c.primary, backgroundColor: 'rgba(212,175,55,0.12)' },
    sortChipTxt: { fontFamily: typography.fontSans, fontSize: 14, color: c.foregroundMuted },
    sortChipTxtOn: { color: c.foreground, fontFamily: typography.fontSansMedium },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.background,
    },
    catChipOn: { borderColor: c.primary, backgroundColor: 'rgba(212,175,55,0.14)' },
    catChipTxt: { fontFamily: typography.fontSansMedium, fontSize: 13, color: c.foregroundMuted },
    catChipTxtOn: { color: c.foreground },
    catChipCount: { fontFamily: typography.fontSans, fontSize: 11, color: c.foregroundSubtle },
    catChipCountOn: { color: c.primary },
    clearFilters: { marginTop: spacing.lg, alignItems: 'center' },
    clearFiltersTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      color: c.primary,
    },
  });
}
