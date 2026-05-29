/**
 * Punto de entrada de @appsalon/shared-config.
 * Carga supabaseClient primero; los módulos de dominio importan `db` sin ciclo.
 */
export * from './supabaseClient.js';
export { upsertPushDeviceToken } from './pushTokens.js';
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
export { crearPedidoEfectivo, crearPedidoTarjetaPendiente, confirmarCobroPedidoSalon } from './pedidoSalon.js';
export { fetchClientMisFacturas } from './clientVentas.js';
export {
  CLIENTE_ENVIO_JSON_MARK,
  splitClienteNotasEnvio,
  mergeClienteNotasEnvio,
  normalizeEnvioGuardado,
} from './clienteEnvioTienda.js';
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
  clientToggleMarketingLike,
  clientMarketingLikedPostIds,
  fetchMarketingEngagementSince,
  fetchMarketingEngagementFeed,
} from './marketingEngagement.js';
export {
  isTendenciasFeedPost,
  buildTendenciasPublicationMap,
  getTendenciasPublicationNo,
  countTendenciasPublications,
  enrichTendenciasFeedPosts,
  formatTendenciasPublicationLine,
} from './tendenciasPublication.js';
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
  mergeAuraMessage,
  sortAuraMessages,
} from './auraLineClient.js';
export { sendSalonAuraMessage } from './auraLineSalon.js';
export {
  syncClientNotifPrefsToServer,
  upsertClientPushToken,
  enqueueClientNotification,
  fetchClientNotifications,
  fetchClientNotificationsUnreadCount,
  fetchClientInboxUnreadCount,
  markClientNotificationsRead,
  markAllClientNotificationsRead,
  notifyClientSalonMessage,
  notifyClientFromMdmId,
  notifyClientPedidoStatus,
  resolveClientUserIdFromClienteId,
  DEFAULT_CLIENT_NOTIF_PREFS_REMOTE,
  CLIENT_NOTIF_PREF_KEYS,
} from './clientNotifications.js';
export {
  buildCitaConfirmacionPayload,
  parseCitaConfirmacionContent,
  citaConfirmacionPreviewText,
  resolveCitaConfirmacionNote,
  resolveCitaConfirmacionNoteSegments,
  resolveCitaConfirmacionUbicacion,
  CITA_COMPROMISO_NOTE,
  CITA_COMPROMISO_NOTE_SEGMENTS,
  CITA_UBICACION_HINT,
} from './citaConfirmacionMessage.js';
export {
  buildCarouselOverlayFromInventario,
  parseHomeCarouselOverlay,
  mapHomeCarouselPostToClientSlide,
} from './homeCarouselOverlay.js';
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
export {
  ANDREAS_META,
  parseSalonFisicoUnidades,
  mergeAndreasPremiosSalonFisico,
  isPedidoAppEfectivoRetiroSalon,
  isPedidoAppTarjetaDelivery,
} from './andreasPremios.js';
export {
  SERVICIO_CATEGORIAS,
  normalizeServicioCategoria,
} from './servicioCategorias.js';
