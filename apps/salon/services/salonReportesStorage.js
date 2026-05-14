import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@salon/reportes_generados_v1';
const MAX_REPORTS = 80;

const listeners = new Set();

export function subscribeReportesStorage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyReportesStorage() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export async function loadReportes() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveReportes(list) {
  const next = Array.isArray(list) ? list.slice(0, MAX_REPORTS) : [];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  notifyReportesStorage();
  return next;
}

export async function addReporte(item) {
  const current = await loadReportes();
  const next = [item, ...current].slice(0, MAX_REPORTS);
  await saveReportes(next);
  return next;
}

export async function clearAllReportes() {
  await AsyncStorage.removeItem(KEY);
  notifyReportesStorage();
}

export async function deleteReportesInDateRange(fromIso, toIso) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const list = await loadReportes();
  let removed = 0;
  const kept = list.filter((item) => {
    const t = new Date(item.generatedAt).getTime();
    if (Number.isNaN(t)) return true;
    if (t >= from && t <= to) {
      removed += 1;
      return false;
    }
    return true;
  });
  await saveReportes(kept);
  return removed;
}

export async function deleteReporteById(id) {
  const list = await loadReportes();
  const next = list.filter((r) => String(r.id) !== String(id));
  await saveReportes(next);
  return list.length - next.length;
}
