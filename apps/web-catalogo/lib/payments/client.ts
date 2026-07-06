import type { CreatePaymentSessionInput, PaymentSessionResult } from '@/lib/types/db';

export async function startPaymentSession(
  input: CreatePaymentSessionInput,
): Promise<PaymentSessionResult & { error?: string }> {
  const res = await fetch('/api/payments/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      mode: 'demo',
      sessionId: '',
      amount: 0,
      currency: 'gtq',
      demo: true,
      error: data.error ?? 'No se pudo iniciar el pago.',
    };
  }
  return data as PaymentSessionResult;
}

export async function completeDemoPayment(payload: {
  draftId: string;
  kind: string;
}): Promise<{ ok: boolean; error?: string; codigo?: string; redirectTo?: string }> {
  const res = await fetch('/api/payments/complete-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error ?? 'Error demo.' };
  return data;
}

export async function pollPaymentStatus(sessionId: string) {
  const res = await fetch(`/api/payments/status?sessionId=${encodeURIComponent(sessionId)}`);
  return res.json();
}
