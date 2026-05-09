import { FEATURED_SERVICE, MOCK_PROXIMA_CITA } from '../data/luxuryUiMocks';
import { CLIENT_SUB } from './clientSubScreens';

function subReprogramar() {
  return `${MOCK_PROXIMA_CITA.servicio} · ${MOCK_PROXIMA_CITA.fechaLabel}`;
}

/** Título y línea ayuda del encabezado de cada subpantalla */
export function getSubScreenTitles(id) {
  switch (id) {
    case CLIENT_SUB.DETALLE_SERVICIO:
      return { title: FEATURED_SERVICE.titulo, subtitle: 'Detalle del servicio' };
    case CLIENT_SUB.AGENDAR_FLUJO:
      return { title: 'Agendar cita', subtitle: 'Flujo de ejemplo (sin reserva real).' };
    case CLIENT_SUB.HISTORIAL_COMPLETO:
      return { title: 'Historial completo', subtitle: 'Todas tus visitas registradas (demo).' };
    case CLIENT_SUB.REPROGRAMAR_CITA:
      return { title: 'Reprogramar', subtitle: subReprogramar() };
    case CLIENT_SUB.CONFIRMAR_CITA:
      return { title: 'Confirmación', subtitle: subReprogramar() };
    case CLIENT_SUB.EDITAR_PERFIL:
      return { title: 'Editar perfil', subtitle: 'Tus datos (solo vista previa).' };
    case CLIENT_SUB.CONTACTO:
      return { title: 'Contacto', subtitle: 'Canales directos del salón.' };
    case CLIENT_SUB.NOTIFICACIONES:
      return { title: 'Notificaciones', subtitle: 'Preferencias de avisos.' };
    case CLIENT_SUB.METODOS_PAGO:
      return { title: 'Métodos de pago', subtitle: 'Formas de pago guardadas (demo).' };
    case CLIENT_SUB.CONFIGURACION:
      return { title: 'Configuración', subtitle: 'Ajustes generales de la app.' };
    case CLIENT_SUB.CERRAR_SESION:
      return { title: 'Cerrar sesión', subtitle: 'Confirma si deseas salir de la cuenta.' };
    case CLIENT_SUB.PRIVACIDAD:
      return { title: 'Privacidad', subtitle: 'Información sobre el tratamiento de datos.' };
    case CLIENT_SUB.TIENDA:
      return { title: 'Tienda', subtitle: 'Catálogo del salón · rejilla de productos' };
    case CLIENT_SUB.TENDENCIAS:
      return { title: 'Tendencias', subtitle: 'Looks e inspiración (demo).' };
    case CLIENT_SUB.PREMIOS:
      return { title: 'Premios', subtitle: 'Tu programa de recompensas (demo).' };
    case CLIENT_SUB.CARRITO:
      return { title: 'Carrito', subtitle: 'Productos seleccionados (demo).' };
    default:
      return { title: 'Pantalla', subtitle: '' };
  }
}
