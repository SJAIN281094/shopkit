"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeft, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GST_RATES, variantKey } from "@shopkit/commerce";
import { ImageListField } from "@/components/ImagePicker";
import { EMPTY_ROW, VariantsEditor, variantList, type VariantRow, type VariantsValue } from "@/components/VariantsEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_PRODUCT_LISTING_COST,
  COLLECTIONS,
  CREATE_PRODUCT,
  CURRENT_SHOP,
  DELETE_PRODUCT,
  GENERATE_PRODUCT_LISTING,
  PRODUCTS,
  UPDATE_PRODUCT,
  type Product,
  type ProductInput,
  type ProductStatus,
  type ProductVariantInput,
} from "@/lib/graphql";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import { storefrontUrl } from "@/lib/storefront-url";

const MAX_IMAGES = 8;

function initialVariants(product?: Product): VariantsValue {
  const rows: Record<string, VariantRow> = {};
  if (product?.options.length) {
    for (const v of product.variants) {
      rows[variantKey(v.optionValues)] = {
        price: paiseToRupees(v.price),
        compareAt: paiseToRupees(v.compareAtPrice),
        stock: v.stock === null ? "" : String(v.stock),
        sku: v.sku ?? "",
      };
    }
  }
  return { options: product?.options ?? [], rows };
}

/** Validates typed prices/stock; returns paise values or an error message. */
function parsePricing(row: VariantRow, label: string) {
  const price = rupeesToPaise(row.price);
  if (price === null) return `${label}: enter a valid price, e.g. 799 or 799.50`;
  const compareAt = row.compareAt.trim() ? rupeesToPaise(row.compareAt) : null;
  if (row.compareAt.trim() && compareAt === null) return `${label}: enter a valid original price`;
  if (compareAt !== null && compareAt <= price) return `${label}: the original price must be higher than the selling price`;
  if (row.stock.trim() && !/^\d+$/.test(row.stock.trim())) return `${label}: stock must be a whole number`;
  return { price, compareAtPrice: compareAt, stock: row.stock.trim() ? Number(row.stock.trim()) : null };
}

