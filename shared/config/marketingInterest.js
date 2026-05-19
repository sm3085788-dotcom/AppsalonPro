import { db, supabase } from './supabaseClient.js';

export const MARKETING_INTEREST_TYPES = {
  TENDENCIAS: 'tendencias_interest',
  CAROUSEL: 'carousel_interest',
};

function interestLabel(contentType) {
  if (contentType === MARKETING_INTEREST_TYPES.CAROUSEL) return 'Carrusel inicio';
  return 'Tendencias';
}

/**
 * Registra interés del cliente en marketing_direct_messages (bandeja Pedidos del salón).
 */
export async function registerMarketingInterest({
  type,
  title,
  detail,
  postId = null,
  mediaUrl = null,
  buttonLabel = null,
  kicker = null,
  headline = null,
  priceLabel = null,
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (!session?.user?.id) {
    return {
      data: null,
      error: { message: 'Iniciá sesión en App Clientes para avisar al salón.' },
    };
  }

  const user = session.user;
  let cliente = null;
  const { data: byUser } = await db.clientes.getByUserId(user.id);
  cliente = byUser ?? null;

  if (!cliente) {
    const name =
      (user.user_metadata?.full_name && String(user.user_metadata.full_name).trim()) ||
      user.email?.split('@')[0] ||
      'Cliente';
    await db.clientes.ensureFromAuth({
      userId: user.id,
      nombre: name,
      email: user.email || null,
    });
    const { data: ensured } = await db.clientes.getByUserId(user.id);
    cliente = ensured ?? null;
  }

  if (!cliente?.id) {
    return {
      data: null,
      error: {
        message:
          'No encontramos tu ficha de cliente. Completá tu perfil en la app o contactá al salón.',
      },
    };
  }

  const clientName = cliente.nombre || user.user_metadata?.full_name || 'Cliente';
  const clientPhone = cliente.telefono || user.phone || null;
  const source = interestLabel(type);
  const titular = String(headline || title || 'Publicación').trim();
  const extra = String(detail || '').trim();
  const lines = [
    `📣 Solicitud · ${source}`,
    postId != null ? `Publicación #${postId}` : null,
    kicker ? `Etiqueta: ${String(kicker).trim()}` : null,
    `Titular: ${titular}`,
    extra ? `Descripción: ${extra}` : null,
    priceLabel ? `Precio: ${String(priceLabel).trim()}` : null,
    buttonLabel ? `Botón tocado: «${String(buttonLabel).trim()}»` : null,
    `Cliente: ${clientName}`,
    clientPhone ? `Tel: ${clientPhone}` : null,
  ].filter(Boolean);
  const content = lines.join('\n');

  return db.marketingDirectMessages.create({
    client_id: cliente.id,
    client_name: clientName,
    client_phone: clientPhone,
    content,
    content_type: type,
    media_url: mediaUrl || null,
    media_kind: mediaUrl ? 'image' : null,
    status: 'delivered',
    created_by: user.id,
    created_by_name: clientName,
  });
}
