/** Capitaliza la inicial de cada nombre y apellido (p. ej. «andrea morales» → «Andrea Morales»). */
export function formatPersonName(raw: string): string {
  const trimmed = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';

  return trimmed
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((segment) => {
          if (!segment) return segment;
          const lower = segment.toLocaleLowerCase('es');
          return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
        })
        .join('-'),
    )
    .join(' ');
}
