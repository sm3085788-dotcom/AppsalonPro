import { formatPersonNameInput } from '@/lib/clientDisplayName';

/** Ciudad + artículo + departamento/lugar (ej. Guastatoya el Progreso). */
const CITY_DEPT_PATTERN = /^(.+?)\s+(El|La|Los|Las|Del|De|Y)\s+(.+)$/i;

/** Capitaliza cada palabra mientras se escribe. */
export function formatAddressInput(raw: string): string {
  return formatPersonNameInput(raw);
}

/** Al salir del campo: mayúsculas, comas entre segmentos y formato ciudad/departamento. */
export function polishAddress(raw: string): string {
  const collapsed = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';

  if (collapsed.includes(',')) {
    return collapsed
      .split(',')
      .map((part) => polishAddressSegment(part.trim()))
      .filter(Boolean)
      .join(', ');
  }

  return polishAddressSegment(collapsed);
}

function polishAddressSegment(segment: string): string {
  const titled = formatPersonNameInput(segment);
  if (!titled) return '';

  const dept = titled.match(CITY_DEPT_PATTERN);
  if (dept) {
    const [, city, article, rest] = dept;
    return `${city}, ${article} ${rest}`;
  }

  return titled;
}
