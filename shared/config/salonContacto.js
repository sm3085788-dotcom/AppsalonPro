/** Datos del salón para mapas y contacto (App Clientes / mensajes). */
export const SALON_CONTACTO = {
  nombre: "Andrea's salón",
  whatsapp: '50247132123',
  telefonoLabel: '+502 4713 2123',
  direccion: 'Progreso, Guastatoya',
  plusCode: 'VW2J+69F',
  mapsQuery: 'VW2J+69F, Guastatoya, Guatemala',
  latitude: 14.850553,
  longitude: -90.069092,
  wazeUrl:
    'https://ul.waze.com/ul?ll=14.85056726%2C-90.06908298&navigate=yes&zoom=17&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location',
  appleUrl: 'https://maps.apple/p/SErM5cbbv_5Puj',
};

export function getSalonMapLinks() {
  const { latitude: lat, longitude: lng, wazeUrl, appleUrl } = SALON_CONTACTO;
  const coords = encodeURIComponent(`${lat},${lng}`);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${coords}`,
    waze: wazeUrl,
    apple: appleUrl,
  };
}

export function getSalonGoogleMapsUrl() {
  return getSalonMapLinks().google;
}
