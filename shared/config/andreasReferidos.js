import { ANDREAS_META } from './andreasPremios.js';
import { PREMIO_REGLA } from './andreasPremiosCycles.js';

export const ANDREAS_REFERRAL_META = ANDREAS_META.referidos;

/** Descuento automático en servicios al canjear premio de referidos (ciclo 2 = solo recepción). */
export const REFERRAL_PRIZE_SERVICIO_DISCOUNT = {
  0: 29.99,
  1: 100,
  2: null,
};

/** Tres premios por ciclo de 3 referidos verificados en salón. */
export const ANDREAS_REFERRAL_PRIZES = [
  {
    ciclo: 0,
    title: '29,99% en servicio + fotos',
    shortTitle: 'Servicio + sesión fotográfica',
    detail:
      'Cuando 3 personas nuevas se registran con tu código y completan su primera compra en tienda (validada en salón) o su primera cita confirmada (visita validada con QR), obtenés 29,99% de descuento en un servicio más sesión de fotos e imagen impresa en Salon Andreas.',
    emoji: '📸',
  },
  {
    ciclo: 1,
    title: 'Manicure o pedicure gratis',
    shortTitle: 'Manicure o pedicure gratuito',
    detail:
      'Al completar tu segundo ciclo de 3 referidos verificados, tu premio es un servicio gratuito de manicure o pedicure en Salon Andreas (a coordinar en recepción).',
    emoji: '💅',
  },
  {
    ciclo: 2,
    title: 'Modelo para publicidad',
    shortTitle: 'Modelo · maquillaje · peinado · sesión',
    detail:
      'En el tercer ciclo de 3 referidos verificados, participás como modelo para publicidad del salón: maquillaje, peinado y sesión cinematográfica profesional.',
    emoji: '🎬',
  },
];

export function getReferralPrizeByCiclo(ciclo) {
  const n = Math.max(0, Math.min(2, Math.floor(Number(ciclo) || 0)));
  return ANDREAS_REFERRAL_PRIZES.find((p) => p.ciclo === n) || ANDREAS_REFERRAL_PRIZES[0];
}

export function parseReferidosPremiosState(andreasPremios) {
  const ap =
    andreasPremios && typeof andreasPremios === 'object' && !Array.isArray(andreasPremios)
      ? andreasPremios
      : {};
  const ciclo = Math.max(0, Math.min(2, Math.floor(Number(ap.referidos_ciclo) || 0)));
  const enCiclo = Math.max(0, Math.min(ANDREAS_REFERRAL_META, Math.floor(Number(ap.referidos_en_ciclo) || 0)));
  return { ciclo, enCiclo, prize: getReferralPrizeByCiclo(ciclo) };
}

/**
 * Premio de referidos listo para canje en recepción.
 * Tras el 3.er referido validado el contador en_ciclo vuelve a 0; el flag evita perder el aviso de celebración.
 */
export function resolveReferidosCanjePendiente(andreasPremios, totalValidados = null) {
  const ap =
    andreasPremios && typeof andreasPremios === 'object' && !Array.isArray(andreasPremios)
      ? andreasPremios
      : {};
  const stored = ap.referidos_canje_pendiente;
  if (stored && typeof stored === 'object') {
    const ciclo = Math.max(0, Math.min(2, Math.floor(Number(stored.ciclo) || 0)));
    return { ciclo, at: stored.at || null };
  }

  const ultimo = ap.referidos_ultimo_canje;
  const ultimoCiclo =
    ultimo && typeof ultimo === 'object' && ultimo.consume_id
      ? Math.max(0, Math.min(2, Math.floor(Number(ultimo.ciclo) || 0)))
      : null;

  const { ciclo, enCiclo } = parseReferidosPremiosState(ap);
  if (ciclo > 0 && enCiclo === 0) {
    const prizeCiclo = (ciclo - 1 + 3) % 3;
    if (ultimoCiclo === prizeCiclo) return null;
    return { ciclo: prizeCiclo, at: null, legacy: true };
  }

  const total = totalValidados != null ? Math.max(0, Math.floor(Number(totalValidados) || 0)) : null;
  if (total != null && total >= ANDREAS_REFERRAL_META && total % ANDREAS_REFERRAL_META === 0 && ciclo === 0 && enCiclo === 0) {
    if (ultimoCiclo === 2) return null;
    return { ciclo: 2, at: null, legacy: true };
  }

  return null;
}

/** Canje pendiente de referidos aplicable al agendar servicio en la app o en caja. */
export function findCanjePendienteForReferidos(andreasPremios, totalValidados = null) {
  const pending = resolveReferidosCanjePendiente(andreasPremios, totalValidados);
  if (!pending) return null;
  const ciclo = Math.max(0, Math.min(2, Math.floor(Number(pending.ciclo) || 0)));
  const descuento_pct = REFERRAL_PRIZE_SERVICIO_DISCOUNT[ciclo];
  if (descuento_pct == null) return null;
  return {
    rule_id: PREMIO_REGLA.REFERIDOS,
    ruleId: PREMIO_REGLA.REFERIDOS,
    descuento_pct,
    ciclo,
    meta: ANDREAS_REFERRAL_META,
  };
}

/** Marca el premio de referidos como consumido al agendar o cobrar el servicio. */
export function syncReferidosOnCanjeRedeemed(ap, consumeId, cicloUsado = null) {
  const apNorm =
    ap && typeof ap === 'object' && !Array.isArray(ap) ? { ...ap } : {};
  const ciclo =
    cicloUsado != null
      ? Math.max(0, Math.min(2, Math.floor(Number(cicloUsado) || 0)))
      : Math.max(
          0,
          Math.min(2, Math.floor(Number(apNorm.referidos_canje_pendiente?.ciclo) || 0)),
        );
  delete apNorm.referidos_canje_pendiente;
  apNorm.referidos_ultimo_canje = {
    at: new Date().toISOString(),
    consume_id: consumeId != null ? String(consumeId) : null,
    ciclo,
  };
  return apNorm;
}
