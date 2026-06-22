export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function detectCardBrand(pan) {
  const d = digitsOnly(pan);
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  return 'Tarjeta';
}

export function formatCardNumberDisplay(raw) {
  const d = digitsOnly(raw).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatCardExpDisplay(raw) {
  const d = digitsOnly(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function luhnCheck(num) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let n = parseInt(num[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Valida formulario de tarjeta (no persiste PAN completo; solo last4 para el pedido).
 */
export function validateTarjetaForm({ holder, number, exp, cvv }) {
  const errors = [];
  const name = String(holder || '').trim();
  if (name.length < 3) errors.push('Ingresá el nombre del titular como figura en la tarjeta.');

  const pan = digitsOnly(number);
  if (pan.length < 13 || pan.length > 19) {
    errors.push('El número de tarjeta debe tener entre 13 y 19 dígitos.');
  } else if (!luhnCheck(pan)) {
    errors.push('El número de tarjeta no es válido.');
  }

  const expDigits = digitsOnly(exp);
  if (expDigits.length !== 4) {
    errors.push('Ingresá el vencimiento en formato MM/AA.');
  } else {
    const mm = parseInt(expDigits.slice(0, 2), 10);
    const yy = parseInt(expDigits.slice(2), 10);
    if (mm < 1 || mm > 12) errors.push('Mes de vencimiento inválido.');
    const expEnd = new Date(2000 + yy, mm, 0, 23, 59, 59);
    if (expEnd < new Date()) errors.push('La tarjeta está vencida.');
  }

  const brand = detectCardBrand(pan);
  const cvvDigits = digitsOnly(cvv);
  const cvvLen = brand === 'Amex' ? 4 : 3;
  if (cvvDigits.length !== cvvLen) {
    errors.push(`CVV inválido (${cvvLen} dígitos).`);
  }

  if (errors.length) {
    return { ok: false, message: errors[0], errors };
  }

  return {
    ok: true,
    valid: true,
    last4: pan.slice(-4),
    brand,
    holder: name,
  };
}
