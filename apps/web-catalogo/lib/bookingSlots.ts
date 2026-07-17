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
  defaultBookingDateString,
  formatBookingSlotLabel,
} from '../../../shared/config/bookingSlots.js';

export {
  BOOKING_TIMEZONE,
  zonedCalendarDateString,
  getSlotStartFromInstant,
  dayInstantRangeForCalendarDate,
  parseBookingZonedParts,
  instantFromDateAndSlotGT,
  defaultBookingDateStringGT,
  snapToBookingSlotGT,
} from '../../../shared/config/bookingTimezone.js';

export {
  CITA_CONGESTION_THRESHOLD,
  CITA_CONGESTION_GENERAL,
  CITA_DEFAULT_DURATION_MINUTES,
  citaNoShowDeadline,
  isCitaPastNoShowWindow,
  isActiveCitaForCongestion,
  isSlotCongested,
  buildServicioCategoriaLookup,
  resolveCitaCongestionCategoria,
  citaMatchesCongestionCategoria,
  buildSlotDensityMap,
  isCitaInCongestedSlot,
} from '../../../shared/config/citaCongestion.js';

export { localCalendarDateString } from '../../../shared/config/localDate.js';
export { normalizeServicioCategoria } from '../../../shared/config/servicioCategorias.js';
