import {
  CalendarRange,
  Wallet,
  Users,
  UsersRound,
  Target,
  BarChart3,
  Megaphone,
  MessageSquare,
  LayoutDashboard,
  AlertTriangle,
  Boxes,
  Trash2,
  ScrollText,
  Truck,
  ClipboardList,
} from 'lucide-react-native';

/**
 * Módulos del panel de administración (orden fijo).
 * @type {Array<{
 *   id: string,
 *   title: string,
 *   subtitle: string,
 *   Icon: import('react').ComponentType<{ size?: number, color?: string, strokeWidth?: number }>,
 * }>}
 */
export const SALON_MODULES = [
  {
    id: 'agenda',
    title: 'Agenda',
    subtitle: 'Citas y calendario operativo',
    Icon: CalendarRange,
  },
  {
    id: 'cajas',
    title: 'Caja',
    subtitle: 'Arqueos, turnos de caja y movimientos',
    Icon: Wallet,
  },
  {
    id: 'clients',
    title: 'Clientes',
    subtitle: 'Perfiles App Clientes y fichas manuales',
    Icon: Users,
  },
  {
    id: 'empleados',
    title: 'Empleados',
    subtitle: 'Fichas del equipo (sin acceso a la app ni caja)',
    Icon: UsersRound,
  },
  {
    id: 'goals',
    title: 'Metas',
    subtitle: 'Objetivos y seguimiento del equipo',
    Icon: Target,
  },
  {
    id: 'reportes',
    title: 'Reportes',
    subtitle: 'Indicadores y exportaciones',
    Icon: BarChart3,
  },
  {
    id: 'marketing',
    title: 'Marketing',
    subtitle: 'Fotos y videos para Tendencias (App Clientes)',
    Icon: Megaphone,
  },
  {
    id: 'mensajes',
    title: 'Mensajes',
    subtitle: 'Comunicación con clientes',
    Icon: MessageSquare,
  },
  {
    id: 'panel',
    title: 'Panel de control',
    subtitle: 'Resumen y KPIs del salón',
    Icon: LayoutDashboard,
  },
  {
    id: 'incidentes',
    title: 'Incidentes',
    subtitle: 'Accidentes físicos o materiales, PDF y firmas',
    Icon: AlertTriangle,
  },
  {
    id: 'inventory',
    title: 'Inventario',
    subtitle: 'Catálogo tienda: productos y servicios',
    Icon: Boxes,
  },
  {
    id: 'basurero',
    title: 'Basurero general',
    subtitle: 'Elementos eliminados y recuperación',
    Icon: Trash2,
  },
  {
    id: 'papeleria',
    title: 'Papelería',
    subtitle: 'Facturas de ventas registradas por el equipo (caja / POS)',
    Icon: ScrollText,
  },
  {
    id: 'proveedores',
    title: 'Proveedores',
    subtitle: 'Compañías: datos de contacto y logo',
    Icon: Truck,
  },
  {
    id: 'pedidos',
    title: 'Pedidos',
    subtitle: 'Compras, consultas Tendencias y carrusel inicio',
    Icon: ClipboardList,
  },
];

export function getModuleById(id) {
  return SALON_MODULES.find((m) => m.id === id) ?? null;
}

export function filterModulesBySearch(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.subtitle.toLowerCase().includes(q),
  );
}
