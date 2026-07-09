/** Formatea ACT-XXXXXX mientras el cliente escribe (inserta guion tras ACT). */
export function formatActivationCodeInput(raw: string): string {
  const compact = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!compact) return '';

  if (!compact.startsWith('A')) {
    if (/^\d/.test(compact)) {
      return `ACT-${compact.slice(0, 8)}`;
    }
    return compact.slice(0, 3);
  }

  if ('ACT'.startsWith(compact)) {
    return compact;
  }

  if (compact.startsWith('ACT')) {
    const suffix = compact.slice(3, 11);
    return suffix ? `ACT-${suffix}` : 'ACT';
  }

  return compact.slice(0, 3);
}
