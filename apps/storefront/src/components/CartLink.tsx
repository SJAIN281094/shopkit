"use client";

import { ShoppingBag } from "lucide-react";
import { cartCount, useCart } from "@/lib/cart";

export function CartLink({ href }: { href: string }) {
  const count = cartCount(useCart());
  return (
    <a href={href} className="relative inline-flex items-center hover:opacity-70" aria-label={`Cart, ${count} items`}>
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="sk-primary-bg absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
          {count}
        </span>
      )}
    </a>
  );
}
