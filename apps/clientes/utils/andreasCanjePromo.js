/** No acumular canje ANDREAS sobre artículos con precio promocional vigente. */

export function itemHasPromocionVigente(item) {
  if (!item || typeof item !== 'object') return false;
  return Boolean(item.promocionVigente);
}

export function cartHasPromoItems(items) {
  if (!Array.isArray(items) || !items.length) return false;
  return items.some(itemHasPromocionVigente);
}

/** Subtotal del carrito al que puede aplicarse canje (solo líneas sin promo). */
export function subtotalEligibleForAndreasCanje(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  return items.reduce((acc, item) => {
    if (itemHasPromocionVigente(item)) return acc;
    const unit = Number(item.priceAmount ?? item.precio ?? 0);
    const qty = Number(item.qty ?? 1);
    if (!Number.isFinite(unit) || unit <= 0) return acc;
    return acc + unit * (Number.isFinite(qty) && qty > 0 ? qty : 1);
  }, 0);
}

/** True si no queda ninguna línea elegible para canje (todo en promo o sin precio). */
export function itemsBlockAndreasCanje(items) {
  if (!Array.isArray(items) || !items.length) return false;
  return subtotalEligibleForAndreasCanje(items) <= 0 && cartHasPromoItems(items);
}

export function servicioBlocksAndreasCanje(servicio) {
  return itemHasPromocionVigente(servicio);
}

/** Primer ítem del carrito sin promoción (servicios / tienda). */
export function firstItemEligibleForAndreasCanje(items) {
  if (!Array.isArray(items)) return null;
  return items.find((item) => !itemHasPromocionVigente(item)) ?? null;
}

export const ANDREAS_CANJE_PROMO_BLOCK_MSG =
  'Los premios ANDREAS no aplican en productos o servicios en promoción vigente.';

export const ANDREAS_CANJE_PROMO_PARTIAL_MSG =
  'El canje ANDREAS solo aplica a artículos sin promoción vigente; los productos en promo mantienen su precio promocional.';
