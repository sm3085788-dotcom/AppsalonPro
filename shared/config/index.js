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
  BOOKING_DEPOSIT_PERCENT,
  BOOKING_DEPOSIT_MIN_GTQ,
  BOOKING_REFUND_HOURS_BEFORE,
  PRECIO_A_TU_MEDIDA_LABEL,
  PRECIO_A_TU_MEDIDA_HINT,
  BOOKING_DEPOSIT_LABEL,
  BOOKING_DEPOSIT_POLICY,
  computeBookingDepositGtq,
  bookingRefundEligible,
  splitBookingNotas,
  mergeBookingNotas,
} from './reservaCheckout.js';
export {
  fetchBranchStock,
  isProductAvailableAtBranch,
  productStockFromRow,
  validateCartBranchStock,
} from './tiendaStock.js';
export { crearPedidoEfectivo, crearPedidoTarjetaPendiente, crearPedidoTarjetaDomicilioCapturada, crearPedidoWebEfectivo, crearPedidoWebTarjetaPendiente, confirmarCobroPedidoSalon } from './pedidoSalon.js';
export {
  isHomeDeliveryOrder,
  isRetiroSalonOrder,
  isCashPayment,
  isCardPayment,
  isPaymentCapturedInSnapshot,
  isPedidoTarjetaDomicilioCapturado,
  isPedidoTarjetaRetiroCapturado,
  isPendingCashOrder,
  needsPickupQr,
  canSalonConfirmarEntregaPedido,
} from './orderFulfillment.js';
export {
  isPaymentGatewayConfigured,
  isPaymentGatewayConfigured as isStripeConfigured,
  PAYMENT_CURRENCY,
  PAYMENT_COUNTRY,
  PAYMENT_CURRENCY as STRIPE_CHECKOUT_CURRENCY,
  PAYMENT_COUNTRY as STRIPE_CHECKOUT_COUNTRY,
  formatPaymentGtqLabel,
  formatPaymentGtqLabel as formatStripeGtqLabel,
  createDomicilioPaymentSession,
  createDomicilioPaymentSession as createStripePaymentIntent,
  createMembershipPaymentSession,
  createMembershipPaymentSession as createStripeMembershipPaymentIntent,
  finalizeQPayProDomicilioOrder,
  finalizeQPayProDomicilioOrder as finalizeStripeDomicilioOrder,
  checkoutDomicilioConQPayPro,
  checkoutDomicilioConQPayPro as checkoutDomicilioConStripe,
  checkoutMembresiaConQPayPro,
  checkoutMembresiaConQPayPro as checkoutMembresiaConStripe,
} from './paymentCheckout.js';
export {
  listSavedCardsUnavailable,
  saveCardUnavailable,
  detachSavedCardUnavailable,
  formatSavedCardLabel,
  formatSavedCardSub,
  listStripeSavedCards,
  saveCardWithStripeSetup,
  detachStripePaymentMethod,
} from './paymentSavedCards.js';
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
  WEB_CATALOG_URL,
  getWebCatalogUrl,
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
export {
  isClienteManual,
  isClienteWeb,
  isClienteAppVerificado,
  clienteOrigenLabel,
  CLIENTE_MANUAL_AURA,
  CLIENTE_WEB_AURA,
} from './clienteAppMeta.js';
export {
  MEMBRESIA_TIERS,
  MEMBRESIA_MONTHLY_GTQ,
  getMembresiaTier,
  membresiaLabel,
  getMembresiaMonthlyGtq,
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
  rowSucursalId,
  filterRowsBySucursal,
  resolveCitaCanal,
  formatCitaNotasDisplay,
} from './salonSucursalHelpers.js';
export {
  BOOKING_OPEN,
  BOOKING_CLOSE,
  SLOT_MINUTES,
  generateBookingSlots,
  combineDateAndSlot,
  getSlotStart,
  snapToBookingSlot,
  isValidBookingSlot,
  bookingSlotValidationError,
} from './bookingSlots.js';
export {
  CITA_CONGESTION_THRESHOLD,
  CITA_DEFAULT_DURATION_MINUTES,
  citaNoShowDeadline,
  isCitaPastNoShowWindow,
  isActiveCitaForCongestion,
  isSlotCongested,
  buildSlotDensityMap,
  isCitaInCongestedSlot,
} from './citaCongestion.js';
export {
  getClientSucursalId,
  setClientSucursalId,
  ensureClientSucursalId,
  mergeInventarioWithSucursalStock,
} from './clientSucursal.js';
export {
  startBranchBookingListener,
  fetchBookingDetail,
  branchChannelName,
  BOOKING_EVENT,
} from '../realtime/branchBookingListener.js';
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
export {
  GIFT_CARD_QR_PREFIX,
  GIFT_CARD_WEB_BASE,
  normalizeGiftCardCode,
  buildGiftCardQrPayload,
  parseGiftCardQrPayload,
  giftCardPublicUrl,
  giftCardQrImageUrl,
  giftCardCodesMatch,
} from './giftCardQr.js';
export {
  lookupGiftCardStaff,
  listGiftCardsStaff,
  searchGiftCardsStaff,
  looksLikeGiftCardQuery,
  activateGiftCardAtSalon,
  verifyGiftCardBirthday,
  registerGiftCardUse,
  lookupGiftCardPublic,
  normalizeGtWhatsappPhone,
  createGiftCardActivationCode,
  listGiftCardActivationCodesStaff,
  linkGiftCardToCliente,
  unlinkGiftCardFromCliente,
  lookupGiftCardForCliente,
  deleteGiftCardStaff,
  deleteGiftCardActivationCodeStaff,
  restoreGiftCardStaff,
  restoreGiftCardActivationCodeStaff,
} from './giftCardSalon.js';
export {
  enrollBirthdayClub,
  getBirthdayClubStatus,
  setBirthdayClubReaction,
  verifyBirthdayClubId,
  getBirthdayClubEnrollmentForCliente,
} from './birthdayClub.js';
