import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Megaphone, Sparkles, Download, User, Phone } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { saveChatImageWithAlert } from '../../utils/saveChatImage';
import { useTheme } from '../../theme/ThemeProvider';

const FIELD_RE =
  /^(Titular|Descripción|Etiqueta|Precio|Botón tocado|Cliente|Tel):\s*(.*)$/i;

/** Solo presentación: interpreta el texto guardado en `content`, sin alterar datos. */
export function parseMarketingInterestDisplay(raw) {
  const lines = String(raw || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  let header = null;
  let publication = null;
  const fields = [];
  const extras = [];

  for (const line of lines) {
    if (/^📣\s*/.test(line) || /^Solicitud\s*·/i.test(line)) {
      header = line.replace(/^📣\s*/, '').trim();
      continue;
    }
    if (/Publicación\s*#/i.test(line) && !FIELD_RE.test(line)) {
      publication = line;
      continue;
    }
    const m = line.match(FIELD_RE);
    if (m) {
      fields.push({ label: m[1], value: m[2].trim() });
      continue;
    }
    extras.push(line);
  }

  const titular = fields.find((f) => /^titular$/i.test(f.label))?.value || null;
  const bodyFields = fields.filter((f) => !/^titular$/i.test(f.label));
  const clientName = fields.find((f) => /^cliente$/i.test(f.label))?.value || null;
  const clientPhone = fields.find((f) => /^tel$/i.test(f.label))?.value || null;
  const detailFields = bodyFields.filter((f) => !/^cliente$/i.test(f.label) && !/^tel$/i.test(f.label));

  return {
    header,
    publication,
    titular,
    detailFields,
    clientName,
    clientPhone,
    extras,
  };
}

function InterestHeroImage({ uri }) {
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
    <View style={styles.heroWrap}>
      <Image source={{ uri }} style={styles.heroImg} resizeMode="cover" />
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Guardar captura"
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Download size={18} color="#FFFFFF" strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function DetailRow({ label, value, labelColor, valueColor }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLbl, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.rowVal, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

/**
 * Tarjeta de solicitud Tendencias / Carrusel (solo UI).
 * @param {'salon'|'client'} audience — encabezado para staff vs. cliente
 */
export function MarketingInterestCard({
  item,
  sourceLabel,
  audience = 'salon',
  createdAtLabel,
  colors: colorsProp,
}) {
  const themeCtx = useTheme();
  const c = colorsProp || themeCtx.colors;
  const parsed = useMemo(() => parseMarketingInterestDisplay(item?.content), [item?.content]);
  const hasImage = Boolean(item?.media_url && item?.media_kind === 'image');

  const kicker =
    audience === 'client'
      ? `Tu solicitud · ${sourceLabel || 'Marketing'}`
      : `Interés · ${sourceLabel || 'Marketing'}`;

  if (!parsed && !hasImage) {
    const fallback = String(item?.content || '').trim();
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={styles.kickerRow}>
          <Sparkles size={14} color={c.primary} />
          <Text style={[styles.kickerTxt, { color: c.primary }]}>{kicker}</Text>
        </View>
        {fallback ? <Text style={[styles.fallbackTxt, { color: c.foreground }]}>{fallback}</Text> : null}
        {createdAtLabel ? (
          <Text style={[styles.meta, { color: c.foregroundMuted }]}>{createdAtLabel}</Text>
        ) : null}
      </View>
    );
  }

  const titular = parsed?.titular;
  const publication = parsed?.publication;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={[styles.cardHeader, { borderBottomColor: c.cardBorder }]}>
        <View style={styles.kickerRow}>
          <Sparkles size={14} color={audience === 'client' ? '#B8860B' : c.primary} />
          <Text
            style={[
              styles.kickerTxt,
              audience === 'client' ? styles.kickerClient : null,
              { color: audience === 'client' ? '#B8860B' : c.primary },
            ]}
          >
            {kicker}
          </Text>
        </View>
        <Megaphone size={18} color={c.foregroundMuted} strokeWidth={2} />
      </View>

      {hasImage ? <InterestHeroImage uri={item.media_url} /> : null}

      <View style={styles.body}>
        {publication ? (
          <View style={[styles.pubChip, { backgroundColor: c.surfaceMuted, borderColor: c.cardBorder }]}>
            <Text style={[styles.pubChipTxt, { color: c.foreground }]}>{publication}</Text>
          </View>
        ) : null}

        {titular ? (
          <View style={styles.headlineBlock}>
            <Text style={[styles.headlineLbl, { color: c.foregroundMuted }]}>Titular</Text>
            <Text style={[styles.headline, { color: c.foreground }]}>{titular}</Text>
          </View>
        ) : null}

        {parsed?.detailFields?.length ? (
          <View style={[styles.detailsBlock, { borderTopColor: c.cardBorder }]}>
            {parsed.detailFields.map((f) => (
              <DetailRow
                key={`${f.label}-${f.value}`}
                label={f.label}
                value={f.value}
                labelColor={c.foregroundMuted}
                valueColor={c.foreground}
              />
            ))}
          </View>
        ) : null}

        {parsed?.extras?.length ? (
          <Text style={[styles.extras, { color: c.foregroundMuted }]}>{parsed.extras.join('\n')}</Text>
        ) : null}

        {parsed?.clientName || parsed?.clientPhone ? (
          <View style={[styles.clientBox, { backgroundColor: c.surfaceMuted, borderColor: c.cardBorder }]}>
            {parsed.clientName ? (
              <View style={styles.clientLine}>
                <User size={15} color={c.primary} strokeWidth={2} />
                <Text style={[styles.clientName, { color: c.foreground }]}>{parsed.clientName}</Text>
              </View>
            ) : null}
            {parsed.clientPhone ? (
              <View style={styles.clientLine}>
                <Phone size={15} color={c.foregroundMuted} strokeWidth={2} />
                <Text style={[styles.clientPhone, { color: c.foreground }]}>{parsed.clientPhone}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {createdAtLabel ? (
        <Text style={[styles.meta, { color: c.foregroundMuted, borderTopColor: c.cardBorder }]}>
          {createdAtLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: radii.lg + 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  kickerTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kickerClient: {
    letterSpacing: 1.2,
    fontSize: 10,
  },
  heroWrap: {
    width: '100%',
    height: 232,
    position: 'relative',
    backgroundColor: '#0f0a18',
  },
  heroImg: { width: '100%', height: '100%' },
  saveBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  pubChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pubChipTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
  },
  headlineBlock: { gap: 2 },
  headlineLbl: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headline: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  detailsBlock: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: { gap: 2 },
  rowLbl: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rowVal: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    lineHeight: 21,
  },
  extras: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    lineHeight: 19,
  },
  clientBox: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  clientLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clientName: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    flex: 1,
  },
  clientPhone: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    flex: 1,
  },
  meta: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fallbackTxt: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
