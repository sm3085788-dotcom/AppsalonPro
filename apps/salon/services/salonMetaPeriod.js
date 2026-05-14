import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatMetaQ, progresoMetaPct } from '../../../shared/config/metaGlobal.js';
import { addReporte } from './salonReportesStorage';

const KEY = '@salon/meta_periodos_archivados_v1';

function toStartIso(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function toEndIso(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

async function loadArchivados() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function markArchivado(metaId, fechaFin) {
  const list = await loadArchivados();
  const token = `${metaId}:${fechaFin}`;
  if (!list.includes(token)) {
    list.push(token);
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(-120)));
  }
}

/** Si el período de la meta ya terminó, guarda reporte en Reportes (teléfono). */
export async function maybeArchivarMetaVencida(meta) {
  if (!meta?.id || !meta?.fecha_fin) return false;
  const fin = new Date(meta.fecha_fin);
  fin.setHours(23, 59, 59, 999);
  if (Date.now() <= fin.getTime()) return false;

  const token = `${meta.id}:${meta.fecha_fin}`;
  const archivados = await loadArchivados();
  if (archivados.includes(token)) return false;

  const pct = progresoMetaPct(meta);
  const inicio = meta.fecha_inicio || meta.fecha_fin;
  const item = {
    id: `meta-cierre-${meta.id}-${Date.now()}`,
    typeId: 'metas',
    typeLabel: 'Meta global (cierre período)',
    fromIso: toStartIso(inicio),
    toIso: toEndIso(meta.fecha_fin),
    total: 1,
    rows: [
      {
        nombre: meta.titulo || 'Meta global',
        descripcion: `Período ${inicio} → ${meta.fecha_fin}`,
        monto: Number(meta.actual || 0),
        montoFmt: `${formatMetaQ(meta.actual)} / ${formatMetaQ(meta.valor_objetivo)} (${pct}%)`,
        fecha: meta.fecha_fin,
      },
    ],
    summary: `Cierre: ${formatMetaQ(meta.actual)} de ${formatMetaQ(meta.valor_objetivo)} · ${pct}%`,
    generatedAt: new Date().toISOString(),
    status: 'Cierre automático',
  };

  await addReporte(item);
  await markArchivado(meta.id, meta.fecha_fin);
  return true;
}
