/**
 * Categorías de servicio (inventario + app clientes).
 * Al crear un servicio en App Salón, se elige una de estas.
 */
export const SERVICIO_CATEGORIAS = [
  'Manicure',
  'Pedicure',
  'Corte y peinado',
  'Coloración',
  'Tratamientos capilares',
  'Keratina / alisado',
  'Facial / spa',
  'Maquillaje',
  'Cejas y pestañas',
  'Barbería',
  'Otro',
];

export function normalizeServicioCategoria(raw) {
  const t = String(raw || '').trim();
  if (!t) return 'Otro';
  const hit = SERVICIO_CATEGORIAS.find(
    (c) => c.toLowerCase() === t.toLowerCase(),
  );
  return hit || t;
}
