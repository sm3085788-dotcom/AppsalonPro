'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Phone } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { saveClienteProfileAction } from '@/app/cuenta/actions';
import { profileNameFromClienteAndAuth } from '@/lib/clientDisplayName';
import type { ClienteRow } from '@/lib/data/cliente';

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-muted">{label}</label>
      <input
        {...props}
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-gold"
      />
    </div>
  );
}

export function ProfileEditForm({
  clienteRow,
  sessionUser,
  redirectTo = '/cuenta',
}: {
  clienteRow: ClienteRow | null;
  sessionUser: User;
  redirectTo?: string;
}) {
  const router = useRouter();
  const initial = useMemo(
    () => profileNameFromClienteAndAuth(clienteRow, sessionUser),
    [clienteRow, sessionUser],
  );

  const [nombre, setNombre] = useState(initial.nombre);
  const [apellido, setApellido] = useState(initial.apellido);
  const [telLocal, setTelLocal] = useState(() => {
    const tel = String(clienteRow?.telefono || '').replace(/\D/g, '');
    if (tel.startsWith('502')) return tel.slice(3, 11);
    return tel.slice(0, 8);
  });
  const [correo, setCorreo] = useState(
    clienteRow?.email || sessionUser.email || '',
  );
  const [direccion, setDireccion] = useState(clienteRow?.direccion || '');
  const [cumpleanos, setCumpleanos] = useState(
    clienteRow?.cumpleanos?.slice(0, 10) || '',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await saveClienteProfileAction({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telLocal.trim() || null,
        email: correo.trim() || null,
        direccion: direccion.trim() || null,
        cumpleanos: cumpleanos || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="María"
          autoComplete="given-name"
        />
        <Field
          label="Apellido"
          required
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="López"
          autoComplete="family-name"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-muted">
          Teléfono (Guatemala)
        </label>
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground">
            +502
          </span>
          <div className="relative flex-1">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="tel"
              inputMode="numeric"
              value={telLocal}
              onChange={(e) =>
                setTelLocal(e.target.value.replace(/\D/g, '').slice(0, 8))
              }
              placeholder="1234 5678"
              className="w-full rounded-xl border border-border bg-surface-2 py-3 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted focus:border-gold"
            />
          </div>
        </div>
      </div>

      <Field
        label="Correo"
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="tu@correo.com"
        autoComplete="email"
      />

      <Field
        label="Dirección"
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        placeholder="Zona, calle, ciudad"
        autoComplete="street-address"
      />

      <Field
        label="Fecha de nacimiento"
        type="date"
        required
        value={cumpleanos}
        onChange={(e) => setCumpleanos(e.target.value)}
        max={new Date().toISOString().slice(0, 10)}
      />

      <p className="text-xs leading-relaxed text-muted">
        Esta información se guarda en tu ficha del salón, igual que en la app
        Clientes, para que recepción te identifique al reservar o comprar.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Guardar perfil
      </button>

      <Link
        href="/cuenta"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a mi cuenta
      </Link>
    </form>
  );
}
