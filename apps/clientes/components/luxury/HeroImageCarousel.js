import { LuxuryImageCarousel } from './LuxuryImageCarousel';
import { HOME_HERO_SLIDES } from '../../data/remoteHeroImages';

/**
 * Carrusel hero (Inicio) — «Reserva tu cita». Slides remotos desde Marketing o mocks.
 */
export function HeroImageCarousel({ slides, onAgendar, height }) {
  const list = slides?.length ? slides : HOME_HERO_SLIDES;
  const usePerSlide = slides?.length > 0;
  return (
    <LuxuryImageCarousel
      slides={list}
      perSlideOverlay={usePerSlide}
      overlayKicker="Tu próxima experiencia"
      headline="Reserva tu cita"
      body="Descubre el arte de la belleza con nuestros estilistas expertos."
      buttonTitle="Agendar ahora"
      buttonVariant="heroGold"
      onButtonPress={onAgendar}
      showAdvanceArrow={list.length > 1}
      autoAdvance={list.length > 1}
      edgeToEdge
      dockTop
      squareCorners
      height={height}
    />
  );
}
