"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { ImageIcon, Images, Loader2, Package, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PRODUCTS, type Product } from "@/lib/graphql";
import { formatInr } from "@/lib/money";
import { cn } from "@/lib/utils";

function stockLabel(product: Product): string {
  if (product.stock === null) return "Not tracked";
  if (product.stock === 0) return "Sold out";
  return `${product.stock} in stock`;
}

function ProductList() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const { data, loading } = useQuery(PRODUCTS, {
    variables: { filter: deferredSearch ? { search: deferredSearch } : {} },
  });
  const products = data?.products ?? [];

  return (
    <div className="mx-auto mt-8 max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Everything you sell. Active products show on your store.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/products/bulk">
              <Images className="h-4 w-4" /> Add from photos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4" /> Add product
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && products.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Package className="h-8 w-8 text-primary" />
            <p className="font-medium">{deferredSearch ? "No products match your search" : "No products yet"}</p>
            {!deferredSearch && (
              <>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Add a photo and a price — or let AI write the title and description from your photo.
                </p>
                <Button asChild>
                  <Link href="/products/new">Add your first product</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="divide-y">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex items-center gap-4 p-3 transition-colors hover:bg-accent/50"
            >
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt="" className="h-14 w-14 rounded-md object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {product.collection?.name ?? "No collection"} · {stockLabel(product)}
                  {product.variants.length > 1 && ` · ${product.variants.length} variants`}
                </p>
              </div>
              <span className="text-sm font-medium">
                {product.variants.some((v) => v.price !== product.price) && "from "}
                {formatInr(product.price)}
              </span>
              <span
                className={cn(
                  "w-16 rounded-full px-2 py-0.5 text-center text-xs font-medium",
                  product.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {product.status === "ACTIVE" ? "Active" : "Draft"}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <AppShell>
      <ProductList />
    </AppShell>
  );
}
