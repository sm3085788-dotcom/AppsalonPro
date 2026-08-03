'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { saveClienteProfileAction } from '@/app/cuenta/actions';
import { profileNameFromClienteAndAuth } from '@/lib/clientDisplayName';
import type { ClienteRow } from '@/lib/data/cliente';
import { PhoneCountryField } from '@/components/auth/PhoneCountryField';
import {
  formatPhoneForDisplay,
  parseStoredPhone,
  toClientPhoneE164,
  type ClientAuthCountry,
} from '@/lib/phone/clientAuthPhone';
import { formatAddressInput, polishAddress } from '@/lib/text/polishAddress';

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
  const verifiedAuthPhone = sessionUser.phone?.trim() || null;

  const initialPhone = useMemo(() => {
    const source = verifiedAuthPhone || clienteRow?.telefono || '';
    const parsed = parseStoredPhone(source);
    return {
      country: parsed?.country ?? ('gt' as ClientAuthCountry),
      localDigits: parsed?.localDigits ?? '',
    };
  }, [verifiedAuthPhone, clienteRow?.telefono]);

  const initial = useMemo(
    () => profileNameFromClienteAndAuth(clienteRow, sessionUser),
    [clienteRow, sessionUser],
  );

  const [nombre, setNombre] = useState(initial.nombre);
  const [apellido, setApellido] = useState(initial.apellido);
  const [phoneCountry, setPhoneCountry] = useState<ClientAuthCountry>(
    initialPhone.country,
  );
  const [phoneLocal, setPhoneLocal] = useState(initialPhone.localDigits);
  const [correo, setCorreo] = useState(
    clienteRow?.email || sessionUser.email || '',
  );
  const [direccion, setDireccion] = useState(clienteRow?.direccion || '');
  const [cumpleanos, setCumpleanos] = useState(
    clienteRow?.cumpleanos?.slice(0, 10) || '',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phoneLocked = Boolean(verifiedAuthPhone);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await saveClienteProfileAction({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: phoneLocked
          ? toClientPhoneE164(verifiedAuthPhone) ?? verifiedAuthPhone
          : undefined,
        telefonoCountry: phoneLocked ? undefined : phoneCountry,
        telefonoLocal: phoneLocked ? undefined : phoneLocal.trim() || null,
        email: correo.trim() || null,
        direccion: polishAddress(direccion) || null,
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
          spellCheck
          autoCorrect="on"
          autoCapitalize="words"
          lang="es"
        />
        <Field
          label="Apellido"
          required
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="López"
          autoComplete="family-name"
          spellCheck
          autoCorrect="on"
          autoCapitalize="words"
          lang="es"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-muted">Teléfono</label>
        {phoneLocked ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground">
              {formatPhoneForDisplay(verifiedAuthPhone)}
            </div>
            <p className="text-xs text-muted">
              Verificado con SMS al registrarte. Para cambiarlo, contacta al
              salón.
            </p>
          </div>
        ) : (
          <PhoneCountryField
            country={phoneCountry}
            localDigits={phoneLocal}
            onCountryChange={setPhoneCountry}
            onLocalDigitsChange={setPhoneLocal}
          />
        )}
      </div>

      <Field
        label="Correo (opcional)"
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="tu@correo.com"
        autoComplete="email"
      />

      <Field
        label="Dirección"
        value={direccion}
        onChange={(e) => setDireccion(formatAddressInput(e.target.value))}
        onBlur={() => setDireccion((prev) => polishAddress(prev))}
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
