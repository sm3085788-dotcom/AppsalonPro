'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { StarRatingInput } from '@/components/ui/StarRating';
import { createClient } from '@/lib/supabase/client';
import type { UUID } from '@/lib/types/db';

/**
 * Req 8: formulario de reseña verificada. El insert lo valida la policy
 * RLS con cliente_puede_resenar_inventario(); aquí solo recogemos los datos.
 */
export function ReviewForm({
  inventarioId,
  autorNombre,
}: {
  inventarioId: UUID;
  autorNombre: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Inicia sesión para dejar tu reseña.');
        return;
      }
      const { error } = await supabase.from('inventario_resenas').insert({
        inventario_id: inventarioId,
        client_user_id: user.id,
        autor_nombre: autorNombre || 'Cliente',
        rating,
        comentario: comentario.trim(),
      });
      if (error) {
        setError(
          error.message.includes('duplicate')
            ? 'Ya dejaste una reseña para este producto.'
            : 'No pudimos guardar tu reseña. Verifica que tengas una compra entregada.',
        );
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm text-emerald-300">
        ¡Gracias por tu reseña!
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h4 className="mb-3 font-medium text-cream">Escribe tu reseña</h4>
      <StarRatingInput value={rating} onChange={setRating} />
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Cuéntanos tu experiencia…"
        rows={3}
        className="mt-3 w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-gold"
      />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Publicar reseña
      </button>
    </form>
  );
}
