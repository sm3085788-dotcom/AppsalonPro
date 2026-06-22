import { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Image as ImageIcon, Clock } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { formatServicioPrecio, formatServicioDuracion } from '../../services/salonServiciosTienda';
import { formatCategoriaLabel, resolveServicioImageUri } from '../../data/servicioCategoryArt';

/**
 * Resumen visual del servicio al agendar (solo UI, datos ya cargados en `servicio`).
 */
export function AgendarServicioResumenCard({ kicker, servicio, precioConCanje, canjeDescuentoPct }) {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);

  if (!servicio) return null;

  const imageUri = resolveServicioImageUri(servicio);
  const categoria = formatCategoriaLabel(servicio.categoria);
  const precioTxt = formatServicioPrecio(servicio);
  const duracionTxt = formatServicioDuracion(servicio);
  const descripcion = String(servicio.descripcion || '').trim();
  const hint = String(servicio.stockHint || '').trim();
  const esPrecioVariable =
    Boolean(servicio.precioVariable) ||
    !(Number(servicio.precio) > 0) ||
    /variable|volumen|según/i.test(precioTxt);
  const descuentoPct =
    precioConCanje?.calc?.descuento_pct ??
    precioConCanje?.canjeSnap?.descuento_pct ??
    canjeDescuentoPct ??
    null;
  const descuentoTxt =
    descuentoPct != null && Number(descuentoPct) > 0
      ? `${Number(descuentoPct).toFixed(2).replace('.', ',')}%`
      : null;
  const tieneCanje = Boolean(descuentoTxt);

  return (
    <View style={styles.wrap}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}

      <View style={styles.bodyRow}>
        <View style={styles.thumbWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.thumbImg} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <ImageIcon size={28} color={c.foregroundMuted} strokeWidth={1.5} />
            </View>
          )}
        </View>

        <View style={styles.main}>
          {categoria ? (
            <View style={[styles.catChip, { backgroundColor: c.surfaceMuted, borderColor: c.cardBorder }]}>
              <Text style={[styles.catChipTxt, { color: c.foregroundMuted }]}>{categoria}</Text>
            </View>
          ) : null}

          <Text style={[styles.title, { color: c.foreground }]} numberOfLines={3}>
            {servicio.nombre}
          </Text>

          <View style={styles.priceRow}>
            {tieneCanje ? (
              esPrecioVariable ? (
                <View style={styles.priceStack}>
                  <Text style={[styles.precioVariable, { color: c.primary }]}>{precioTxt}</Text>
                  <Text style={[styles.precioLive, { color: c.foreground }]}>
                    {descuentoTxt}
                    <Text style={[styles.precioCanjeLbl, { color: c.primary }]}> de descuento · con canje ANDREAS</Text>
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.precioTachado}>{precioTxt}</Text>
                  <Text style={[styles.precioLive, { color: c.foreground }]}>
                    Q {(precioConCanje?.precio ?? 0).toFixed(2)}
                    <Text style={[styles.precioCanjeLbl, { color: c.primary }]}> · con canje ANDREAS</Text>
                  </Text>
                </>
              )
            ) : (
              <Text style={[styles.precioLive, { color: c.foreground }]}>{precioTxt}</Text>
            )}
          </View>

          <View style={styles.duracionRow}>
            <Clock size={14} color={c.foregroundMuted} strokeWidth={2} />
            <Text style={[styles.duracionTxt, { color: c.foregroundMuted }]}>{duracionTxt}</Text>
          </View>

          {descripcion ? (
            <Text style={[styles.descripcion, { color: c.foregroundMuted }]} numberOfLines={3}>
              {descripcion}
            </Text>
          ) : null}

          {hint ? (
            <Text style={styles.hint} numberOfLines={2}>
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function createStyles(c, isDark) {
  const availColor = isDark ? '#7DCEA0' : '#067D62';

  return StyleSheet.create({
    wrap: {
      width: '100%',
    },
    kicker: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: c.foregroundMuted,
      marginBottom: spacing.sm,
    },
    bodyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    thumbWrap: {
      width: 104,
      height: 104,
      borderRadius: radii.sm,
      overflow: 'hidden',
      backgroundColor: isDark ? c.iconCircleBg : '#F4F4F4',
      marginRight: spacing.md,
      flexShrink: 0,
      alignSelf: 'center',
    },
    thumbImg: { width: '100%', height: '100%' },
    thumbPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    main: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    catChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.pill,
      borderWidth: 1,
      marginBottom: 6,
    },
    catChipTxt: {
      fontFamily: typography.fontSans,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: {
      fontFamily: typography.fontSansMedium,
      fontSize: 17,
      lineHeight: 23,
      marginBottom: 4,
    },
    priceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginBottom: 4,
    },
    priceStack: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 2,
    },
    precioVariable: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    precioTachado: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      textDecorationLine: 'line-through',
      marginRight: 6,
    },
    precioLive: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    precioCanjeLbl: {
      fontFamily: typography.fontSans,
      fontSize: 12,
    },
    duracionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    duracionTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginLeft: 6,
    },
    descripcion: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 2,
      marginBottom: 2,
    },
    hint: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      lineHeight: 17,
      color: availColor,
      marginTop: 2,
    },
  });
}
