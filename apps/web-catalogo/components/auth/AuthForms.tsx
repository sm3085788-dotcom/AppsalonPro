'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, User2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseConfig } from '@/components/supabase/SupabaseConfigProvider';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { syncClienteFichaAction } from '@/app/cuenta/actions';
import { splitFullName } from '@/lib/clientDisplayName';
import { PhoneCountryField } from '@/components/auth/PhoneCountryField';
import { OtpVerifyStep } from '@/components/auth/OtpVerifyStep';
import { PasswordField } from '@/components/auth/PasswordField';
import { traducirAuthError } from '@/components/auth/authErrors';
import {
  isBranchInternalPhone,
  resolveAuthPhoneInput,
  type ClientAuthCountry,
} from '@/lib/phone/clientAuthPhone';

function Field({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 focus-within:border-gold">
      <Icon className="h-4 w-4 text-muted" />
      <input
        {...props}
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
      />
    </div>
  );
}

async function afterAuth(router: ReturnType<typeof useRouter>, redirectTo: string) {
  const synced = await syncClienteFichaAction();
  if (!synced.complete) {
    router.push(`/cuenta/perfil?from=${encodeURIComponent(redirectTo)}`);
  } else {
    router.push(redirectTo);
  }
  router.refresh();
}

function validatePasswordPair(
  password: string,
  password2: string,
): string | null {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (password !== password2) {
    return 'Las contraseñas no coinciden.';
  }
  return null;
}

function validateFullName(fullName: string): string | null {
  const { nombre: nom, apellido: ape } = splitFullName(fullName);
  if (nom.length < 2) {
    return 'Ingresa tu nombre (mínimo 2 caracteres).';
  }
  if (ape.length < 2) {
    return 'Ingresa nombre y apellido separados por un espacio.';
  }
  return null;
}

function resolvePhoneOrError(
  country: ClientAuthCountry,
  localDigits: string,
): { phone: string } | { error: string } {
  const phone = resolveAuthPhoneInput(country, localDigits);
  if (!phone) {
    return {
      error:
        country === 'gt'
          ? 'Ingresa un teléfono válido de 8 dígitos (Guatemala).'
          : 'Ingresa un teléfono válido de 10 dígitos (EE.UU. / Canadá).',
    };
  }
  if (isBranchInternalPhone(phone)) {
    return {
      error: 'Este número es de uso interno del salón. Usa tu teléfono personal.',
    };
  }
  return { phone };
}

