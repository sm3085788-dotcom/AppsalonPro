export function traducirAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('invalid credentials'))
    return 'Credenciales incorrectas. Revisa tu correo o teléfono y contraseña.';
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Ese correo o teléfono ya está registrado.';
  if (m.includes('user already registered'))
    return 'Ese teléfono ya está registrado.';
  if (m.includes('email not confirmed'))
    return 'Confirma tu correo antes de ingresar.';
  if (m.includes('phone not confirmed'))
    return 'Confirma tu teléfono con el código SMS antes de ingresar.';
  if (m.includes('otp') && m.includes('expired'))
    return 'El código expiró. Solicita uno nuevo.';
  if (m.includes('invalid otp') || m.includes('token has expired'))
    return 'Código incorrecto o expirado. Revisa el SMS e intenta de nuevo.';
  if (m.includes('sms') && m.includes('rate'))
    return 'Demasiados intentos. Espera un momento antes de pedir otro SMS.';
  if (m.includes('signup is disabled'))
    return 'El registro no está disponible en este momento.';
  if (m.includes('password')) return message;
  return message;
}
