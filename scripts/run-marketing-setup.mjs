#!/usr/bin/env node
/**
 * Ejecuta supabase-marketing-setup.sql contra el Postgres del proyecto.
 *
 * Requiere en apps/salon/.env:
 *   EXPO_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_DB_PASSWORD=tu_password_de_database
 *
 * La contraseña está en Supabase → Project Settings → Database → Database password
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function main() {
  const env = {
    ...loadEnvFile(path.join(root, 'apps', 'salon', '.env')),
    ...process.env,
  };

  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const dbPassword = env.SUPABASE_DB_PASSWORD || env.DATABASE_PASSWORD;
  const dbUrl =
    env.SUPABASE_DB_URL ||
    env.DATABASE_URL ||
    (supabaseUrl && dbPassword
      ? (() => {
          const ref = projectRefFromUrl(supabaseUrl);
          if (!ref) return null;
          const user = env.SUPABASE_DB_USER || 'postgres';
          return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
        })()
      : null);

  if (!dbUrl) {
    console.error('\n❌ Falta conexión a Postgres.\n');
    console.error('Agregá en apps/salon/.env (no se sube a git):');
    console.error('  SUPABASE_DB_PASSWORD=tu_password\n');
    console.error('La encontrás en Supabase → Settings → Database → Database password');
    console.error('O definí SUPABASE_DB_URL con la connection string completa.\n');
    process.exit(1);
  }

  const sqlPath = path.join(root, 'supabase-marketing-setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  console.log('\n🔌 Conectando a Supabase Postgres…');
  await client.connect();
  console.log('▶ Ejecutando supabase-marketing-setup.sql …\n');

  try {
    await client.query(sql);
    console.log('✅ SQL ejecutado correctamente.\n');
    console.log('Incluye: bucket tendencias, políticas Storage, columnas marketing_posts, RLS.\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Error al ejecutar SQL:\n', err.message || err);
  if (String(err.message || '').includes('password authentication failed')) {
    console.error('\nRevisá SUPABASE_DB_PASSWORD en apps/salon/.env\n');
  }
  process.exit(1);
});
