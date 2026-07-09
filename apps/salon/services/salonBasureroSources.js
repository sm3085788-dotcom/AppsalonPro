/** Etiquetas de origen para el basurero y filtros de la app Salón. */
export const BASURERO_SOURCE_LABELS = {
  marketing_posts: 'Marketing',
  inventario: 'Inventario',
  proveedores: 'Proveedores',
  clientes: 'Clientes',
  empleados: 'Empleados',
  incidentes: 'Incidentes',
  citas: 'Citas (agenda)',
  ventas: 'Papelería · ventas',
  papeleria: 'Papelería · ventas',
  mensajes: 'Mensajes',
  pedidos: 'Pedidos e-commerce',
  gift_cards: 'Tarjetas regalo',
  gift_card_activation_codes: 'Tarjetas regalo · códigos',
  sucursales: 'Sucursales',
};

export const BASURERO_KNOWN_SOURCES = new Set(Object.keys(BASURERO_SOURCE_LABELS));

export function basureroSourceLabel(source) {
  return BASURERO_SOURCE_LABELS[source] || String(source || 'desconocido');
}

/** Mapea id de módulo del panel de control al `source` del basurero. */
export function controlPanelActionToSource(actionId) {
  if (actionId === 'papeleria' || actionId === 'ventas_chain') return 'ventas';
  if (actionId === 'tarjetas_regalo') return 'gift_cards';
  if (actionId === 'unete_equipo') return 'unete_equipo';
  return actionId;
}
