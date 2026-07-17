'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { traducirAuthError } from '@/components/auth/authErrors';

export function OtpVerifyStep({
  phoneE164,
  onVerified,
  onBack,
}: {
  phoneE164: string;
  onVerified: () => Promise<void>;
  onBack: () => void;
}) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = token.replace(/\D/g, '');
    if (code.length < 6) {
      setError('Ingresa el código de 6 dígitos del SMS.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        phone: phoneE164,
        token: code,
        type: 'sms',
      });
      if (verifyErr) {
        setError(traducirAuthError(verifyErr.message));
        return;
      }
      await onVerified();
    } catch {
      setError('No pudimos verificar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    setResending(true);
    try {
      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: 'sms',
        phone: phoneE164,
      });
      if (resendErr) {
        setError(traducirAuthError(resendErr.message));
      }
    } catch {
      setError('No pudimos reenviar el SMS.');
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-muted">
        Enviamos un código de 6 dígitos a{' '}
        <span className="text-foreground">{phoneE164}</span>.
      </p>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="Código SMS"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center text-lg tracking-[0.3em] text-foreground outline-none placeholder:text-muted focus:border-gold"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Verificar código
      </button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-muted hover:text-gold"
        >
          Cambiar teléfono
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="text-gold hover:underline disabled:opacity-60"
        >
          {resending ? 'Reenviando…' : 'Reenviar SMS'}
        </button>
      </div>
    </form>
  );
}
