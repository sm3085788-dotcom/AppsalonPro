import { useCallback, useState } from 'react';

/** Modo selección por tarjetas (borrado múltiple / acciones en lote). */
export function useListSelection() {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const toggleSelectMode = useCallback(() => {
    setActive((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setActive(false);
    setSelectedIds(new Set());
  }, []);

  const toggleId = useCallback((id) => {
    const sid = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  }, []);

  const isSelected = useCallback((id) => selectedIds.has(String(id)), [selectedIds]);

  return {
    active,
    setActive,
    selectedIds,
    count: selectedIds.size,
    toggleSelectMode,
    exitSelectMode,
    toggleId,
    isSelected,
  };
}
