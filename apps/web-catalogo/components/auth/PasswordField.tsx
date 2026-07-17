'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export function PasswordField({
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 focus-within:border-gold">
      <Lock className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="shrink-0 rounded-md p-0.5 text-muted transition-colors hover:text-foreground"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
