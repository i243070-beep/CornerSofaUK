'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { BuildSnapshot } from '@/lib/sofa-builder/types';

interface CartItem {
  productId: string;
  variantId: string;
  range_type: string;
  color: string;
  price: number;
  quantity: number;
  image: string;
  title: string;
  itemType?: 'sofa' | 'swatch';
  offerToken?: string;
  buildId?: string;
  buildSnapshot?: BuildSnapshot;
}

interface CartContextProps {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  replaceItem: (productId: string, variantId: string, item: Omit<CartItem, 'quantity'>) => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { const stored = JSON.parse(localStorage.getItem('cart') || '[]'); if (Array.isArray(stored)) setItems(stored); } catch {}
  }, []);

  useEffect(() => {
    if (mounted) {
      try { localStorage.setItem('cart', JSON.stringify(items)); } catch {}
    }
  }, [items, mounted]);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...item, offerToken: item.offerToken };
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        const newItem = { ...item, quantity };
        return [...prev, newItem];
      }
    });
  };

  const removeItem = (productId: string, variantId: string) => {
    setItems((prev) => prev.filter(
      (i) => i.productId !== productId || i.variantId !== variantId
    ));
  };

  const updateQuantity = (productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);
  const replaceItem = (productId: string, variantId: string, item: Omit<CartItem, 'quantity'>) => setItems(current => {
    // One update replaces the old line; compatible identical configurations can merge.
    const original = current.find(line => line.variantId === variantId);
    const quantity = original?.quantity || 1;
    const rest = current.filter(line => line !== original);
    const match = rest.find(line => line.productId === item.productId && line.variantId === item.variantId);
    return match ? rest.map(line => line === match ? { ...item, quantity: Math.min(10, line.quantity + quantity) } : line) : [...rest, { ...item, quantity }];
  });

  return (
    <CartContext.Provider value={{ items, total, itemCount, addItem, removeItem, updateQuantity, clearCart, replaceItem }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
