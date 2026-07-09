'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { scrollToHashWhenReady } from '@/lib/hashNavigation';
import {
  redeemGiftCardActivationCode,
  giftCardSuccessPath,
  type RedeemedGiftCard,
} from '@/lib/gift-card/redeemActivationCode';
import { formatActivationCodeInput } from '@/lib/gift-card/activationCodeInput';
import { validateGiftCardActivationInput } from '@/lib/gift-card/validation';
import { formatPersonName } from '@/lib/text/formatPersonName';
import { polishSpanishGiftMessage } from '@/lib/text/polishSpanishGiftMessage';
import type { GiftCardActivationMode } from '@/lib/gift-card/previewCopy';

type GiftCardActivationCodeFormProps = {
  variant?: GiftCardActivationMode;
  initialCodigo?: string;
  className?: string;
  onActivated?: (card: RedeemedGiftCard) => void;
};

export function GiftCardActivationCodeForm({
  variant = 'recover',
  initialCodigo = '',
  className = '',
  onActivated,
}: GiftCardActivationCodeFormProps) {
  const isComplete = variant === 'complete';
  const [codigo, setCodigo] = useState(() => formatActivationCodeInput(initialCodigo));
  const [forName, setForName] = useState('');
  const [fromName, setFromName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = formatActivationCodeInput(initialCodigo);
    if (next) setCodigo(next);
  }, [initialCodigo]);

  function polishNameField(raw: string, setter: (v: string) => void) {
    const formatted = formatPersonName(raw);
    if (formatted !== raw) setter(formatted);
  }

  function finishActivation(card: RedeemedGiftCard) {
    if (onActivated) {
      onActivated(card);
      window.requestAnimationFrame(() => {
        scrollToHashWhenReady('#tarjeta-regalo-dashboard', 40, 40);
      });
      return;
    }
    window.location.assign(giftCardSuccessPath(card.codigo));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validated = validateGiftCardActivationInput(
      { codigo, forName, fromName, message },
      { requireNames: isComplete },
    );
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setBusy(true);
    try {
      const result = await redeemGiftCardActivationCode(validated.payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      finishActivation(result.card);
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-gold';
  const labelClass = 'mb-2 block text-xs uppercase tracking-widest text-muted';

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={`mt-8 space-y-4 ${className}`.trim()}
    >
      <div>
        <label className={labelClass}>Código de activación</label>
        <input
          value={codigo}
          onChange={(e) => setCodigo(formatActivationCodeInput(e.target.value))}
          placeholder="ACT-123456"
          maxLength={12}
          autoComplete="off"
          className={`${inputClass} uppercase tracking-widest`}
          required
        />
      </div>

      {isComplete ? (
        <>
          <div>
            <label className={labelClass}>Para (nombre y apellido del destinatario)</label>
            <input
              type="text"
              placeholder="Ej: María López"
              value={forName}
              onChange={(e) => setForName(e.target.value)}
              onBlur={() => polishNameField(forName, setForName)}
              autoComplete="name"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>De (tu nombre y apellido)</label>
            <input
              type="text"
              placeholder="Ej: Juan Pérez"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              onBlur={() => polishNameField(fromName, setFromName)}
              autoComplete="name"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Mensaje adicional (opcional)</label>
            <textarea
              placeholder="Ej: ¡Espero que disfrutes de un día de relax!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => {
                const polished = polishSpanishGiftMessage(message);
                if (polished !== message) setMessage(polished);
              }}
              maxLength={150}
              rows={3}
              spellCheck
              lang="es"
              className={`${inputClass} resize-none`}
            />
            {message.length > 0 ? (
              <p className="mt-1 text-xs text-muted">{message.length}/150 caracteres</p>
            ) : null}
          </div>
        </>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !codigo.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-charcoal disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" />
        {busy
          ? isComplete
            ? 'Generando…'
            : 'Verificando…'
          : isComplete
            ? 'Activar y generar tarjeta'
            : 'Recuperar tarjeta'}
      </button>
    </form>
  );
}