export function LoginForm({ redirectTo = '/' }: { redirectTo?: string }) {
  const router = useRouter();
  const { configured: supabaseConfigured } = useSupabaseConfig();
  const [phoneCountry, setPhoneCountry] = useState<ClientAuthCountry>('gt');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured) {
      setError('Autenticación no disponible en modo demo.');
      return;
    }
    const resolved = resolvePhoneOrError(phoneCountry, phoneLocal);
    if ('error' in resolved) {
      setError(resolved.error);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        phone: resolved.phone,
        password,
      });
      if (signInErr) {
        setError(traducirAuthError(signInErr.message));
        return;
      }
      await afterAuth(router, redirectTo);
    } catch {
      setError('No pudimos conectar. Revisa tu red e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Bienvenida de vuelta"
      subtitle="Ingresa para gestionar tus citas y pedidos."
    >
      {!supabaseConfigured && (
        <DemoBanner message="Supabase no está configurado: el login está deshabilitado en modo demo." />
      )}
      <form onSubmit={onSubmit} className="space-y-3">
        <PhoneCountryField
          country={phoneCountry}
          localDigits={phoneLocal}
          onCountryChange={setPhoneCountry}
          onLocalDigitsChange={setPhoneLocal}
          disabled={loading}
        />
        <PasswordField
          required
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <SubmitButton loading={loading}>Ingresar</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/recuperar-cuenta" className="text-gold hover:underline">
          Recuperar cuenta
        </Link>
        <span className="mx-2 text-border">·</span>
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="text-gold hover:underline">
          Crear cuenta
        </Link>
      </p>
    </AuthCard>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { configured: supabaseConfigured } = useSupabaseConfig();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<ClientAuthCountry>('gt');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured) {
      setError('Registro no disponible en modo demo.');
      return;
    }

    const fullName = nombreCompleto.trim().replace(/\s+/g, ' ');
    const nameErr = validateFullName(fullName);
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const passErr = validatePasswordPair(password, password2);
    if (passErr) {
      setError(passErr);
      return;
    }

    const resolved = resolvePhoneOrError(phoneCountry, phoneLocal);
    if ('error' in resolved) {
      setError(resolved.error);
      return;
    }

    const { nombre: nom, apellido: ape } = splitFullName(fullName);

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpErr } = await supabase.auth.signUp({
        phone: resolved.phone,
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: nom,
            last_name: ape,
            nombre: fullName,
            signup_source: 'web_catalogo',
          },
        },
      });
      if (signUpErr) {
        setError(traducirAuthError(signUpErr.message));
        return;
      }
      if (data.session) {
        await afterAuth(router, '/cuenta/perfil');
        return;
      }
      setPhoneE164(resolved.phone);
      setStep('otp');
    } catch {
      setError('No pudimos conectar. Revisa tu red e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Regístrate con tu nombre real para que el salón te identifique."
    >
      {!supabaseConfigured && (
        <DemoBanner message="Supabase no está configurado: el registro está deshabilitado en modo demo." />
      )}
      {step === 'otp' && phoneE164 ? (
        <OtpVerifyStep
          phoneE164={phoneE164}
          onVerified={() => afterAuth(router, '/cuenta/perfil')}
          onBack={() => {
            setStep('form');
            setPhoneE164(null);
            setError(null);
          }}
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <Field
            icon={User2}
            type="text"
            required
            placeholder="Nombre y apellido"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            autoComplete="name"
            spellCheck
            autoCorrect="on"
            autoCapitalize="words"
            lang="es"
            disabled={loading}
          />
          <PhoneCountryField
            country={phoneCountry}
            localDigits={phoneLocal}
            onCountryChange={setPhoneCountry}
            onLocalDigitsChange={setPhoneLocal}
            disabled={loading}
          />
          <PasswordField
            required
            placeholder="Contraseña (mín. 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
          <PasswordField
            required
            placeholder="Confirmar contraseña"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
        </form>
      )}
      {step === 'form' && (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Confirmarás tu teléfono con un SMS. Después completarás correo
          (opcional), dirección y fecha de nacimiento, igual que en la app
          Clientes.
        </p>
      )}
      <p className="mt-5 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-gold hover:underline">
          Ingresar
        </Link>
      </p>
    </AuthCard>
  );
}

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-surface p-8">
      <h1 className="text-2xl font-light text-cream">{title}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
      {children}
    </div>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function RecoverAccountForm() {
  const router = useRouter();
  const { configured: supabaseConfigured } = useSupabaseConfig();
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<ClientAuthCountry>('gt');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabaseConfigured) {
      setError('Recuperación no disponible en modo demo.');
      return;
    }
    const resolved = resolvePhoneOrError(phoneCountry, phoneLocal);
    if ('error' in resolved) {
      setError(resolved.error);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: resolved.phone,
        options: { shouldCreateUser: false },
      });
      if (otpErr) {
        setError(traducirAuthError(otpErr.message));
        return;
      }
      setPhoneE164(resolved.phone);
      setStep('otp');
    } catch {
      setError('No pudimos enviar el SMS. Revisa tu red e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function onSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const passErr = validatePasswordPair(password, password2);
    if (passErr) {
      setError(passErr);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(traducirAuthError(updateErr.message));
        return;
      }
      await afterAuth(router, '/cuenta');
    } catch {
      setError('No pudimos actualizar la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Recuperar cuenta"
      subtitle="Te enviaremos un código SMS para verificar tu teléfono y crear una contraseña nueva."
    >
      {!supabaseConfigured && (
        <DemoBanner message="Supabase no está configurado: la recuperación está deshabilitada en modo demo." />
      )}
      {step === 'otp' && phoneE164 ? (
        <OtpVerifyStep
          phoneE164={phoneE164}
          onVerified={async () => {
            setStep('password');
            setError(null);
          }}
          onBack={() => {
            setStep('phone');
            setPhoneE164(null);
            setError(null);
          }}
        />
      ) : step === 'password' ? (
        <form onSubmit={onSetPassword} className="space-y-3">
          <p className="text-sm text-muted">
            Teléfono verificado. Elige una contraseña nueva (mín. 8 caracteres).
          </p>
          <PasswordField
            required
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
          <PasswordField
            required
            placeholder="Confirmar contraseña"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <SubmitButton loading={loading}>Guardar contraseña</SubmitButton>
        </form>
      ) : (
        <form onSubmit={onSendCode} className="space-y-3">
          <PhoneCountryField
            country={phoneCountry}
            localDigits={phoneLocal}
            onCountryChange={setPhoneCountry}
            onLocalDigitsChange={setPhoneLocal}
            disabled={loading}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <SubmitButton loading={loading}>Enviar código SMS</SubmitButton>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="text-gold hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </AuthCard>
  );
}
