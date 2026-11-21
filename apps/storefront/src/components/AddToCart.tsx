"use client";

import { useState } from "react";
import { Check, MessageCircle, Minus, Plus } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/api";
import { cart, MAX_LINE_QUANTITY } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

const inStock = (v: ProductVariant) => v.stock === null || v.stock > 0;

function firstChoice(product: Product): string[] {
  return (product.variants.find(inStock) ?? product.variants[0])?.optionValues ?? [];
}

export function AddToCart({
  product,
  currency,
  cartHref,
  checkoutHref,
  canCheckout,
  codEnabled,
  whatsapp,
}: {
  product: Product;
  currency: string;
  cartHref: string;
  checkoutHref: string;
  /** False when the store accepts neither COD nor online payments yet. */
  canCheckout: boolean;
  codEnabled: boolean;
  whatsapp: { phone: string; productUrl: string } | null;
}) {
  const [selected, setSelected] = useState<string[]>(() => firstChoice(product));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.optionValues.every((value, i) => value === selected[i]));
  const soldOut = !variant || !inStock(variant);
  const maxQuantity = Math.min(MAX_LINE_QUANTITY, variant?.stock ?? MAX_LINE_QUANTITY);
  const price = variant?.price ?? product.price;
  const compareAt = variant ? variant.compareAtPrice : product.compareAtPrice;
  const discount = compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  /** A value is available if some in-stock variant has it together with the other current choices. */
  function available(optionIndex: number, value: string): boolean {
    return product.variants.some(
      (v) => inStock(v) && v.optionValues[optionIndex] === value && v.optionValues.every((val, i) => i === optionIndex || val === selected[i]),
    );
  }

  function choose(optionIndex: number, value: string) {
    const next = selected.map((v, i) => (i === optionIndex ? value : v));
    // If that exact combination doesn't exist or is sold out, jump to the closest one that's in stock.
    const exact = product.variants.find((v) => v.optionValues.every((val, i) => val === next[i]));
    if (!exact || !inStock(exact)) {
      const fallback = product.variants.find((v) => inStock(v) && v.optionValues[optionIndex] === value);
      if (fallback) {
        setSelected(fallback.optionValues);
        setQuantity(1);
        return;
      }
    }
    setSelected(next);
    setQuantity(1);
  }

  function add(): boolean {
    if (!variant || soldOut) return false;
    const inCart = cart.add(
      {
        variantId: variant.id,
        handle: product.handle,
        title: product.title,
        variantTitle: variant.title,
        image: product.images[0] ?? null,
        price: variant.price,
        stock: variant.stock,
      },
      quantity,
    );
    return inCart > 0;
  }

  function whatsappLink(phone: string, productUrl: string): string {
    const name = variant?.title ? `${product.title} (${variant.title})` : product.title;
    const text = `Hi! I'd like to order "${name}" (${formatPrice(price, currency)}).\n${productUrl}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold">{formatPrice(price, currency)}</span>
        {compareAt && (
          <>
            <span className="sk-muted line-through">{formatPrice(compareAt, currency)}</span>
            <span className="sk-accent-bg rounded-full px-2 py-0.5 text-xs font-semibold">{discount}% off</span>
          </>
        )}
      </div>

      {product.options.map((option, optionIndex) => (
        <div key={option.name} className="space-y-2">
          <p className="text-sm font-medium">
            {option.name}: <span className="sk-muted font-normal">{selected[optionIndex]}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const active = selected[optionIndex] === value;
              const ok = available(optionIndex, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(optionIndex, value)}
                  className={`sk-border min-w-12 rounded-full border px-4 py-2 text-sm transition-colors ${
                    active ? "sk-primary-bg border-transparent" : "hover:opacity-80"
                  } ${ok ? "" : "line-through opacity-50"}`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="sk-muted text-sm">
        {soldOut
          ? "Sold out"
          : variant?.stock !== null && variant?.stock !== undefined && variant.stock <= 5
            ? `Only ${variant.stock} left`
            : `In stock${codEnabled ? " · Cash on delivery available" : ""}`}
      </p>

      {canCheckout && !soldOut && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="sk-border inline-flex items-center rounded-full border">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="p-3 disabled:opacity-40"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-medium" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="p-3 disabled:opacity-40"
              disabled={quantity >= maxQuantity}
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            className="sk-button sk-border border bg-transparent! text-inherit!"
            onClick={() => {
              if (add()) {
                setAdded(true);
                setTimeout(() => setAdded(false), 2500);
              }
            }}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : (
              "Add to cart"
            )}
          </button>
          <button
            type="button"
            className="sk-button"
            onClick={() => {
              if (add()) window.location.href = checkoutHref;
            }}
          >
            Buy now
          </button>
        </div>
      )}
      {(added || (whatsapp && !soldOut)) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
          {added && (
            <a href={cartHref} className="sk-primary-text hover:underline">
              View cart →
            </a>
          )}
          {whatsapp && !soldOut && (
            <a
              href={whatsappLink(whatsapp.phone, whatsapp.productUrl)}
              target="_blank"
              rel="noreferrer"
              className="sk-primary-text inline-flex items-center gap-2 hover:underline"
            >
              <MessageCircle className="h-4 w-4" />
              {canCheckout ? "Or order on WhatsApp" : "Order on WhatsApp"}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
