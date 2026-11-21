"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { ExternalLink, Globe, Loader2, Package, Pencil, Plus, Rocket, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CREATE_THEME_PREVIEW,
  CURRENT_SHOP,
  DELETE_THEME,
  MY_SHOPS,
  ORDER_COUNTS,
  PRODUCTS,
  PUBLISH_THEME,
  THEMES,
  type Theme,
} from "@/lib/graphql";
import { session } from "@/lib/session";
import { storefrontHostLabel, storefrontUrl } from "@/lib/storefront-url";

function StatusBadge({ status }: { status: Theme["status"] }) {
  const live = status === "PUBLISHED";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        live ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {live ? "Live" : "Draft"}
    </span>
  );
}

function ShopSwitcher({ currentId }: { currentId: string }) {
  const client = useApolloClient();
  const router = useRouter();
  const { data } = useQuery(MY_SHOPS);
  const shops = data?.myShops ?? [];
  if (shops.length < 2) return null;

  async function switchTo(id: string) {
    session.setShopId(id);
    await client.resetStore();
    router.replace("/dashboard");
  }

  return (
    <select
      className="h-9 rounded-md border bg-background px-2 text-sm"
      value={currentId}
      onChange={(e) => switchTo(e.target.value)}
    >
      {shops.map(({ shop }) => (
        <option key={shop.id} value={shop.id}>
          {shop.name}
        </option>
      ))}
    </select>
  );
}

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: shopData, error: shopError } = useQuery(CURRENT_SHOP);
  const { data: themesData, loading: themesLoading } = useQuery(THEMES);
  const [publishTheme, publishState] = useMutation(PUBLISH_THEME, { refetchQueries: [{ query: THEMES }] });
  const [createPreview] = useMutation(CREATE_THEME_PREVIEW);
  const [deleteTheme, deleteState] = useMutation(DELETE_THEME, { refetchQueries: [{ query: THEMES }] });
  const { data: productsData } = useQuery(PRODUCTS);
  const orderCounts = useQuery(ORDER_COUNTS).data?.orderCounts;
  const productCount = productsData?.products.length ?? 0;
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("theme"));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const shop = shopData?.currentShop;
  const themes = themesData?.themes ?? [];
  const liveTheme = themes.find((t) => t.status === "PUBLISHED");
  const selected = themes.find((t) => t.id === selectedId) ?? themes[0];

  useEffect(() => {
    if (shopError && !shopData) {
      session.clearShopId();
      router.replace("/onboarding");
    }
  }, [shopError, shopData, router]);

  useEffect(() => {
    if (!selected || !shop) return;
    let cancelled = false;
    setPreviewUrl(null);
    createPreview({ variables: { input: { themeId: selected.id } } })
      .then(({ data }) => {
        if (!cancelled && data) setPreviewUrl(storefrontUrl(shop.subdomain, data.createThemePreview.token));
      })
      .catch((error: Error) => toast.error(error.message));
    return () => {
      cancelled = true;
    };
  }, [selected?.id, shop?.subdomain, createPreview]);

  async function publish(theme: Theme) {
    try {
      await publishTheme({ variables: { input: { themeId: theme.id } } });
      toast.success("Your store is live!");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function remove(theme: Theme) {
    if (!window.confirm(`Delete “${theme.name}”? This can't be undone.`)) return;
    try {
      await deleteTheme({ variables: { input: { themeId: theme.id } } });
      setSelectedId(null);
      toast.success("Design deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  if (!shop) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{shop.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            {storefrontHostLabel(shop.subdomain)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShopSwitcher currentId={shop.id} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/onboarding">
              <Plus className="h-4 w-4" /> New store
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Store status</CardDescription>
            <CardTitle className="text-lg">{liveTheme ? "Live" : "Not live yet"}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{liveTheme ? `Showing “${liveTheme.name}”` : "Publish a design to open your store to customers."}</span>
            {liveTheme && (
              <Button size="sm" variant="outline" asChild>
                <a href={storefrontUrl(shop.subdomain)} target="_blank" rel="noreferrer">
                  View store <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Orders to ship</CardDescription>
            <CardTitle className="text-lg">{orderCounts?.toShip ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{orderCounts?.total ? `${orderCounts.total} orders so far` : "No orders yet."}</span>
            <Button size="sm" variant="outline" asChild>
              <Link href="/orders">
                <ShoppingBag className="h-4 w-4" /> View
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products</CardDescription>
            <CardTitle className="text-lg">{productCount}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{productCount ? "Shown in your product grids." : "Add products to start selling."}</span>
            <Button size="sm" variant="outline" asChild>
              <Link href={productCount ? "/products" : "/products/new"}>
                <Package className="h-4 w-4" /> {productCount ? "Manage" : "Add product"}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI credits</CardDescription>
            <CardTitle className="text-lg">{shop.aiEnabled ? shop.aiCreditsBalance : "Turned off"}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>For AI store setup and listings. Manual editing is always free.</span>
            <Button size="sm" variant="outline" asChild>
              <Link href={shop.aiEnabled ? "/billing" : "/settings"}>{shop.aiEnabled ? "Buy" : "Turn on"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {themesLoading && themes.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : themes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="font-medium">Your store needs a design</p>
            <p className="text-sm text-muted-foreground">Pick a free template or describe your store to AI.</p>
            <Button asChild>
              <Link href="/onboarding/design">Choose a design</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Designs</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/onboarding/design">
                  <Plus className="h-4 w-4" /> Add
                </Link>
              </Button>
            </div>
            {themes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedId(theme.id)}
                className={cn(
                  "w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent",
                  selected?.id === theme.id && "border-primary ring-1 ring-primary",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{theme.name}</span>
                  <StatusBadge status={theme.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {theme.source === "AI" ? "Made with AI" : "From template"} ·{" "}
                  {new Date(theme.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>

          {selected && (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selected.name}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex items-center gap-2">
                  {selected.status !== "PUBLISHED" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 />}
                      loading={deleteState.loading}
                      onClick={() => remove(selected)}
                    >
                      Delete
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/designs/${selected.id}`}>
                      <Pencil className="h-4 w-4" /> Edit design
                    </Link>
                  </Button>
                  {previewUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={previewUrl} target="_blank" rel="noreferrer">
                        Open preview <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {selected.status !== "PUBLISHED" && (
                    <Button
                      size="sm"
                      icon={<Rocket />}
                      loading={publishState.loading}
                      onClick={() => publish(selected)}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </div>
              {previewUrl ? (
                <iframe key={previewUrl} src={previewUrl} title="Store preview" className="h-[70vh] w-full bg-white" />
              ) : (
                <div className="flex h-[70vh] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
