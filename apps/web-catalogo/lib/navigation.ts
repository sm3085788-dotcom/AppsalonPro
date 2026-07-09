export type NavLink = {
  href: string;
  label: string;
};

export const NAV_PRIMARY: NavLink[] = [
  { href: '/servicios', label: 'Servicios' },
  { href: '/productos', label: 'Productos' },
  { href: '/reservar', label: 'Agendar cita' },
  { href: '/membresias', label: 'Membresías' },
];

export const NAV_MORE: NavLink[] = [
  { href: '/tu-cumpleanos', label: 'Tu Cumpleaños' },
  { href: '/unete-al-equipo', label: 'Únete al Equipo' },
  { href: '/#tarjeta-regalo', label: 'Tarjeta de regalo' },
  { href: '/#resenas', label: 'Reseñas' },
  { href: '/#contacto', label: 'Contacto' },
];

export const NAV_ALL: NavLink[] = [...NAV_PRIMARY, ...NAV_MORE];
