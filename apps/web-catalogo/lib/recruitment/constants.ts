export type BeautyBranchKey =
  | 'coloracion'
  | 'maquillaje'
  | 'cejas'
  | 'manicure'
  | 'pedicure'
  | 'planchado'
  | 'cuidado_capilar'
  | 'higiene'
  | 'spa_masaje'
  | 'spa_corporal'
  | 'spa_relajacion'
  | 'skincare_facial'
  | 'skincare_limpieza'
  | 'skincare_hidratacion'
  | 'recepcion_administrativa'
  | 'recepcion_atencion'
  | 'pestanas'
  | 'corte_peinado';

export type JoinTeamModalidad = 'empleado_directo' | 'socio_co_dependiente';

export type BeautyBranch = {
  key: BeautyBranchKey;
  label: string;
  /** Servicios destacados del salón (Coloración, Maquillaje, Cejas). */
  featured?: boolean;
};

export type BeautyBranchSection = {
  id: string;
  title: string | null;
  branches: BeautyBranch[];
};

/** Servicios con mayor demanda en Andreas — se muestran con etiqueta en el formulario. */
export const FEATURED_SERVICE_KEYS: BeautyBranchKey[] = ['coloracion', 'maquillaje', 'cejas'];

export const CORE_BEAUTY_BRANCHES: BeautyBranch[] = [
  { key: 'coloracion', label: 'Coloración', featured: true },
  { key: 'maquillaje', label: 'Maquillaje', featured: true },
  { key: 'cejas', label: 'Cejas', featured: true },
  { key: 'manicure', label: 'Manicure' },
  { key: 'pedicure', label: 'Pedicure' },
  { key: 'planchado', label: 'Planchado' },
  { key: 'cuidado_capilar', label: 'Cuidado capilar' },
  { key: 'higiene', label: 'Higiene' },
  { key: 'pestanas', label: 'Pestañas' },
  { key: 'corte_peinado', label: 'Corte y peinado' },
];

export const SPA_BEAUTY_BRANCHES: BeautyBranch[] = [
  { key: 'spa_masaje', label: 'Masaje' },
  { key: 'spa_corporal', label: 'Tratamiento corporal' },
  { key: 'spa_relajacion', label: 'Relajación y aromaterapia' },
];

export const SKINCARE_BEAUTY_BRANCHES: BeautyBranch[] = [
  { key: 'skincare_facial', label: 'Facial' },
  { key: 'skincare_limpieza', label: 'Limpieza profunda' },
  { key: 'skincare_hidratacion', label: 'Hidratación y nutrición' },
];

export const RECEPCION_BEAUTY_BRANCHES: BeautyBranch[] = [
  { key: 'recepcion_administrativa', label: 'Habilidad administrativa' },
  { key: 'recepcion_atencion', label: 'Atención al cliente' },
];

export const BEAUTY_BRANCH_SECTIONS: BeautyBranchSection[] = [
  { id: 'general', title: null, branches: CORE_BEAUTY_BRANCHES },
  { id: 'spa', title: 'Spas', branches: SPA_BEAUTY_BRANCHES },
  { id: 'skincare', title: 'Skincare', branches: SKINCARE_BEAUTY_BRANCHES },
  { id: 'recepcion', title: 'Recepción', branches: RECEPCION_BEAUTY_BRANCHES },
];

export const BEAUTY_BRANCHES: BeautyBranch[] = BEAUTY_BRANCH_SECTIONS.flatMap(
  (section) => section.branches,
);

/** Etiquetas legibles incl. claves antiguas ya guardadas en BD. */
export const BRANCH_LABELS: Record<string, string> = {
  ...Object.fromEntries(BEAUTY_BRANCHES.map((b) => [b.key, b.label])),
  recepcion_agenda: 'Agenda y citas',
  recepcion_cobros: 'Cobros y POS',
  recepcion_multitarea: 'Atención al cliente y coordinación simultánea bajo presión',
  spas: 'Spas',
  skincare: 'Skincare',
};

