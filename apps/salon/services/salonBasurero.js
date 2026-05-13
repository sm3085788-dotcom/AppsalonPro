import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@appsalon/salon/basurero_v1';
const MAX_ENTRIES = 500;

/**
 * Registra una copia local de un elemento eliminado en App Salón (AsyncStorage).
 * Llamar después de un borrado exitoso en servidor, pasando el snapshot que tenías en memoria.
 *
 * @param {{ source: string, title?: string, summary?: string, snapshot?: object }} payload
 */
export async function recordSalonDeletion(payload) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let list = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
    }
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      deletedAt: new Date().toISOString(),
      source: String(payload?.source || 'desconocido'),
      title: String(payload?.title || 'Sin título').slice(0, 500),
      summary: String(payload?.summary || '').slice(0, 2000),
      snapshot:
        payload?.snapshot != null && typeof payload.snapshot === 'object'
          ? payload.snapshot
          : { _raw: payload?.snapshot },
    };
    const next = [entry, ...list].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('[salonBasurero] recordSalonDeletion', e?.message || e);
  }
}

export async function getBasureroEntries() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function clearAllBasureroEntries() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Elimina solo entradas cuya `deletedAt` cae en [fromIso, toIso] (inclusive por día). */
export async function clearBasureroEntriesInDateRange(fromIso, toIso) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const list = await getBasureroEntries();
  let removed = 0;
  const kept = list.filter((e) => {
    const t = new Date(e.deletedAt).getTime();
    if (Number.isNaN(t)) return true;
    if (t >= from && t <= to) {
      removed += 1;
      return false;
    }
    return true;
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  return removed;
}
