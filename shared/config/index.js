/**
 * Punto de entrada de @appsalon/shared-config.
 * Carga supabaseClient primero; los módulos de dominio importan `db` sin ciclo.
 */
export * from './supabaseClient.js';
export {
  getMetaGlobal,
  guardarMetaGlobal,
  registrarMontoVentaEnMeta,
  progresoMetaPct,
  reiniciarMetaGlobal,
  renovarMetaGlobal,
  formatMetaQ,
  metaVigente,
  parseMontoInput,
  formatMontoInputLive,
  montoInputFromNumber,
} from './metaGlobal.js';
export { confirmarCompraConTarjeta, mapInventarioToTiendaProduct, buildTiendaProductFicha } from './tiendaCheckout.js';
export { crearPedidoEfectivo, confirmarCobroPedidoSalon } from './pedidoSalon.js';
export { requireCajaAbierta } from './cajaGuard.js';
export {
  buildPickupQrPayload,
  parsePickupQrPayload,
  pickupQrImageUrl,
  trackingCodesMatch,
  PICKUP_QR_PREFIX,
} from './pickupQr.js';
export { registerMarketingInterest, MARKETING_INTEREST_TYPES } from './marketingInterest.js';
export {
  parseBroadcastContent,
  formatBroadcastContent,
  broadcastPreviewText,
  buildBroadcastActionMessage,
  BROADCAST_PROMO_ACTIONS,
  BROADCAST_LINK_TYPES,
} from './broadcastPromo.js';
export {
  fetchClientAuraMessages,
  fetchClientAuraUnreadCount,
  markClientAuraDelivered,
  sendClientAuraChat,
  isSalonOutboundMessage,
} from './auraLineClient.js';
export {
  buildIncidentClientMessage,
  sendIncidentReportToClient,
  INCIDENT_REPORT_CONTENT_TYPE,
} from './incidentAuraLine.js';
export { isClienteManual, isClienteAppVerificado, CLIENTE_MANUAL_AURA } from './clienteAppMeta.js';
export {
  MEMBRESIA_TIERS,
  getMembresiaTier,
  membresiaLabel,
  isMembresiaNivelValid,
  buildMembresiaCodigo,
  normalizeMembresiaCodigoInput,
} from './membresias.js';
