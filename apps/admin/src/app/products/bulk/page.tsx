"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeft, Check, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { UploadButton } from "@/components/ImagePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_PRODUCT_LISTING_COST,
  COLLECTIONS,
  CREATE_PRODUCT,
  CURRENT_SHOP,
  GENERATE_PRODUCT_LISTING,
  PRODUCTS,
  type ProductStatus,
} from "@/lib/graphql";
import { rupeesToPaise } from "@/lib/money";

const MAX_ROWS = 30;

interface Row {
  key: string;
  image: string;
  title: string;
  description: string;
  price: string;
  stock: string;
  collectionId: string;
  state: "idle" | "ai" | "saving" | "error";
  error?: string;
}

function rowError(row: Row): string | null {
  if (!row.title.trim()) return "Add a name";
  if (rupeesToPaise(row.price) === null) return "Enter a valid price";
  if (row.stock.trim() && !/^\d+$/.test(row.stock.trim())) return "Stock must be a whole number";
  return null;
}

function BulkAdd() {
  const router = useRouter();
  const { data: shopData } = useQuery(CURRENT_SHOP);
  const { data: costData } = useQuery(AI_PRODUCT_LISTING_COST);
  const { data: collectionsData } = useQuery(COLLECTIONS);
  const [generate] = useMutation(GENERATE_PRODUCT_LISTING, { refetchQueries: [{ query: CURRENT_SHOP }] });
  const [createProduct] = useMutation(CREATE_PRODUCT, { refetchQueries: [{ query: PRODUCTS }] });
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [busy, setBusy] = useState<"ai" | "save" | null>(null);
  const latest = useRef(rows);
  latest.current = rows;

  const shop = shopData?.currentShop;
  const cost = costData?.aiProductListingCost ?? 0;
  const collections = collectionsData?.collections ?? [];
  const aiBlocked = !shop?.aiEnabled ? "AI is turned off for this store." : null;

  function update(key: string, patch: Partial<Row>) {
    const next = latest.current.map((r) => (r.key === key ? { ...r, ...patch } : r));
    latest.current = next;
    setRows(next);
  }

  function addPhoto(url: string) {
    if (latest.current.length >= MAX_ROWS) {
      toast.error(`Up to ${MAX_ROWS} products at a time`);
      return;
    }
    const next = [
      ...latest.current,
      { key: crypto.randomUUID(), image: url, title: "", description: "", price: "", stock: "", collectionId: "", state: "idle" as const },
    ];
    latest.current = next;
    setRows(next);
  }

  async function fillWithAi(row: Row): Promise<boolean> {
    update(row.key, { state: "ai", error: undefined });
    try {
      const { data } = await generate({ variables: { input: { imageUrl: row.image, hint: row.title.trim() } } });
      if (!data) throw new Error("No response");
      const listing = data.generateProductListing;
      update(row.key, {
        state: "idle",
        title: listing.title,
        description: listing.description,
        ...(listing.collectionId && { collectionId: listing.collectionId }),
      });
      return true;
    } catch (error) {
      update(row.key, { state: "error", error: (error as Error).message });
      return false;
    }
  }

  async function fillAll() {
    const targets = latest.current.filter((r) => !r.title.trim() || !r.description.trim());
    if (!targets.length) {
      toast.info("Every product already has a name and description");
      return;
    }
    setBusy("ai");
    let filled = 0;
    for (const row of targets) {
      if (!(await fillWithAi(row))) break;
      filled++;
    }
    setBusy(null);
    if (filled) toast.success(`Filled ${filled} product${filled === 1 ? "" : "s"} — review before saving`);
  }

  async function createAll() {
    const invalid = latest.current.find((r) => rowError(r));
    if (invalid) {
      update(invalid.key, { state: "error", error: rowError(invalid) ?? undefined });
      toast.error("Fix the highlighted products first");
      return;
    }
    setBusy("save");
    let created = 0;
    for (const row of [...latest.current]) {
      update(row.key, { state: "saving", error: undefined });
      try {
        await createProduct({
          variables: {
            input: {
              title: row.title.trim(),
              description: row.description.trim(),
              price: rupeesToPaise(row.price),
              compareAtPrice: null,
              stock: row.stock.trim() ? Number(row.stock.trim()) : null,
              images: [row.image],
              status,
              collectionId: row.collectionId || null,
              options: [],
              variants: [],
            },
          },
        });
        created++;
        const next = latest.current.filter((r) => r.key !== row.key);
        latest.current = next;
        setRows(next);
      } catch (error) {
        update(row.key, { state: "error", error: (error as Error).message });
      }
    }
    setBusy(null);
    if (created) toast.success(`Added ${created} product${created === 1 ? "" : "s"}`);
    if (!latest.current.length) router.push("/products");
  }

  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" asChild>
            <Link href="/products" aria-label="Back to products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Add products from photos</h1>
            <p className="text-sm text-muted-foreground">One photo per product. Add more photos or sizes later from each product.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">
              {rows.length ? `${rows.length} product${rows.length === 1 ? "" : "s"}` : "Upload photos"}
            </CardTitle>
            <CardDescription>
              {aiBlocked ??
                `Type the details yourself, or fill them with AI (${cost} credits each · ${shop?.aiCreditsBalance ?? 0} left).`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton label={rows.length ? "Add more photos" : "Choose photos"} multiple onUploaded={addPhoto} disabled={!!busy} />
            {rows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Sparkles />}
                loading={busy === "ai"}
                disabled={!!aiBlocked || !!busy}
                onClick={fillAll}
              >
                Fill empty ones with AI
              </Button>
            )}
          </div>
        </CardHeader>
        {rows.length > 0 && (
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[96px_1fr] ${row.state === "error" ? "border-destructive" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.image} alt="" className="h-24 w-24 rounded-md object-cover" />
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      aria-label="Product name"
                      className="min-w-48 flex-1"
                      placeholder="Product name"
                      maxLength={120}
                      value={row.title}
                      onChange={(e) => update(row.key, { title: e.target.value })}
                    />
                    <Input
                      aria-label="Price in rupees"
                      className="w-28"
                      inputMode="decimal"
                      placeholder="Price ₹"
                      value={row.price}
                      onChange={(e) => update(row.key, { price: e.target.value })}
                    />
                    <Input
                      aria-label="Stock"
                      className="w-24"
                      inputMode="numeric"
                      placeholder="Stock"
                      value={row.stock}
                      onChange={(e) => update(row.key, { stock: e.target.value })}
                    />
                    <Select
                      aria-label="Collection"
                      className="w-40"
                      value={row.collectionId}
                      onChange={(e) => update(row.key, { collectionId: e.target.value })}
                    >
                      <option value="">No collection</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Textarea
                    aria-label="Description"
                    rows={2}
                    maxLength={5000}
                    placeholder="Description (optional)"
                    value={row.description}
                    onChange={(e) => update(row.key, { description: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-destructive">{row.state === "error" ? row.error : ""}</span>
                    <div className="flex items-center gap-1">
                      {row.state === "saving" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Sparkles />}
                        loading={row.state === "ai"}
                        disabled={!!aiBlocked || !!busy}
                        onClick={() => fillWithAi(row)}
                      >
                        AI
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove"
                        disabled={!!busy}
                        onClick={() => setRows(latest.current.filter((r) => r.key !== row.key))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
              <Select aria-label="Status" className="w-56" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                <option value="DRAFT">Save as drafts (hidden)</option>
                <option value="ACTIVE">Publish to store</option>
              </Select>
              <Button type="button" icon={<Check />} loading={busy === "save"} disabled={!!busy} onClick={createAll}>
                Add {rows.length} product{rows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function BulkAddPage() {
  return (
    <AppShell>
      <BulkAdd />
    </AppShell>
  );
}
