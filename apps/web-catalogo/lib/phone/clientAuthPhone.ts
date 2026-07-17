export type ClientAuthCountry = 'gt' | 'us_ca';

const GT_PREFIX = '+502';
const US_CA_PREFIX = '+1';
const BRANCH_INTERNAL_PREFIX = '+502999';

const GT_LOCAL_LEN = 8;
const US_CA_LOCAL_LEN = 10;

export function isBranchInternalPhone(e164: string | null | undefined): boolean {
  const t = String(e164 || '').trim();
  return t.startsWith(BRANCH_INTERNAL_PREFIX);
}

export function parseStoredPhone(
  e164: string | null | undefined,
): { country: ClientAuthCountry; localDigits: string } | null {
  const t = String(e164 || '').trim();
  if (!t) return null;

  if (t.startsWith(GT_PREFIX) && !isBranchInternalPhone(t)) {
    const local = t.slice(GT_PREFIX.length).replace(/\D/g, '');
    if (local.length >= GT_LOCAL_LEN) {
      return { country: 'gt', localDigits: local.slice(-GT_LOCAL_LEN) };
    }
  }

  if (t.startsWith(US_CA_PREFIX)) {
    const local = t.slice(US_CA_PREFIX.length).replace(/\D/g, '');
    if (local.length >= US_CA_LOCAL_LEN) {
      return { country: 'us_ca', localDigits: local.slice(-US_CA_LOCAL_LEN) };
    }
  }

  const digits = t.replace(/\D/g, '');
  if (digits.length === GT_LOCAL_LEN) {
    return { country: 'gt', localDigits: digits };
  }
  if (digits.length === US_CA_LOCAL_LEN) {
    return { country: 'us_ca', localDigits: digits };
  }
  if (digits.startsWith('502') && digits.length >= 11) {
    return { country: 'gt', localDigits: digits.slice(-GT_LOCAL_LEN) };
  }
  if (digits.startsWith('1') && digits.length === 11) {
    return { country: 'us_ca', localDigits: digits.slice(1) };
  }

  return null;
}

export function normalizeClientAuthPhone(
  country: ClientAuthCountry,
  localDigits: string,
): string | null {
  const digits = String(localDigits || '').replace(/\D/g, '');
  if (!digits) return null;

  if (country === 'gt') {
    if (digits.length !== GT_LOCAL_LEN) return null;
    const e164 = `${GT_PREFIX}${digits}`;
    if (isBranchInternalPhone(e164)) return null;
    return e164;
  }

  if (digits.length !== US_CA_LOCAL_LEN) return null;
  return `${US_CA_PREFIX}${digits}`;
}

/** Normaliza dígitos locales (quita 1/502 redundante) y devuelve E.164 para auth. */
export function resolveAuthPhoneInput(
  country: ClientAuthCountry,
  localDigits: string,
): string | null {
  let digits = String(localDigits || '').replace(/\D/g, '');
  if (!digits) return null;

  if (country === 'us_ca' && digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  if (country === 'gt') {
    if (digits.length === 11 && digits.startsWith('502')) {
      digits = digits.slice(-GT_LOCAL_LEN);
    } else if (digits.length > GT_LOCAL_LEN) {
      digits = digits.slice(-GT_LOCAL_LEN);
    }
  }

  return normalizeClientAuthPhone(country, digits);
}

/** Variantes de teléfono que Supabase Auth puede tener guardadas. */
export function authPhoneLoginCandidates(e164: string): string[] {
  const canonical = toClientPhoneE164(e164) ?? e164.trim();
  const out = new Set<string>();
  if (canonical) out.add(canonical);
  const parsed = parseStoredPhone(canonical);
  if (parsed) {
    const norm = normalizeClientAuthPhone(parsed.country, parsed.localDigits);
    if (norm) out.add(norm);
    if (parsed.country === 'us_ca') {
      out.add(parsed.localDigits);
      out.add(`1${parsed.localDigits}`);
    }
    if (parsed.country === 'gt') {
      out.add(parsed.localDigits);
      out.add(`502${parsed.localDigits}`);
    }
  }
  const bare = canonical.replace(/^\+/, '');
  if (bare) out.add(bare);
  return [...out];
}

/** Convierte formatos de Auth/BD (con o sin +) a E.164 canónico (+502… / +1…). */
export function toClientPhoneE164(raw: string | null | undefined): string | null {
  const t = String(raw || '').trim();
  if (!t || isBranchInternalPhone(t)) return null;

  if (isValidClientPhoneStrict(t)) return t;

  const parsed = parseStoredPhone(t);
  if (!parsed) return null;
  return normalizeClientAuthPhone(parsed.country, parsed.localDigits);
}

function isValidClientPhoneStrict(e164: string): boolean {
  if (e164.startsWith(GT_PREFIX)) {
    const local = e164.slice(GT_PREFIX.length).replace(/\D/g, '');
    return local.length === GT_LOCAL_LEN;
  }
  if (e164.startsWith(US_CA_PREFIX)) {
    const local = e164.slice(US_CA_PREFIX.length).replace(/\D/g, '');
    return local.length === US_CA_LOCAL_LEN;
  }
  return false;
}

export function isValidClientPhone(e164: string | null | undefined): boolean {
  return toClientPhoneE164(e164) !== null;
}

export function formatPhoneForDisplay(e164: string | null | undefined): string {
  const parsed = parseStoredPhone(e164);
  if (!parsed) return String(e164 || '').trim();

  if (parsed.country === 'gt') {
    const d = parsed.localDigits;
    return `${GT_PREFIX} ${d.slice(0, 4)} ${d.slice(4)}`;
  }

  const d = parsed.localDigits;
  return `${US_CA_PREFIX} (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function localDigitsMaxLength(country: ClientAuthCountry): number {
  return country === 'gt' ? GT_LOCAL_LEN : US_CA_LOCAL_LEN;
}

export function countryDialLabel(country: ClientAuthCountry): string {
  return country === 'gt' ? GT_PREFIX : US_CA_PREFIX;
}
