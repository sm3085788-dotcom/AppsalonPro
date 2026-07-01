/**
 * Niveles de membresía (Bronce, Plata, VIP) — fuente única salon + clientes.
 */
export const MEMBRESIA_MONTHLY_GTQ = {
  bronce: 350,
  plata: 850,
  vip: 2400,
};

export const MEMBRESIA_TIERS = [
  {
    id: 'bronce',
    label: 'Bronce',
    subtitle: 'Inicio · acumulás desde la primera visita · Essential Glow',
    accent: '#B87333',
    codePrefix: 'BRON',
  },
  {
    id: 'plata',
    label: 'Plata',
    subtitle: 'Más valor en cada cita y en tienda · Luxury Ritual',
    accent: '#9CA3AF',
    codePrefix: 'PLAT',
  },
  {
    id: 'vip',
    label: 'VIP',
    subtitle: 'Experiencia prioritaria y máximos beneficios · The Royal Sanctuary',
    accent: '#C5A368',
    codePrefix: 'VIP',
  },
];

const TIER_BY_ID = Object.fromEntries(MEMBRESIA_TIERS.map((t) => [t.id, t]));

export function getMembresiaTier(nivel) {
  const id = String(nivel || '').toLowerCase().trim();
  return TIER_BY_ID[id] || null;
}

export function membresiaLabel(nivel) {
  return getMembresiaTier(nivel)?.label || null;
}

export function getMembresiaMonthlyGtq(nivel) {
  const id = String(nivel || '').toLowerCase().trim();
  return MEMBRESIA_MONTHLY_GTQ[id] ?? null;
}

export function isMembresiaNivelValid(nivel) {
  return !!getMembresiaTier(nivel);
}

/** Código de activación para que el cliente lo ingrese en App Clientes. */
export function buildMembresiaCodigo(nivel) {
  const tier = getMembresiaTier(nivel);
  if (!tier) throw new Error('Nivel de membresía no válido');
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase();
  const stamp = Date.now().toString(36).slice(-3).toUpperCase();
  return `AURA-${tier.codePrefix}-${rand}${stamp}`;
}

export function normalizeMembresiaCodigoInput(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}
