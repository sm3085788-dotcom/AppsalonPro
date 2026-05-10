/** Solo UI — datos alineados a las capturas de referencia */

export const DEMO_FIRST_NAME = 'María';

export const DEMO_PROFILE = {
  fullName: 'María García',
  emailPlaceholder: 'maria@ejemplo.com',
};

export const QUICK_ACCESS = {
  tiendaSubtitle: 'Productos profesionales y kits',
  tendenciasSubtitle: 'Looks destacados esta temporada',
  premiosSubtitle: 'Referidos, puntos y canjes · demo',
  pedidosSubtitle: 'QR y domicilio',
};

/** Próxima cita única (pantalla Mis citas) */
export const MOCK_PROXIMA_CITA = {
  servicio: 'Corte y Color',
  estilista: 'Alejandra',
  rol: 'Estilista Senior',
  fechaLabel: '15 Mayo, 2026',
  horaLabel: '10:30 AM',
};

export const MOCK_HISTORIAL = [
  {
    id: 'h1',
    servicio: 'Corte y Peinado',
    precio: '$65',
    detalle: '28 Abril, 2026 · Alejandra',
  },
  {
    id: 'h2',
    servicio: 'Tratamiento Keratin',
    precio: '$120',
    detalle: '15 Abril, 2026 · Carmen',
  },
  {
    id: 'h3',
    servicio: 'Balayage Premium',
    precio: '$180',
    detalle: '2 Abril, 2026 · Alejandra',
  },
  {
    id: 'h4',
    servicio: 'Corte y Color',
    precio: '$95',
    detalle: '18 Marzo, 2026 · Sofía',
  },
];

export const FEATURED_SERVICE = {
  titulo: 'Balayage Premium',
  descripcion:
    'Técnica de coloración natural que aporta luminosidad y dimensión a tu cabello.',
  precio: '$180',
  duracion: 'Aprox. 2 h 45 min',
  incluye:
    'Consulta de tonalidad, aplicación profesional y acabado con tratamiento protector.',
};

/** Lista extendida solo para pantalla «Historial completo» */
export const MOCK_HISTORIAL_COMPLETO = [
  ...MOCK_HISTORIAL,
  {
    id: 'h5',
    servicio: 'Manicure gel',
    precio: '$45',
    detalle: '10 Marzo, 2026 · Laura',
  },
  {
    id: 'h6',
    servicio: 'Depilación diseño',
    precio: '$35',
    detalle: '4 Marzo, 2026 · Ana',
  },
  {
    id: 'h7',
    servicio: 'Nutrición capilar',
    precio: '$55',
    detalle: '22 Febrero, 2026 · Carmen',
  },
  {
    id: 'h8',
    servicio: 'Maquillaje evento',
    precio: '$90',
    detalle: '14 Febrero, 2026 · Sofía',
  },
];
