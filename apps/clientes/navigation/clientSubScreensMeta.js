import { CLIENT_SUB } from './clientSubScreens';
import { FEATURED_SERVICE } from '../data/luxuryUiMocks';

function subReprogramar(strings) {
  return strings?.subScreens?.reprogramarSub ?? 'Tu cita · fecha y hora al enlazar la agenda';
}

/** Título y línea ayuda del encabezado de cada subpantalla */
export function getSubScreenTitles(id, strings) {
  const s = strings?.subScreens ?? {};
  const c = strings?.contacto ?? {};
  const p = strings?.pedidos ?? {};
  const cfg = strings?.config ?? {};

  switch (id) {
    case CLIENT_SUB.DETALLE_SERVICIO:
      return { title: FEATURED_SERVICE.titulo, subtitle: 'Detalle del servicio' };
    case CLIENT_SUB.AGENDAR_FLUJO:
      return { title: s.agendar ?? 'Agendar cita', subtitle: s.agendarSub ?? '' };
    case CLIENT_SUB.HISTORIAL_COMPLETO:
      return { title: s.historial ?? 'Historial completo', subtitle: s.historialSub ?? '' };
    case CLIENT_SUB.REPROGRAMAR_CITA:
      return { title: 'Reprogramar', subtitle: subReprogramar(strings) };
    case CLIENT_SUB.CONFIRMAR_CITA:
      return { title: 'Confirmación', subtitle: subReprogramar(strings) };
    case CLIENT_SUB.EDITAR_PERFIL:
      return { title: s.editProfile ?? 'Editar perfil', subtitle: s.editProfileSub ?? '' };
    case CLIENT_SUB.CONTACTO:
      return { title: c.title ?? 'Servicio al cliente', subtitle: c.subtitle ?? '' };
    case CLIENT_SUB.NOTIFICACIONES:
      return { title: s.eventos ?? 'Eventos Profesionales', subtitle: s.eventosSub ?? '' };
    case CLIENT_SUB.METODOS_PAGO:
      return { title: s.metodosPago ?? 'Métodos de pago', subtitle: s.metodosPagoSub ?? '' };
    case CLIENT_SUB.CONFIGURACION:
      return { title: cfg.title ?? 'Configuración', subtitle: cfg.subtitle ?? '' };
    case CLIENT_SUB.CERRAR_SESION:
      return { title: s.cerrarSesion ?? 'Cerrar sesión', subtitle: s.cerrarSesionSub ?? '' };
    case CLIENT_SUB.PRIVACIDAD:
      return { title: 'Privacidad', subtitle: 'Información sobre el tratamiento de datos.' };
    case CLIENT_SUB.TIENDA:
      return { title: s.tienda ?? 'Tienda', subtitle: s.tiendaSub ?? '' };
    case CLIENT_SUB.TENDENCIAS:
      return { title: s.tendencias ?? 'Tendencias', subtitle: s.tendenciasSub ?? '' };
    case CLIENT_SUB.PREMIOS:
      return { title: s.premios ?? 'Premios', subtitle: s.premiosSub ?? '' };
    case CLIENT_SUB.CARRITO:
      return { title: 'Carrito', subtitle: 'Productos seleccionados.' };
    case CLIENT_SUB.SERVICIOS_CARRITO:
      return {
        title: s.serviciosCarrito ?? 'Servicios por agendar',
        subtitle: s.serviciosCarritoSub ?? '',
      };
    case CLIENT_SUB.MIS_PEDIDOS:
      return { title: p.title ?? 'Mis pedidos', subtitle: p.subtitle ?? '' };
    case CLIENT_SUB.MEMBRESIAS:
      return { title: s.membresias ?? 'Membresías', subtitle: s.membresiasSub ?? '' };
    case CLIENT_SUB.MENSAJES:
      return { title: s.mensajes ?? 'Andreas Pro', subtitle: s.mensajesSub ?? '' };
    case CLIENT_SUB.MIS_FACTURAS:
      return { title: s.facturas ?? 'Mis facturas', subtitle: s.facturasSub ?? '' };
    default:
      return { title: s.default ?? 'Pantalla', subtitle: '' };
  }
}
