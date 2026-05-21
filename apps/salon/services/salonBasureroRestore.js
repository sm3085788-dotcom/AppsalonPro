import { db } from '@appsalon/shared-config';
import { deleteBasureroEntryById } from './salonBasurero';

const OMIT_INSERT = [
  'id',
  'created_at',
  'updated_at',
  'cliente',
  'vendedor',
  'empleado',
  'producto',
  'venta',
  'asignado_a',
];

function payloadForInsert(snapshot) {
  const s = { ...snapshot };
  for (const k of OMIT_INSERT) delete s[k];
  if (s.remoteLogo != null) {
    s.logo_url = s.remoteLogo;
    delete s.remoteLogo;
  }
  return s;
}

/**
 * Restaura un registro en Supabase desde la copia del basurero y quita la entrada local.
 */
export async function restoreBasureroEntry(entry) {
  const snap = entry?.snapshot;
  if (!snap || typeof snap !== 'object') {
    return { ok: false, error: 'Sin copia para restaurar.' };
  }

  const src = entry.source === 'papeleria' ? 'ventas' : entry.source;
  const data = payloadForInsert(snap);
  let res;

  try {
    switch (src) {
      case 'ventas':
        res = await db.ventas.create(data);
        break;
      case 'clientes':
        res = await db.clientes.create(data);
        break;
      case 'empleados':
        res = await db.empleados.create(data);
        break;
      case 'inventario':
        res = await db.inventario.create(data);
        break;
      case 'proveedores':
        res = await db.proveedores.create(data);
        break;
      case 'marketing_posts':
        res = await db.marketingPosts.create(data);
        break;
      case 'incidentes':
        res = await db.incidentes.create(data);
        break;
      case 'citas':
        res = await db.citas.create(data);
        break;
      default:
        return { ok: false, error: `Restaurar «${src}» no está soportado.` };
    }
  } catch (e) {
    return { ok: false, error: e?.message || 'Error al restaurar.' };
  }

  if (res?.error) {
    return { ok: false, error: res.error.message || 'No se pudo restaurar (RLS o datos duplicados).' };
  }

  await deleteBasureroEntryById(entry.id);
  return { ok: true, data: res?.data };
}

export async function restoreBasureroEntries(entries) {
  let ok = 0;
  let fail = 0;
  const errors = [];
  for (const entry of entries) {
    const r = await restoreBasureroEntry(entry);
    if (r.ok) ok += 1;
    else {
      fail += 1;
      errors.push(`${entry.title || entry.id}: ${r.error}`);
    }
  }
  return { ok, fail, errors };
}
