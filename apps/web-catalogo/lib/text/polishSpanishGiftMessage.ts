const EMOTIONAL_HINT =
  /\b(te quiero|te amo|feliz|disfrut|amor|gracias|besos|abrazo|merec|especial|regalo|consiente|celebr)\b/i;

const TYPO_MAP: Record<string, string> = {
  xq: 'porque',
  xke: 'porque',
  pq: 'porque',
  tb: 'también',
  tmb: 'también',
  xfa: 'por favor',
  pf: 'por favor',
  porfa: 'por favor',
  mcho: 'mucho',
  quuiero: 'quiero',
  qiero: 'quiero',
  kiero: 'quiero',
  felis: 'feliz',
  dioste: 'Dios te',
  muchas: 'muchas',
};

function fixToken(token: string): string {
  const match = token.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}'-]+)([^\p{L}\p{N}]*)$/u);
  if (!match) return token;
  const [, lead, core, trail] = match;
  const lower = core.toLowerCase();
  const replacement = TYPO_MAP[lower];
  if (!replacement) return token;
  const nextCore =
    core[0] === core[0].toUpperCase()
      ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
      : replacement;
  return `${lead}${nextCore}${trail}`;
}

function capitalizeSentenceStarts(text: string): string {
  if (!text) return text;
  const first = text.charAt(0).toUpperCase() + text.slice(1);
  return first.replace(/([.!?…]\s+)(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

function ensureSpanishPunctuation(text: string): string {
  let next = text;

  if (next.includes('!') && !next.startsWith('¡')) {
    next = `¡${next}`;
  }
  if (next.includes('?') && !next.startsWith('¿') && !next.startsWith('¡')) {
    next = `¿${next}`;
  }

  if (!/[.!?…]$/.test(next)) {
    if (next.startsWith('¿')) {
      next += '?';
    } else if (next.startsWith('¡') || EMOTIONAL_HINT.test(next)) {
      if (!next.startsWith('¡')) next = `¡${next}`;
      next += '!';
    } else {
      next += '.';
    }
  }

  if (next.endsWith('!') && !next.startsWith('¡')) {
    next = `¡${next}`;
  }
  if (next.endsWith('?') && !next.startsWith('¿')) {
    next = `¿${next}`;
  }

  return next;
}

/** Ortografía básica, mayúsculas y signos ¡! ¿? para mensajes de tarjeta regalo. */
export function polishSpanishGiftMessage(raw: string, maxLen = 150): string {
  const collapsed = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!collapsed) return '';

  const wordsFixed = collapsed
    .split(' ')
    .map((word) => fixToken(word))
    .join(' ');

  const capped = capitalizeSentenceStarts(wordsFixed);
  const punctuated = ensureSpanishPunctuation(capped);

  return punctuated.slice(0, maxLen);
}
