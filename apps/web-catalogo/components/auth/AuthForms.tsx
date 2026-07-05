'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, User2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseConfig } from '@/components/supabase/SupabaseConfigProvider';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { syncClienteFichaAction } from '@/app/cuenta/actions';
import { splitFullName } from '@/lib/clientDisplayName';

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

export function LoginForm({ redirectTo = '/' }: { redirectTo?: string }) {
  const router = useRouter();
  const { configured: supabaseConfigured } = useSupabaseConfig();
  const [email, setEmail] = useState('');
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
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(traducirError(error.message));
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
        <Field
          icon={Mail}
          type="email"
          required
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Field
          icon={Lock}
          type="password"
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
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!supabaseConfigured) {
      setError('Registro no disponible en modo demo.');
      return;
    }

    const fullName = nombreCompleto.trim().replace(/\s+/g, ' ');
    const { nombre: nom, apellido: ape } = splitFullName(fullName);
    if (nom.length < 2) {
      setError('Ingresa tu nombre (mínimo 2 caracteres).');
      return;
    }
    if (ape.length < 2) {
      setError('Ingresa nombre y apellido separados por un espacio.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const em = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: em,
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
      if (error) {
        setError(traducirError(error.message));
        return;
      }
      if (data.session) {
        await afterAuth(router, '/cuenta/perfil');
      } else {
        setInfo(
          'Cuenta creada. Revisa tu correo para confirmar el acceso; luego completa tu perfil al ingresar.',
        );
      }
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
      <form onSubmit={onSubmit} className="space-y-3">
        <Field
          icon={User2}
          type="text"
          required
          placeholder="Nombre y apellido"
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
          autoComplete="name"
        />
        <Field
          icon={Mail}
          type="email"
          required
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Field
          icon={Lock}
          type="password"
          required
          placeholder="Contraseña (mín. 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Field
          icon={Lock}
          type="password"
          required
          placeholder="Confirmar contraseña"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-gold-soft">{info}</p>}
        <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
      </form>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Después del registro completarás teléfono, dirección y fecha de
        nacimiento, igual que en la app Clientes.
      </p>
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

function traducirError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Ese correo ya está registrado.';
  if (m.includes('email not confirmed'))
    return 'Confirma tu correo antes de ingresar.';
  return message;
}