export const SUGGESTED_BRANCH_KEYS = new Set<BeautyBranchKey>(FEATURED_SERVICE_KEYS);

export function activeFeaturedServiceLabels(
  experiencia: Record<string, boolean> | null | undefined,
): string[] {
  if (!experiencia) return [];
  return FEATURED_SERVICE_KEYS.filter((key) => experiencia[key]).map((key) => branchLabel(key));
}

export function featuredServicesSummary(
  experiencia: Record<string, boolean> | null | undefined,
): string {
  const selected = activeFeaturedServiceLabels(experiencia);
  if (selected.length > 0) return selected.join(' · ');
  return FEATURED_SERVICE_KEYS.map((key) => branchLabel(key)).join(' · ');
}

export const JOIN_TEAM_POLICIES = [
  {
    title: 'Productos de prestigio',
    body: 'Andreas se compromete a trabajar con productos y marcas de prestigio que cuidan la calidad, la seguridad y la imagen del salón.',
  },
  {
    title: 'Confiabilidad',
    body: 'Buscamos personas puntuales, responsables y coherentes con su palabra en cada turno, tarea y compromiso con el equipo.',
  },
  {
    title: 'Ética profesional',
    body: 'Como solicitante, debes aceptar representar al salón con respeto, discreción y estándares profesionales ante clientes y compañeros.',
  },
] as const;

export const MODALIDAD_OPTIONS: { value: JoinTeamModalidad; label: string; hint: string }[] = [
  {
    value: 'empleado_directo',
    label: 'Empleado del salón',
    hint: 'Horario, capacitación y crecimiento interno.',
  },
  {
    value: 'socio_co_dependiente',
    label: 'Socio co-dependiente',
    hint: 'Responsabilidad compartida y participación en resultados.',
  },
];

export function branchLabel(key: string | null | undefined): string {
  if (!key) return '—';
  return BRANCH_LABELS[key] ?? key;
}

export function modalidadLabel(value: string | null | undefined): string {
  return MODALIDAD_OPTIONS.find((m) => m.value === value)?.label ?? value ?? '—';
}

export function activeBranchLabels(experiencia: Record<string, boolean> | null | undefined): string[] {
  if (!experiencia) return [];
  const labels: string[] = [];
  for (const branch of BEAUTY_BRANCHES) {
    if (experiencia[branch.key]) labels.push(branch.label);
  }
  if (experiencia.spas && !labels.some((l) => l.startsWith('Masaje'))) {
    labels.push('Spas');
  }
  if (experiencia.skincare && !labels.some((l) => ['Facial', 'Limpieza profunda'].includes(l))) {
    labels.push('Skincare');
  }
  return labels;
}

export function computeHighlightedBranch(experiencia: Record<string, boolean>): BeautyBranchKey | null {
  for (const branch of BEAUTY_BRANCHES) {
    if (experiencia[branch.key]) return branch.key;
  }
  return null;
}

export const JOIN_TEAM_COPY = {
  eyebrow: 'Carrera en belleza',
  title: 'Únete al Equipo',
  introLoggedOut: 'Empresa seria en belleza. Si tenés determinación, queremos conocerte.',
  introLoggedIn: 'Empresa seria en belleza. Presentate y crece con nosotros.',
  assistantNote: 'Un asistente te contactará antes de la revisión.',
  suggestedBranches:
    'Servicios destacados: Coloración, Maquillaje y Cejas. Activá también Spas, Skincare o Recepción.',
  postSubmit: 'Solicitud recibida. Te contactaremos pronto.',
  pageSubtitle: 'Crecé con nosotros si tenés determinación.',
} as const;

export type JoinTeamEstado = 'enviado' | 'recibido' | 'revisado';

export const ESTADO_LABELS: Record<JoinTeamEstado, string> = {
  enviado: 'Solicitud enviada',
  recibido: 'Salón confirmó recepción',
  revisado: 'Salón revisó tu documentación',
};
