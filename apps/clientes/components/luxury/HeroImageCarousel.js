import { LuxuryImageCarousel } from './LuxuryImageCarousel';
import { HOME_HERO_SLIDES } from '../../data/remoteHeroImages';

/**
 * Carrusel automático (Inicio) — imágenes remotas salón / citas.
 */
export function HeroImageCarousel({ onAgendar }) {
  return (
    <LuxuryImageCarousel
      slides={HOME_HERO_SLIDES}
      overlayKicker="Tu próxima experiencia"
      headline="Reserva tu cita"
      body="Descubre el arte de la belleza con nuestros estilistas expertos."
      buttonTitle="Agendar ahora"
      buttonVariant="heroGold"
      onButtonPress={onAgendar}
      edgeToEdge
      dockTop
      squareCorners
    />
  );
}
