"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { LayoutTemplate, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LayoutWireframe } from "@/components/LayoutWireframe";
import { cn } from "@/lib/utils";
import {
  CREATE_THEME_FROM_TEMPLATE,
  CURRENT_SHOP,
  GENERATE_THEME_WITH_AI,
  THEME_TEMPLATES,
  THEMES,
  type ThemeTemplateInfo,
} from "@/lib/graphql";

function TemplateCard({
  template,
  loading,
  disabled,
  onSelect,
}: {
  template: ThemeTemplateInfo;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="relative h-32 p-3" style={{ backgroundColor: `color-mix(in srgb, ${template.primaryColor} 8%, white)` }}>
        <LayoutWireframe
          layout={template.layout}
          primary={template.primaryColor}
          accent={template.accentColor}
          background={template.backgroundColor}
        />
        <span
          className="absolute bottom-1.5 right-2 rounded bg-white/90 px-1.5 text-sm font-semibold shadow-sm"
          style={{ color: template.primaryColor, fontFamily: `"${template.headingFont}", serif` }}
        >
          Aa
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{template.name}</p>
          <span
            className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            title={template.layoutDescription}
          >
            {template.layoutName}
          </span>
        </div>
        <p className="flex-1 text-xs text-muted-foreground">{template.description}</p>
        <Button size="sm" variant="outline" className="mt-2" loading={loading} disabled={disabled} onClick={onSelect}>
          Use this template
        </Button>
      </div>
    </div>
  );
}

function DesignChooser() {
  const router = useRouter();
  const { data: shopData } = useQuery(CURRENT_SHOP);
  const { data: templateData } = useQuery(THEME_TEMPLATES);
  const refetchQueries = [{ query: THEMES }, { query: CURRENT_SHOP }];
  const [createFromTemplate] = useMutation(CREATE_THEME_FROM_TEMPLATE, { refetchQueries });
  const [generateWithAi, aiState] = useMutation(GENERATE_THEME_WITH_AI, { refetchQueries });
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [layoutFilter, setLayoutFilter] = useState<string | null>(null);

  const templates = templateData?.themeTemplates ?? [];
  const layouts = [...new Map(templates.map((t) => [t.layout, { key: t.layout, name: t.layoutName, description: t.layoutDescription }])).values()];
  const visibleTemplates = layoutFilter ? templates.filter((t) => t.layout === layoutFilter) : templates;
  const activeLayout = layouts.find((l) => l.key === layoutFilter);
  const shop = shopData?.currentShop;
  const cost = templateData?.aiStoreGenerationCost;
  const busy = pendingTemplate !== null || aiState.loading;
  const notEnoughCredits = shop !== undefined && cost !== undefined && shop.aiCreditsBalance < cost;
  const aiUnavailable = shop ? !shop.aiEnabled || notEnoughCredits : true;

  async function applyTemplate(templateKey: string) {
    setPendingTemplate(templateKey);
    try {
      const { data } = await createFromTemplate({ variables: { input: { templateKey } } });
      if (data) router.push(`/dashboard?theme=${data.createThemeFromTemplate.id}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPendingTemplate(null);
    }
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await generateWithAi({ variables: { input: { description } } });
      if (data) router.push(`/dashboard?theme=${data.generateThemeWithAi.id}`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Design your store{shop ? `: ${shop.name}` : ""}</h1>
        <p className="text-muted-foreground">
          Start from a free template or describe your store and let AI set it up. You can review everything before it
          goes live, and edit it any time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Start from a template
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Free</span>
            </CardTitle>
            <CardDescription>Ready-made designs for your type of business.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {layouts.length > 1 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by layout">
                  {[{ key: null, name: "All layouts" }, ...layouts].map((l) => (
                    <button
                      key={l.key ?? "all"}
                      type="button"
                      role="tab"
                      aria-selected={layoutFilter === l.key}
                      onClick={() => setLayoutFilter(l.key)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        layoutFilter === l.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                      )}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
                {activeLayout && <p className="text-xs text-muted-foreground">{activeLayout.description}</p>}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((template) => (
                <TemplateCard
                  key={template.key}
                  template={template}
                  loading={pendingTemplate === template.key}
                  disabled={busy}
                  onSelect={() => applyTemplate(template.key)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Describe your store
            </CardTitle>
            <CardDescription>
              Tell us what you sell. AI picks the design, colours and writes your homepage copy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generate} className="space-y-3">
              <Textarea
                rows={5}
                required
                minLength={10}
                maxLength={1000}
                placeholder="We sell handmade cotton kurtas and dupattas from Jaipur, block-printed by local artisans."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={aiUnavailable}
              />
              <p className="text-xs text-muted-foreground">
                {shop && cost !== undefined
                  ? `Uses ${cost} AI credits · You have ${shop.aiCreditsBalance}`
                  : "Loading credits…"}
              </p>
              {shop && !shop.aiEnabled && (
                <p className="text-sm text-muted-foreground">AI is turned off for this store. Pick a template instead.</p>
              )}
              {shop?.aiEnabled && notEnoughCredits && (
                <p className="text-sm text-muted-foreground">
                  You are out of AI credits. Templates are always free.
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                icon={<Sparkles />}
                loading={aiState.loading}
                disabled={busy || aiUnavailable || description.trim().length < 10}
              >
                Generate my store
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DesignPage() {
  return (
    <RequireAuth requireShop>
      <AppHeader />
      <main className="px-4 pb-16">
        <DesignChooser />
      </main>
    </RequireAuth>
  );
}
