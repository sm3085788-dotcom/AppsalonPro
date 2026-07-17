export function clientePuedeCancelarPedido(status: string): boolean {
  const st = String(status || '');
  return st === 'pending' || st === 'confirmed' || st === 'prepared';
}

export function pedidoEstaCancelado(status: string): boolean {
  return String(status || '') === 'cancelled';
}
