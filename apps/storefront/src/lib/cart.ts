"use client";

import { useSyncExternalStore } from "react";

export interface CartLine {
  variantId: string;
  handle: string;
  title: string;
  variantTitle: string;
  image: string | null;
  /** Paise, as last seen; the order is always priced by the server. */
  price: number;
  /** null means unlimited. */
  stock: number | null;
  quantity: number;
}

export const MAX_LINE_QUANTITY = 20;
export const MAX_CART_LINES = 50;

const CHANGE_EVENT = "shopkit-cart-change";
const EMPTY: CartLine[] = [];

/** Each store keeps its own cart; the origin already separates stores, the key keeps previews apart too. */
function storageKey(): string {
  return `shopkit-cart:${window.location.host}`;
}

let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY;

function read(): CartLine[] {
  const raw = window.localStorage.getItem(storageKey());
  if (raw === cachedRaw) return cachedLines;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedLines = Array.isArray(parsed) ? (parsed as CartLine[]).filter((l) => l && typeof l.variantId === "string") : EMPTY;
  } catch {
    cachedLines = EMPTY;
  }
  return cachedLines;
}

function write(lines: CartLine[]) {
  window.localStorage.setItem(storageKey(), JSON.stringify(lines));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function clampQuantity(quantity: number, stock: number | null): number {
  const max = Math.min(MAX_LINE_QUANTITY, stock ?? MAX_LINE_QUANTITY);
  return Math.max(0, Math.min(Math.floor(quantity), max));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === storageKey() && onChange();
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const cart = {
  /** Returns the quantity actually in the cart for this variant afterwards. */
  add(line: Omit<CartLine, "quantity">, quantity: number): number {
    const lines = read();
    const existing = lines.find((l) => l.variantId === line.variantId);
    if (!existing && lines.length >= MAX_CART_LINES) return 0;
    const next = clampQuantity((existing?.quantity ?? 0) + quantity, line.stock);
    write(
      existing
        ? lines.map((l) => (l.variantId === line.variantId ? { ...l, ...line, quantity: next } : l))
        : [...lines, { ...line, quantity: next }],
    );
    return next;
  },
  setQuantity(variantId: string, quantity: number) {
    write(
      read().flatMap((l) => {
        if (l.variantId !== variantId) return [l];
        const q = clampQuantity(quantity, l.stock);
        return q > 0 ? [{ ...l, quantity: q }] : [];
      }),
    );
  },
  /** Replaces details with fresh ones from the server, keeping quantities and dropping sold-out lines. */
  refresh(fresh: CartLine[]) {
    const byId = new Map(fresh.map((l) => [l.variantId, l]));
    write(
      read().flatMap((l) => {
        const current = byId.get(l.variantId);
        if (!current) return [];
        const quantity = clampQuantity(l.quantity, current.stock);
        return quantity > 0 ? [{ ...current, quantity }] : [];
      }),
    );
  },
  clear() {
    write([]);
  },
};

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}
