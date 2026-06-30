/**
 * Punto de entrada de @appsalon/shared-config.
 * Carga supabaseClient primero; los módulos de dominio importan `db` sin ciclo.
 */
export * from './supabaseClient.js';
export { localCalendarDateString } from './localDate.js';
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
export {
  fetchBranchStock,
  isProductAvailableAtBranch,
  productStockFromRow,
  validateCartBranchStock,
} from './tiendaStock.js';
export { crearPedidoEfectivo, crearPedidoTarjetaPendiente, crearPedidoTarjetaDomicilioCapturada, confirmarCobroPedidoSalon } from './pedidoSalon.js';
export {
  isHomeDeliveryOrder,
  isRetiroSalonOrder,
  isCashPayment,
  isCardPayment,
  isPaymentCapturedInSnapshot,
  isPedidoTarjetaDomicilioCapturado,
  isPendingCashOrder,
  needsPickupQr,
  canSalonConfirmarEntregaPedido,
} from './orderFulfillment.js';
export {
  isStripeConfigured,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_CHECKOUT_CURRENCY,
  STRIPE_CHECKOUT_COUNTRY,
  formatStripeGtqLabel,
  createStripePaymentIntent,
  finalizeStripeDomicilioOrder,
  checkoutDomicilioConStripe,
} from './stripeCheckout.js';
export {
  ensureStripeCustomer,
  createStripeSetupIntent,
  listStripeSavedCards,
  detachStripePaymentMethod,
  saveCardWithStripeSetup,
  formatSavedCardLabel,
  formatSavedCardSub,
} from './stripeSavedCards.js';
export {
  validateTarjetaForm,
  detectCardBrand,
  formatCardNumberDisplay,
  formatCardExpDisplay,
  digitsOnly,
} from './tarjetaCheckout.js';
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
  PROMO_INVENTARIO_CONTENT_TYPE,
  parsePromoInventarioContent,
  formatPromoInventarioContent,
  promoInventarioPreviewText,
  isPromoInventarioMessage,
  resolveInventarioPromoActionTarget,
} from './promoInventarioChat.js';
export {
  fetchClientPromosVigentesForChat,
  expandAuraMessagesWithLivePromos,
  collapsePromoChatRowsForDisplay,
  isPromoIntroSalonChat,
  inventarioRowToPromoChatPayload,
} from './clientChatPromos.js';
export {
  fetchClientAuraMessages,
  fetchClientAuraUnreadCount,
  markClientAuraDelivered,
  sendClientAuraChat,
  isSalonOutboundMessage,
  isInboundAuraUnread,
  mergeAuraMessage,
  sortAuraMessages,
} from './auraLineClient.js';
export { sendSalonAuraMessage } from './auraLineSalon.js';
export {
  CHAT_QUICK_INTENTS,
  CLIENT_CHAT_QUICK_ACTIONS,
  matchChatQuickIntent,
  getChatQuickIntentById,
  getSalonSuggestedReply,
  listChatQuickIntentsForAutomation,
} from './chatQuickActions.js';
export { getChatAutomationSettings, setChatAutomationEnabled } from './chatAutomationSalon.js';
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
  SALON_CONTACTO,
  getSalonMapLinks,
  getSalonGoogleMapsUrl,
} from './salonContacto.js';
export {
  buildCarouselOverlayFromInventario,
  parseHomeCarouselOverlay,
  mapHomeCarouselPostToClientSlide,
  enrichHomeCarouselSlidesWithInventario,
  isCarouselSlideProducto,
  normalizeInventarioCarouselId,
  resolveCarouselButtonTitle,
  carouselArticuloTipoFromSlide,
  resolveCarouselArticuloTipo,
  buildHomeCarouselMarketingPayload,
  buildHomeHeroMarketingPayload,
  mapHomeHeroPostToClientSlide,
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
  parseSalonFisicoCanjePendiente,
  mergeAndreasPremiosSalonFisico,
  isPedidoAppEfectivoRetiroSalon,
  isPedidoAppTarjetaDelivery,
} from './andreasPremios.js';
export {
  PREMIO_REGLA,
  applyDiscountToSubtotal,
  findCanjePendienteForCheckout,
  findCanjePendienteForCitas,
  syncReglaCitasOnCanjeRedeemed,
  parseCanjeFromCheckoutSnapshot,
  andreasMetaAppForMembresia,
  resolveCheckoutCanjeParaCliente,
} from './andreasPremiosCycles.js';
export {
  resolvePrecioServicioConCanjeCitas,
  mergeNotasServicioConCanje,
  parseCanjeFromNotasServicio,
  stripCanjeMarkerFromNotas,
  pickBestCanjeServicio,
} from './andreasPremiosCitasAgenda.js';
export {
  resolveSalonCanjeParaCliente,
  calcSalonCanjeDescuentoEnLineas,
  countProductoQtyEnLineasVenta,
  andreasMetaSalonForMembresia,
} from './andreasPremiosSalonVenta.js';
export {
  resolveCitasCanjeParaCliente,
  calcCitasCanjeDescuentoEnLineas,
  countServicioQtyEnLineasVenta,
  ensureCitasCanjeEnAp,
  labelCanjeAndreasCliente,
} from './andreasPremiosSalonServicio.js';
export {
  mergeVentaNotasConCanjeSalon,
  parseSalonCanjeFromVentaNotas,
  stripSalonCanjeMarkerFromVentaNotas,
  SALON_CANJE_VENTA_MARK,
} from './andreasPremiosCycles.js';
export {
  ANDREAS_REFERRAL_PRIZES,
  ANDREAS_REFERRAL_META,
  getReferralPrizeByCiclo,
  parseReferidosPremiosState,
  resolveReferidosCanjePendiente,
  findCanjePendienteForReferidos,
  syncReferidosOnCanjeRedeemed,
  REFERRAL_PRIZE_SERVICIO_DISCOUNT,
} from './andreasReferidos.js';
export { computeMembresiaStatusFromRow } from './membresiaStatus.js';
export {
  isSalonGlobalAdmin,
  isSalonSucursalAdmin,
  canAccessSalonApp,
  isSalonAdminRole,
  normalizeProfileRole,
} from './salonRoles.js';
export {
  setSalonSessionProfile,
  getSalonSessionProfile,
  clearSalonSessionProfile,
  getSalonSucursalScope,
  requireSalonSucursalId,
  getSalonBranchDisplayName,
  enrichSalonSessionProfile,
} from './salonSession.js';
export {
  getClientSucursalId,
  setClientSucursalId,
  ensureClientSucursalId,
  mergeInventarioWithSucursalStock,
} from './clientSucursal.js';
export {
  ANDREAS_ORDER_STATUSES_PENDIENTES,
  CITA_ESTADOS_PENDIENTES_PREMIO,
  parseReferidoInvitadoState,
  tallyAndreasProductoPuntos,
  countCitasPremios,
  REFERIDO_PREMIOS_COPY,
} from './referidoPremios.js';
export {
  normalizeReferralCode,
  isAndreasReferralCode,
  buildReferralInviteUrl,
  buildReferralShareMessage,
  parseReferralCodeFromUrl,
  storePendingReferralCode,
  peekPendingReferralCode,
  consumePendingReferralCode,
  resolveReferralCodeForAuth,
  getReferralCodeFromUserMetadata,
  isAuthRedirectUrl,
  REFERRAL_PENDING_STORAGE_KEY,
  REFERRAL_LINK_PATH,
} from './referralInvite.js';
export {
  buildVisitaQrPayload,
  parseVisitaQrPayload,
  visitaTokensMatch,
  visitaQrImageUrl,
  VISITA_QR_PREFIX,
} from './visitaQr.js';
export {
  STOCK_TRANSFER_QR_PREFIX,
  buildStockTransferPayload,
  buildStockTransferQrPayload,
  parseStockTransferQrPayload,
  stockTransferQrImageUrl,
  stockTransferSucursalMatches,
} from './stockTransferQr.js';
export {
  SERVICIO_CATEGORIAS,
  normalizeServicioCategoria,
} from './servicioCategorias.js';
export {
  inventarioRowImageUrls,
  resolveInventarioCarouselMediaUrl,
  servicioCarouselFallbackUri,
} from './servicioCarouselFallback.js';
