/**
 * Helpers para abrir chats al último mensaje sin “scrub” visual en FlatList.
 */

export function messageIdsSignature(rows) {
  return (rows || []).map((m) => String(m.id)).join('|');
}

/** Actualiza estado/delivery sin reemplazar el array si el hilo es el mismo. */
export function reconcileChatMessages(prev, next) {
  const a = prev || [];
  const b = next || [];
  if (!b.length && !a.length) return a;
  if (messageIdsSignature(a) !== messageIdsSignature(b)) return b;

  const byId = new Map(b.map((m) => [String(m.id), m]));
  let changed = false;
  const merged = a.map((m) => {
    const n = byId.get(String(m.id));
    if (!n) return m;
    if (
      n.status !== m.status ||
      n.delivered_at !== m.delivered_at ||
      n.read_at !== m.read_at ||
      n.content !== m.content ||
      n.media_url !== m.media_url
    ) {
      changed = true;
      return n;
    }
    return m;
  });
  return changed ? merged : a;
}

export function lastMessageId(rows) {
  const list = rows || [];
  if (!list.length) return null;
  return String(list[list.length - 1]?.id ?? '');
}

export function scrollFlatListToEnd(listRef, { animated = false } = {}) {
  const run = () => listRef.current?.scrollToEnd({ animated });
  requestAnimationFrame(() => requestAnimationFrame(run));
}

/** Oculta la lista, ancla al final y luego la muestra (evita ver scroll desde arriba). */
export function anchorFlatListToEnd(listRef, { onRevealed } = {}) {
  const run = () => {
    listRef.current?.scrollToEnd({ animated: false });
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
      requestAnimationFrame(() => onRevealed?.());
    });
  };
  requestAnimationFrame(run);
}
