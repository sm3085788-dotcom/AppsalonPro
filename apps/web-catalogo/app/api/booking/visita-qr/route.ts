import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { citaEstaConfirmada } from '@/lib/citaCliente';

function buildFallbackToken(): string {
  return `V${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random()
    .toString(36)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)}`;
}

/** Genera o devuelve el token QR de visita para una cita confirmada del cliente. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { citaId?: string };
    const citaId = body.citaId?.trim();
    if (!citaId) {
      return NextResponse.json({ error: 'Cita no indicada.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!cliente?.id) {
      return NextResponse.json({ error: 'Perfil de cliente no encontrado.' }, { status: 403 });
    }

    const { data: cita, error: citaErr } = await supabase
      .from('citas')
      .select('id, estado, visita_qr_token, visita_validada_en')
      .eq('id', citaId)
      .eq('cliente_id', cliente.id)
      .maybeSingle();

    if (citaErr || !cita) {
      return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });
    }

    if (!citaEstaConfirmada(cita.estado)) {
      return NextResponse.json(
        { error: 'El salón debe confirmar la cita antes de generar el QR.' },
        { status: 400 },
      );
    }

    const existing = String(cita.visita_qr_token || '').trim();
    if (existing) {
      return NextResponse.json({ token: existing });
    }

    const { data: rpcToken, error: rpcErr } = await supabase.rpc('cita_asegurar_visita_qr', {
      p_cita_id: citaId,
    });

    if (!rpcErr) {
      const token = rpcToken != null ? String(rpcToken).trim() : '';
      if (token) {
        return NextResponse.json({ token });
      }
    }

    const msg = String(rpcErr?.message || rpcErr?.hint || '');
    const rpcMissing = /function|does not exist|schema cache|pgcrypto|gen_random_bytes/i.test(msg);
    if (rpcErr && !rpcMissing) {
      return NextResponse.json(
        { error: rpcErr.message || 'No se pudo generar el QR de visita.' },
        { status: 400 },
      );
    }

    const fallbackToken = buildFallbackToken();
    const { data: row, error: upErr } = await supabase
      .from('citas')
      .update({ visita_qr_token: fallbackToken })
      .eq('id', citaId)
      .eq('cliente_id', cliente.id)
      .select('visita_qr_token')
      .single();

    if (upErr) {
      const upMsg = String(upErr.message || '');
      if (/visita_qr_token|column/i.test(upMsg)) {
        return NextResponse.json(
          {
            error:
              'Falta configurar Supabase: ejecutá supabase-membresias-referidos-programa.sql.',
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: upErr.message || 'No se pudo guardar el QR de visita.' },
        { status: 500 },
      );
    }

    const saved = String(row?.visita_qr_token || fallbackToken).trim();
    return NextResponse.json({ token: saved || null });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
