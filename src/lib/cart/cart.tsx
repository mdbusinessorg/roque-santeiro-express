"use client";

import * as React from "react";

export type CartItem = {
  product_id: string; slug: string; name: string; image: string; price: number; compare_at_price: number | null;
  store_id: string; store_name: string; store_slug: string; stock: number; quantity: number;
};

type Ctx = {
  items: CartItem[]; count: number; subtotal: number; ready: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = React.createContext<Ctx | null>(null);
const KEY = "rse_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
    setReady(true);
  }, []);
  React.useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(items)); }, [items, ready]);

  const value = React.useMemo<Ctx>(() => ({
    items, ready,
    count: items.reduce((a, i) => a + i.quantity, 0),
    subtotal: items.reduce((a, i) => a + i.quantity * i.price, 0),
    add: (item, qty = 1) => setItems((prev) => {
      const ex = prev.find((p) => p.product_id === item.product_id);
      if (ex) return prev.map((p) => p.product_id === item.product_id ? { ...p, ...item, quantity: Math.min(p.quantity + qty, item.stock) } : p);
      return [...prev, { ...item, quantity: Math.min(qty, item.stock) }];
    }),
    setQty: (id, qty) => setItems((prev) => prev.map((p) => p.product_id === id ? { ...p, quantity: Math.max(1, Math.min(qty, p.stock)) } : p)),
    remove: (id) => setItems((prev) => prev.filter((p) => p.product_id !== id)),
    clear: () => setItems([]),
  }), [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = React.useContext(CartContext);
  if (!c) throw new Error("CartProvider missing");
  return c;
}
