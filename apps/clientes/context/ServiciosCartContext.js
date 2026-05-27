import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ServiciosCartContext = createContext(null);

function servicioKey(s) {
  return String(s?.id ?? s?.nombre ?? '');
}

export function ServiciosCartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((servicio) => {
    if (!servicio) return;
    const key = servicioKey(servicio);
    setItems((prev) => {
      if (prev.some((x) => servicioKey(x) === key)) return prev;
      return [...prev, servicio];
    });
  }, []);

  const removeItem = useCallback((servicio) => {
    const key = servicioKey(servicio);
    setItems((prev) => prev.filter((x) => servicioKey(x) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.length;

  const value = useMemo(
    () => ({ items, addItem, removeItem, clear, count }),
    [items, addItem, removeItem, clear, count],
  );

  return (
    <ServiciosCartContext.Provider value={value}>{children}</ServiciosCartContext.Provider>
  );
}

export function useServiciosCart() {
  const ctx = useContext(ServiciosCartContext);
  if (!ctx) {
    throw new Error('useServiciosCart debe usarse dentro de ServiciosCartProvider');
  }
  return ctx;
}
