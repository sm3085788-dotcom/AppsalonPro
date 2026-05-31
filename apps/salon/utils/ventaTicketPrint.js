import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SALON_TICKET } from '../config/salonTicket';
import { formatVentaNotasParaDisplay } from '../../../shared/utils/ventaFactura';

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function metodoLabel(id) {
  if (id === 'tarjeta') return 'Tarjeta';
  if (id === 'transferencia') return 'Transferencia';
  return 'Efectivo';
}

/**
 * HTML estrecho (~80 mm) para impresora térmica vía expo-print.
 */
export function buildVentaTicketHtml(venta) {
  const items = Array.isArray(venta.items) ? venta.items : [];
  const linesHtml = items
    .map((it) => {
      const nom = escHtml(it.nombre || 'Ítem');
      const qty = Number(it.cantidad) || 1;
      const pu = Number(it.precio_unitario) || 0;
      const sub = Number(it.subtotal) || qty * pu;
      return `<tr>
        <td class="item-name">${nom}</td>
        <td class="item-qty">${qty}</td>
        <td class="item-amt">${formatQ(sub)}</td>
      </tr>
      <tr><td colspan="3" class="item-detail">${qty} × ${formatQ(pu)}</td></tr>`;
    })
    .join('');

  const subtotal = Number(venta.subtotal ?? venta.total ?? 0);
  const descuento = Number(venta.descuento ?? 0);
  const total = Number(venta.total ?? 0);
  const metodo = metodoLabel(venta.metodo_pago);
  const fecha = venta.fecha
    ? new Date(venta.fecha).toLocaleString('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('es-GT');

  const cashBlock =
    venta.metodo_pago === 'efectivo' && venta.efectivo_recibido != null
      ? `<div class="row"><span>Recibido</span><span>${formatQ(venta.efectivo_recibido)}</span></div>
         <div class="row bold"><span>Cambio</span><span>${formatQ(venta.cambio ?? 0)}</span></div>`
      : '';

  const notasTxt = formatVentaNotasParaDisplay(venta.notas);
  const notas = notasTxt ? `<div class="notes">${escHtml(notasTxt)}</div>` : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  @page { margin: 4mm; size: 80mm auto; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    margin: 0;
    padding: 4px 6px;
    max-width: 72mm;
  }
  .center { text-align: center; }
  .brand { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; margin: 0 0 4px; }
  .muted { font-size: 10px; color: #222; margin: 2px 0; }
  .rule { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .folio { font-size: 12px; font-weight: 700; margin: 6px 0 2px; }
  .meta { font-size: 10px; margin: 2px 0; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .item-name { text-align: left; vertical-align: top; padding: 3px 2px 0 0; font-size: 10px; }
  .item-qty { text-align: center; width: 22px; font-size: 10px; vertical-align: top; padding-top: 3px; }
  .item-amt { text-align: right; white-space: nowrap; font-size: 10px; vertical-align: top; padding-top: 3px; }
  .item-detail { font-size: 9px; color: #333; padding: 0 0 4px 0; border-bottom: 1px dotted #ccc; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
  .row.bold { font-weight: 700; font-size: 13px; margin-top: 6px; }
  .total-line { font-size: 14px; font-weight: 700; }
  .notes { margin-top: 8px; font-size: 10px; font-style: italic; }
  .foot { margin-top: 12px; font-size: 10px; text-align: center; }
</style>
</head><body>
  <div class="center">
    <p class="brand">${escHtml(SALON_TICKET.nombre)}</p>
    <p class="muted">${escHtml(SALON_TICKET.direccion)}</p>
    <p class="muted">${escHtml(SALON_TICKET.telefono)}</p>
  </div>
  <hr class="rule"/>
  <p class="folio center">${escHtml(venta.no_factura || 'SIN FOLIO')}</p>
  <p class="meta">${escHtml(fecha)}</p>
  ${venta.cliente_nombre ? `<p class="meta">Cliente: ${escHtml(venta.cliente_nombre)}</p>` : ''}
  ${venta.profesional ? `<p class="meta">Atendió: ${escHtml(venta.profesional)}</p>` : ''}
  <hr class="rule"/>
  <table class="items">
    <tbody>${linesHtml || '<tr><td colspan="3" class="meta">Sin ítems</td></tr>'}</tbody>
  </table>
  <hr class="rule"/>
  <div class="row"><span>Subtotal</span><span>${formatQ(subtotal)}</span></div>
  ${descuento > 0 ? `<div class="row"><span>Descuento</span><span>-${formatQ(descuento)}</span></div>` : ''}
  <div class="row total-line"><span>TOTAL</span><span>${formatQ(total)}</span></div>
  <div class="row"><span>Pago</span><span>${escHtml(metodo)}</span></div>
  ${cashBlock}
  ${notas}
  <p class="foot">Gracias por su visita</p>
</body></html>`;
}

/** Genera PDF del ticket y ofrece imprimir o compartir. */
export async function printVentaTicket(venta) {
  const html = buildVentaTicketHtml(venta);
  const { uri } = await Print.printToFileAsync({ html, width: 226, height: 842 });
  if (!uri) throw new Error('No se pudo generar el ticket.');

  await new Promise((resolve, reject) => {
    Alert.alert(
      'Factura lista',
      `${venta.no_factura || 'Venta'}\n¿Imprimir en la impresora térmica?`,
      [
        { text: 'Después', style: 'cancel', onPress: () => resolve() },
        {
          text: 'Imprimir',
          onPress: async () => {
            try {
              await Print.printAsync({ uri });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        },
        {
          text: 'Compartir PDF',
          onPress: async () => {
            try {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                  mimeType: 'application/pdf',
                  UTI: 'com.adobe.pdf',
                  dialogTitle: `Ticket ${venta.no_factura || ''}`,
                });
              }
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve() },
    );
  });
}
