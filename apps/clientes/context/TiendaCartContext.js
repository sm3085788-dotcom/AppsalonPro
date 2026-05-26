import { createContext, useContext, useMemo, useState } from 'react';

const TiendaCartContext = createContext(null);

export function TiendaCartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const cartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + (Number(item.qty) || 0), 0),
    [cartItems],
  );
  const value = useMemo(
    () => ({ cartItems, setCartItems, cartCount }),
    [cartItems, cartCount],
  );
  return <TiendaCartContext.Provider value={value}>{children}</TiendaCartContext.Provider>;
}

export function useTiendaCart() {
  const ctx = useContext(TiendaCartContext);
  if (!ctx) {
    throw new Error('useTiendaCart debe usarse dentro de TiendaCartProvider');
  }
  return ctx;
}
