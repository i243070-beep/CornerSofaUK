'use client';

const STORAGE_KEY = 'corner-sofa-customer-orders';
export type SavedOrderAccess = { id: string; token: string };

export function saveOrderAccess(order: SavedOrderAccess) {
  try {
    const saved = readSavedOrders();
    const next = [order, ...saved.filter(item => item.id !== order.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch { return false; }
}

export function readSavedOrders(): SavedOrderAccess[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedOrderAccess =>
      !!item && typeof item.id === 'string' && /^[A-Z0-9]{6}$/.test(item.id)
      && typeof item.token === 'string' && /^[a-f0-9]{64}$/.test(item.token),
    );
  } catch { return []; }
}
