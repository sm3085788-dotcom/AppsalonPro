import es from './es';
import en from './en';

const STRINGS = { es, en };

export function getStrings(locale) {
  return STRINGS[locale === 'en' ? 'en' : 'es'] ?? es;
}

/** Resuelve "tabs.inicio" → string; soporta {var} en plantillas. */
export function t(strings, key, vars) {
  const parts = String(key || '').split('.');
  let cur = strings;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return key;
    cur = cur[p];
  }
  if (typeof cur !== 'string') return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

export function localeTag(locale) {
  return locale === 'en' ? 'en-US' : 'es-GT';
}

export { es, en };
