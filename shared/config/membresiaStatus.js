const MS_DAY = 24 * 60 * 60 * 1000;
const VIGENCIA_DIAS = 29;
const RENEWAL_REMINDER_DIAS = 3;

export function computeMembresiaStatusFromRow(clienteRow) {
  const nivel = String(clienteRow?.membresia_nivel || '').toLowerCase().trim() || null;
  const venceRaw = clienteRow?.membresia_vence_en;
  const activadaRaw = clienteRow?.membresia_activada_en;

  if (!nivel) {
    return {
      active: false,
      nivel: null,
      restored: 'estandar',
      daysLeft: null,
      venceEn: null,
      showRenewalReminder: false,
      expired: false,
      vigenciaDias: VIGENCIA_DIAS,
    };
  }

  const venceEn = venceRaw ? new Date(venceRaw) : null;
  const now = Date.now();
  if (venceEn && !Number.isNaN(venceEn.getTime()) && venceEn.getTime() < now) {
    return {
      active: false,
      nivel: null,
      restored: 'estandar',
      expired: true,
      expiredMessage:
        'Tu cuenta ha sido restaurada a Estándar. Para activar de nuevo la membresía, pedí un nuevo código en el salón.',
      daysLeft: 0,
      venceEn: venceRaw,
      showRenewalReminder: false,
      vigenciaDias: VIGENCIA_DIAS,
    };
  }

  let daysLeft = VIGENCIA_DIAS;
  if (venceEn && !Number.isNaN(venceEn.getTime())) {
    daysLeft = Math.max(0, Math.ceil((venceEn.getTime() - now) / MS_DAY));
  }

  return {
    active: true,
    nivel,
    activadaEn: activadaRaw,
    venceEn: venceRaw,
    daysLeft,
    showRenewalReminder: daysLeft <= RENEWAL_REMINDER_DIAS,
    renewalMessage:
      daysLeft <= RENEWAL_REMINDER_DIAS
        ? `Tu membresía vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}. No pierdas tus avances en Premios: renová con un nuevo código en el salón.`
        : null,
    expired: false,
    vigenciaDias: VIGENCIA_DIAS,
  };
}
