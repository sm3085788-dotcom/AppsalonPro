import { MapPin } from 'lucide-react-native';

/** Pin de ubicación simple (misma escala que logos de contacto). */
export function LocationOnIcon({ size = 28, color = '#C5A368' }) {
  return <MapPin size={size} color={color} strokeWidth={2} />;
}
