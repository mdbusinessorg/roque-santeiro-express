import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem, Product } from './types';

const KEY = 'rse_cart_v1';
type Ctx = { items: CartItem[]; ready: boolean; add: (p: Product, qty?: number) => void; remove: (id: string) => void; setQty: (id: string, qty: number) => void; clear: () => void; count: number; subtotal: number };
const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => { try { if (v) setItems(JSON.parse(v)); } catch {} finally { setReady(true); } }); }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {}); }, [items, ready]);
  const add = useCallback((p: Product, qty = 1) => setItems((prev) => {
    const i = prev.find((x) => x.product.id === p.id);
    if (i) return prev.map((x) => x.product.id === p.id ? { ...x, quantity: Math.min(99, x.quantity + qty) } : x);
    return [...prev, { product: p, quantity: qty }];
  }), []);
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((x) => x.product.id !== id)), []);
  const setQty = useCallback((id: string, qty: number) => setItems((prev) => qty <= 0 ? prev.filter((x) => x.product.id !== id) : prev.map((x) => x.product.id === id ? { ...x, quantity: Math.min(99, qty) } : x)), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo<Ctx>(() => ({ items, ready, add, remove, setQty, clear, count: items.reduce((a, x) => a + x.quantity, 0), subtotal: items.reduce((a, x) => a + x.quantity * Number(x.product.price), 0) }), [items, ready, add, remove, setQty, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const c = useContext(CartContext); if (!c) throw new Error('useCart'); return c; }
