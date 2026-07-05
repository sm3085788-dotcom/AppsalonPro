/**
 * Falla el build en Vercel Production si faltan variables críticas de Supabase.
 * Acepta alias de la integración Vercel ↔ Supabase.
 */
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.VERCEL_ENV === 'production';

if (!isVercel || !isProduction) {
  process.exit(0);
}

function readEnv(...keys) {
  for (const key of keys) {
    const value = String(process.env[key] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function isValidHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
const supabaseAnonKey = readEnv(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
);
const supabaseServiceRoleKey = readEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
);

const problems = [];

if (!isValidHttpUrl(supabaseUrl)) {
  problems.push(
    'URL de Supabase (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL) — debe ser https://xxx.supabase.co',
  );
}
if (!supabaseAnonKey) {
  problems.push(
    'Anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)',
  );
}
if (!supabaseServiceRoleKey) {
  problems.push(
    'Service role (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY)',
  );
}

if (problems.length > 0) {
  console.error('\n❌ Vercel Production: configuración Supabase incompleta:\n');
  for (const item of problems) {
    console.error(`   - ${item}`);
  }
  console.error('\nUsa el mismo proyecto Supabase que apps Salón y Clientes.');
  console.error('Guía: docs/VERCEL_WEB_SETUP.md\n');
  process.exit(1);
}

console.log('✓ Variables Supabase presentes en Vercel Production');