function AiFillCard({
  imageUrl,
  onFilled,
}: {
  imageUrl: string;
  onFilled: (listing: { title: string; description: string; collectionId: string | null }) => void;
}) {
  const [hint, setHint] = useState("");
  const { data: shopData } = useQuery(CURRENT_SHOP);
  const { data: costData } = useQuery(AI_PRODUCT_LISTING_COST);
  const [generate, { loading }] = useMutation(GENERATE_PRODUCT_LISTING, { refetchQueries: [{ query: CURRENT_SHOP }] });

  const shop = shopData?.currentShop;
  const cost = costData?.aiProductListingCost ?? 0;
  const blocked = !shop?.aiEnabled ? "AI is turned off for this store." : shop.aiCreditsBalance < cost ? "Not enough AI credits." : null;

  async function run() {
    try {
      const { data } = await generate({ variables: { input: { imageUrl, hint: hint.trim() } } });
      if (data) {
        onFilled(data.generateProductListing);
        toast.success("Details filled in — review and edit before saving");
      }
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-accent/40 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" /> Write the details with AI
      </p>
      <Input
        placeholder="Optional: a few words, e.g. “blue cotton kurta, sizes M–XL”"
        value={hint}
        maxLength={300}
        onChange={(e) => setHint(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {blocked ?? `Uses ${cost} AI credits · ${shop?.aiCreditsBalance ?? 0} left. You can always type it yourself.`}
        </span>
        <Button type="button" size="sm" loading={loading} disabled={!!blocked} onClick={run} icon={<Sparkles />}>
          Fill with AI
        </Button>
      </div>
    </div>
  );
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const { data: collectionsData } = useQuery(COLLECTIONS);
  const { data: shopData } = useQuery(CURRENT_SHOP);
  const refetchQueries = [{ query: PRODUCTS }];
  const [createProduct, createState] = useMutation(CREATE_PRODUCT, { refetchQueries });
  const [updateProduct, updateState] = useMutation(UPDATE_PRODUCT, { refetchQueries });
  const [deleteProduct, deleteState] = useMutation(DELETE_PRODUCT, { refetchQueries });

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(paiseToRupees(product?.price ?? null));
  const [compareAt, setCompareAt] = useState(paiseToRupees(product?.compareAtPrice ?? null));
  const [stock, setStock] = useState(product?.stock === null || product?.stock === undefined ? "" : String(product.stock));
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "ACTIVE");
  const [collectionId, setCollectionId] = useState(product?.collectionId ?? "");
  const [variants, setVariants] = useState<VariantsValue>(() => initialVariants(product));
  const [gstRate, setGstRate] = useState(product?.gstRate === null || product?.gstRate === undefined ? "" : String(product.gstRate));
  const [hsnCode, setHsnCode] = useState(product?.hsnCode ?? "");
  const combos = variantList(variants.options);
  const hasVariants = variants.options.length > 0;

  const collections = collectionsData?.collections ?? [];
  const shop = shopData?.currentShop;
  const saving = createState.loading || updateState.loading;

  function buildInput(): ProductInput | string {
    if (!title.trim()) return "Add a product name";
    if (hsnCode.trim() && !/^\d{4,8}$/.test(hsnCode.trim())) return "HSN code must be 4 to 8 digits";
    const base = {
      title: title.trim(),
      description: description.trim(),
      images,
      status,
      collectionId: collectionId || null,
      gstRate: gstRate === "" ? null : Number(gstRate),
      hsnCode: hsnCode.trim() || null,
    };

    if (hasVariants) {
      const options = variants.options.map((o) => ({ name: o.name.trim(), values: o.values }));
      if (options.some((o) => !o.name)) return "Give every option a name, e.g. Size";
      if (options.some((o) => !o.values.length)) return "Add at least one value to every option";
      if (new Set(options.map((o) => o.name.toLowerCase())).size !== options.length) return "Option names must be different";
      const list: ProductVariantInput[] = [];
      for (const combo of combos) {
        const row = variants.rows[variantKey(combo)] ?? EMPTY_ROW;
        const pricing = parsePricing(row, combo.join(" / "));
        if (typeof pricing === "string") return pricing;
        list.push({ optionValues: combo, ...pricing, sku: row.sku.trim() || null });
      }
      return { ...base, options, variants: list };
    }

    const pricing = parsePricing({ price, compareAt, stock, sku: "" }, "Price");
    if (typeof pricing === "string") return pricing.replace(/^Price: /, "");
    return { ...base, ...pricing, options: [], variants: [] };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const input = buildInput();
    if (typeof input === "string") {
      toast.error(input);
      return;
    }
    try {
      if (product) {
        await updateProduct({ variables: { id: product.id, input } });
        toast.success("Product saved");
      } else {
        const { data } = await createProduct({ variables: { input } });
        toast.success("Product added");
        if (data) router.replace(`/products/${data.createProduct.id}`);
      }
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function remove() {
    if (!product || !window.confirm(`Delete “${product.title}”? This can't be undone.`)) return;
    try {
      await deleteProduct({ variables: { id: product.id } });
      toast.success("Product deleted");
      router.replace("/products");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto mt-8 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" asChild>
            <Link href="/products" aria-label="Back to products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{product ? product.title : "Add product"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {product && shop && product.status === "ACTIVE" && (
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={`${storefrontUrl(shop.subdomain)}/products/${product.handle}`} target="_blank" rel="noreferrer">
                View on store <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          {product && (
            <Button type="button" variant="ghost" size="sm" icon={<Trash2 />} loading={deleteState.loading} onClick={remove}>
              Delete
            </Button>
          )}
          <Button type="submit" loading={saving}>
            {product ? "Save" : "Add product"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageListField value={images} onChange={setImages} max={MAX_IMAGES} />
              {images[0] && (
                <AiFillCard
                  imageUrl={images[0]}
                  onFilled={(listing) => {
                    setTitle(listing.title);
                    setDescription(listing.description);
                    if (listing.collectionId) setCollectionId(listing.collectionId);
                  }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Name</Label>
                <Input id="title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Blue cotton kurta" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={7}
                  maxLength={5000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fabric, size, how to use, what's in the box…"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{hasVariants ? "Variants" : "Price & stock"}</CardTitle>
              {hasVariants && <CardDescription>Each combination gets its own price and stock.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasVariants && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="799" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="compareAt">Original price (₹)</Label>
                    <Input
                      id="compareAt"
                      inputMode="decimal"
                      value={compareAt}
                      onChange={(e) => setCompareAt(e.target.value)}
                      placeholder="Optional, e.g. 999"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stock">Stock</Label>
                    <Input id="stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Leave empty if unlimited" />
                  </div>
                </div>
              )}
              <VariantsEditor value={variants} onChange={setVariants} basePrice={price} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>Drafts are hidden from your store.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
                <option value="ACTIVE">Active — visible on store</option>
                <option value="DRAFT">Draft — hidden</option>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Collection</CardTitle>
              <CardDescription>Group products, e.g. “Kurtas” or “Gift sets”.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                <option value="">No collection</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Link href="/collections" className="text-xs text-primary hover:underline">
                Manage collections
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax</CardTitle>
              <CardDescription>Used on GST invoices. Prices you enter include GST.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="gstRate">GST rate</Label>
                <Select id="gstRate" value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
                  <option value="">Store default</option>
                  {GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hsn">HSN code</Label>
                <Input id="hsn" inputMode="numeric" maxLength={8} value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="Optional, e.g. 6211" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
