/** Utilidades compartidas para listas y detalle de facturas (ventas). */

import {
  parseSalonCanjeFromVentaNotas,
  stripSalonCanjeMarkerFromVentaNotas,
} from '../config/andreasPremiosCycles.js';
import { parseCanjeFromNotasServicio } from '../config/andreasPremiosCitasAgenda.js';

export function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function montoVenta(v) {
  return Number(v?.total ?? v?.monto ?? 0);
}

export function facturaLabel(v) {
  const n = v?.no_factura?.trim();
  return n || `Venta ${String(v?.id || '').slice(0, 8)}…`;
}

export function profesionalLabel(v) {
  return v?.vendedor?.nombre?.trim() || v?.profesional?.trim() || '';
}

export function parseVentaItems(raw) {
  if (raw == null) return [];
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data.map((it, idx) => {
    const qty = Number(it?.cantidad ?? it?.qty ?? 1);
    const unit = Number(it?.precio_unitario ?? it?.precio ?? it?.precioUnit ?? 0);
    const sub = Number(it?.subtotal ?? qty * unit);
    return {
      key: String(it?.producto_id ?? it?.id ?? idx),
      nombre: String(it?.nombre || it?.descripcion || 'Artículo').trim() || 'Artículo',
      cantidad: qty,
      precio_unitario: unit,
      subtotal: sub,
    };
  });
}

export function formatFechaVenta(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatMetodoPago(m) {
  const s = String(m || '').trim().toLowerCase();
  if (!s) return '—';
  if (s === 'tarjeta_regalo') return 'Tarjeta regalo';
  if (s === 'tarjeta') return 'Tarjeta';
  if (s === 'transferencia') return 'Transferencia';
  if (s === 'efectivo') return 'Efectivo';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Extrae código e importe aplicado desde detalles_pago / notas de la venta. */
export function extractGiftCardFromVenta(venta) {
  const blob = [venta?.detalles_pago, venta?.notas].filter(Boolean).join(' · ');
  if (!blob) return null;

  const match = blob.match(/Tarjeta regalo\s+([A-Za-z0-9\-]+)\s*:\s*Q?\s*([\d.,]+)/i);
  if (match) {
    const monto = Number(String(match[2]).replace(',', '.'));
    return {
      codigo: match[1].trim(),
      monto: Number.isFinite(monto) ? monto : null,
    };
  }

  const soloCodigo = blob.match(/Tarjeta regalo\s+([A-Za-z0-9\-]+)/i);
  if (soloCodigo && /tarjeta regalo/i.test(blob)) {
    return { codigo: soloCodigo[1].trim(), monto: null };
  }

  return null;
}

export function ventaConTarjetaRegalo(venta) {
  if (String(venta?.metodo_pago || '').toLowerCase() === 'tarjeta_regalo') return true;
  if (/tarjeta regalo/i.test(String(venta?.detalles_pago || ''))) return true;
  return Boolean(extractGiftCardFromVenta(venta));
}

/** Línea legible del desglose de pago (incluye tarjeta regalo). */
export function formatDetallesPagoDisplay(detallesPago) {
  const raw = String(detallesPago || '').trim();
  if (!raw) return null;
  return raw
    .split(/\s*\+\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n');
}

/** Notas de venta legibles en UI/ticket (sin JSON ni URL del canje ANDREAS). */
export function formatVentaNotasParaDisplay(notas) {
  const raw = String(notas || '').trim();
  if (!raw) return null;

  let staff = stripSalonCanjeMarkerFromVentaNotas(raw);
  const canjeSalon = parseSalonCanjeFromVentaNotas(raw);
  const canjeServ = parseCanjeFromNotasServicio(raw);
  if (staff) {
    staff = staff.replace(/\s*·\s*ANDREAS_CANJE:[^·\n]+/gi, '').replace(/ANDREAS_CANJE:[^·\n]+/gi, '').trim();
  }
  const parts = [];

  if (staff) parts.push(staff);

  if (canjeSalon && (canjeSalon.descuento_pct > 0 || canjeSalon.descuento_monto > 0)) {
    const det = [];
    if (canjeSalon.descuento_pct > 0) det.push(`${canjeSalon.descuento_pct}%`);
    if (canjeSalon.descuento_monto > 0) det.push(`descuento ${formatQ(canjeSalon.descuento_monto)}`);
    parts.push(`Canje premio ANDREAS en productos${det.length ? ` (${det.join(' · ')})` : ''}`);
  } else if (/ANDREAS_CANJE_SALON/i.test(raw)) {
    parts.push('Canje premio ANDREAS en productos (salón)');
  }

  if (canjeServ && (canjeServ.descuento_pct > 0 || canjeServ.descuento_monto > 0)) {
    const det = [];
    if (canjeServ.descuento_pct > 0) det.push(`${canjeServ.descuento_pct}%`);
    if (canjeServ.descuento_monto > 0) det.push(`descuento ${formatQ(canjeServ.descuento_monto)}`);
    parts.push(`Canje premio ANDREAS en servicio${det.length ? ` (${det.join(' · ')})` : ''}`);
  } else if (/ANDREAS_CANJE:/i.test(raw) && !/ANDREAS_CANJE_SALON/i.test(raw)) {
    parts.push('Canje premio ANDREAS en servicio');
  }

  return parts.length ? parts.join('\n') : null;
}
