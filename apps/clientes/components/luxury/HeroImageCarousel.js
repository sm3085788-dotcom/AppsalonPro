import { LuxuryImageCarousel } from './LuxuryImageCarousel';
import { HOME_HERO_SLIDES } from '../../data/remoteHeroImages';
import { useClientLocale } from '../../hooks/useClientLocale';

/**
 * Carrusel hero (Inicio) — «Reserva tu cita». Slides remotos desde Marketing o mocks.
 */
export function HeroImageCarousel({ slides, onSlideAction, onAgendar, height }) {
  const { t } = useClientLocale();
  const list = slides?.length ? slides : HOME_HERO_SLIDES;
  const usePerSlide = slides?.length > 0;
  return (
    <LuxuryImageCarousel
      slides={list}
      perSlideOverlay={usePerSlide}
      buttonOnly
      buttonTitle={t('inicio.heroCta')}
      buttonVariant="heroGlass"
      onButtonPress={(current) => {
        if (onSlideAction) onSlideAction(current);
        else onAgendar?.();
      }}
      showAdvanceArrow={list.length > 1}
      autoAdvance={list.length > 1}
      edgeToEdge
      dockTop
      squareCorners
      height={height}
    />
  );
}
