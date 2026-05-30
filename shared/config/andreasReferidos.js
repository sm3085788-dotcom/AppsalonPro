import { ANDREAS_META } from './andreasPremios.js';

export const ANDREAS_REFERRAL_META = ANDREAS_META.referidos;

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
