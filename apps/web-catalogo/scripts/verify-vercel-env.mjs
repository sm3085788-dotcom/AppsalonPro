/**
 * Falla el build en Vercel Production si faltan variables críticas de Supabase.
 * Así no se publica accidentalmente en modo demo.
 */
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.VERCEL_ENV === 'production';

if (!isVercel || !isProduction) {
  process.exit(0);
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missing = required.filter((key) => !String(process.env[key] ?? '').trim());

if (missing.length > 0) {
  console.error('\n❌ Vercel Production: faltan variables de entorno:\n');
  for (const key of missing) {
    console.error(`   - ${key}`);
  }
  console.error('\nPega las mismas llaves que en apps/web-catalogo/.env.local');
  console.error('Guía: docs/VERCEL_WEB_SETUP.md\n');
  process.exit(1);
}

console.log('✓ Variables Supabase presentes en Vercel Production');
