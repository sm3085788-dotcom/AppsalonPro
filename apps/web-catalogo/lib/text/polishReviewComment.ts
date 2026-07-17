/** Correcciones frecuentes en reseñas informales (sin IA externa). */
const PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\bme encanto\b/gi, 'me encantó'],
  [/\bme gusto\b/gi, 'me gustó'],
  [/\bespero\s+(?!que\b)/gi, 'espero que '],
  [/\brecomiendo mucho\b/gi, 'recomiendo mucho'],
];

const WORD_FIXES: Array<[RegExp, string]> = [
  [/\btambien\b/gi, 'también'],
  [/\basi\b/gi, 'así'],
  [/\bmas\b/gi, 'más'],
  [/\bincreible\b/gi, 'increíble'],
  [/\brecepcion\b/gi, 'recepción'],
  [/\batencion\b/gi, 'atención'],
  [/\bsalon\b/gi, 'salón'],
  [/\bencanto\b/gi, 'encantó'],
];

function applyFixes(text: string): string {
  let out = text.replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of PHRASE_FIXES) {
    out = out.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of WORD_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function splitClauses(text: string): string[] {
  const byPunctuation = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byPunctuation.length > 1) return byPunctuation;

  const byConjunction = text
    .split(/\s+(?=(?:espero|pero|aunque|además|también|sin embargo)\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return byConjunction.length > 0 ? byConjunction : [text];
}

function capitalizeClause(clause: string): string {
  const trimmed = clause.trim();
  if (!trimmed) return '';
  const lead = trimmed.startsWith('¡') ? '¡' : '';
  const body = lead ? trimmed.slice(1) : trimmed;
  if (!body) return trimmed;
  return lead + body.charAt(0).toLocaleUpperCase('es') + body.slice(1);
}

function addExclamation(clause: string): string {
  const trimmed = clause.trim();
  if (!trimmed) return '';
  if (/[!?]$/.test(trimmed) || trimmed.endsWith('…')) return trimmed;

  let out = trimmed;
  if (!out.startsWith('¡')) out = `¡${out}`;
  if (!out.endsWith('!')) out = `${out}!`;
  return out;
}

/**
 * Pulido al salir del campo: ortografía común, mayúscula inicial y signos de admiración.
 */
export function polishReviewComment(raw: string): string {
  const normalized = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const fixed = applyFixes(normalized);
  const clauses = splitClauses(fixed);
  return clauses
    .map((clause) => addExclamation(capitalizeClause(clause)))
    .join(' ');
}
