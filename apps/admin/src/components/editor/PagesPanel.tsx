"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { FilePlus2, LayoutGrid, Trash2, Undo2, X } from "lucide-react";
import {
  createPage,
  customiseCollection,
  MAX_COLLECTION_LAYOUTS,
  MAX_PAGES,
  PAGE_PRESET_INFO,
  PAGE_PRESETS,
  pageHandleFrom,
  uncustomiseCollection,
  type PagePreset,
  type StoreLayout,
  type StorePage,
} from "@shopkit/themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { COLLECTIONS } from "@/lib/graphql";
import { CheckboxField, TextField, type ErrorAt } from "./fields";
import {
  ALL_PRODUCTS_HANDLE,
  headerMenu,
  MAX_MENU_LINKS,
  pageHref,
  parseTargetKey,
  relinkPage,
  setHeaderMenu,
  targetHasIssues,
  targetKey,
  TEMPLATE_INFO,
  type PageTarget,
} from "./page-targets";

const ADD_PAGE = "__add__";
const CUSTOMISE_COLLECTION = "__customise_collection__";
const FOOTER_PRESETS = new Set<PagePreset>(["shipping", "returns", "privacy"]);
const MAX_FOOTER_LINKS = 10;

/** Links a page from the footer unless it already is (older designs link /policies/<name>). */
function addFooterLink(layout: StoreLayout, link: { label: string; href: string }): StoreLayout {
  const name = link.href.split("/").pop();
  return {
    ...layout,
    sections: layout.sections.map((s) => {
      if (s.type !== "footer") return s;
      const links = s.settings.links;
      if (links.length >= MAX_FOOTER_LINKS || links.some((l) => l.href === link.href || l.href === `/policies/${name}`)) return s;
      return { ...s, settings: { ...s.settings, links: [...links, link] } };
    }),
  };
}

export function PagePicker({
  layout,
  target,
  issuePaths,
  onSelect,
  onChange,
}: {
  layout: StoreLayout;
  target: PageTarget;
  issuePaths: (string | number)[][];
  onSelect: (target: PageTarget) => void;
  onChange: (layout: StoreLayout, select?: PageTarget) => void;
}) {
  const [adding, setAdding] = useState<"page" | "collection" | null>(null);
  const { data } = useQuery(COLLECTIONS);
  const pages = layout.pages ?? [];
  const customised = Object.keys(layout.templates?.collections ?? {});
  const collectionName = (handle: string) =>
    handle === ALL_PRODUCTS_HANDLE
      ? "Shop all"
      : (data?.collections.find((c) => c.handle === handle)?.name ?? (data ? `${handle} (deleted)` : handle));
  const flag = (t: PageTarget) => (targetHasIssues(t, layout, issuePaths) ? "  ⚠" : "");

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <Label htmlFor="page-picker" className="text-xs">
        Editing page
      </Label>
      <Select
        id="page-picker"
        value={targetKey(target)}
        onChange={(e) => {
          if (e.target.value === ADD_PAGE) setAdding("page");
          else if (e.target.value === CUSTOMISE_COLLECTION) setAdding("collection");
          else {
            setAdding(null);
            onSelect(parseTargetKey(e.target.value));
          }
        }}
      >
        <option value="home">Home{flag({ kind: "home" })}</option>
        <optgroup label="Store pages">
          <option value="template:product">Product page{flag({ kind: "template", key: "product" })}</option>
          <option value="template:collection">
            Collection page{customised.length > 0 && " (shared)"}
            {flag({ kind: "template", key: "collection" })}
          </option>
          {customised.map((handle) => (
            <option key={handle} value={`collection:${handle}`}>
              Collection: {collectionName(handle)} — own layout
              {flag({ kind: "collection", handle })}
            </option>
          ))}
          {customised.length < MAX_COLLECTION_LAYOUTS && (
            <option value={CUSTOMISE_COLLECTION}>+ Give a collection its own layout…</option>
          )}
        </optgroup>
        <optgroup label={`Your pages (${pages.length}/${MAX_PAGES})`}>
          {pages.map((p) => (
            <option key={p.id} value={`page:${p.id}`}>
              {p.title} — /pages/{p.handle}
              {flag({ kind: "page", id: p.id })}
            </option>
          ))}
          {pages.length < MAX_PAGES && <option value={ADD_PAGE}>+ Add a page…</option>}
        </optgroup>
      </Select>
      {adding === "page" ? (
        <AddPage
          layout={layout}
          onCancel={() => setAdding(null)}
          onAdd={(next, page) => {
            setAdding(null);
            onChange(next, { kind: "page", id: page.id });
          }}
        />
      ) : adding === "collection" ? (
        <CustomiseCollection
          choices={[
            { handle: ALL_PRODUCTS_HANDLE, name: "Shop all", hint: "/collections/all — every product" },
            ...(data?.collections ?? []).map((c) => ({ handle: c.handle, name: c.name, hint: `/collections/${c.handle}` })),
          ].filter((c) => !customised.includes(c.handle))}
          loading={!data}
          onCancel={() => setAdding(null)}
          onPick={(handle) => {
            setAdding(null);
            onChange(customiseCollection(layout, handle), { kind: "collection", handle });
          }}
        />
      ) : target.kind === "collection" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Only {collectionName(target.handle)} uses this layout. Other collections use the shared Collection page.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Undo2 />}
            onClick={() => {
              if (!window.confirm(`Use the shared Collection page for ${collectionName(target.handle)}? This layout will be removed.`)) return;
              onChange(uncustomiseCollection(layout, target.handle), { kind: "template", key: "collection" });
            }}
          >
            Use the shared layout again
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {target.kind === "template"
            ? TEMPLATE_INFO[target.key].hint
            : target.kind === "page"
              ? "The header, announcement bar and footer are shared by every page — edit them on Home."
              : "Your header, announcement bar and footer are edited here and shown on every page."}
        </p>
      )}
    </div>
  );
}

function CustomiseCollection({
  choices,
  loading,
  onPick,
  onCancel,
}: {
  choices: { handle: string; name: string; hint: string }[];
  loading: boolean;
  onPick: (handle: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-dashed p-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Which collection?</p>
        <button type="button" aria-label="Cancel" onClick={onCancel} className="rounded p-1 text-muted-foreground hover:bg-accent">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading collections…</p>
      ) : choices.length === 0 ? (
        <p className="text-xs text-muted-foreground">Every collection already has its own layout.</p>
      ) : (
        <div className="grid gap-1.5">
          {choices.map((c) => (
            <button
              key={c.handle}
              type="button"
              onClick={() => onPick(c.handle)}
              className="flex items-start gap-2 rounded-md border bg-background p-2 text-left hover:border-primary"
            >
              <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">It starts as a copy of the shared Collection page — then change anything.</p>
    </div>
  );
}

function AddPage({
  layout,
  onAdd,
  onCancel,
}: {
  layout: StoreLayout;
  onAdd: (layout: StoreLayout, page: StorePage) => void;
  onCancel: () => void;
}) {
  const [inMenu, setInMenu] = useState(true);
  const pages = layout.pages ?? [];
  const menu = headerMenu(layout);
  const existing = new Set(pages.map((p) => p.handle));

  function add(preset: PagePreset) {
    const page = createPage(preset, pages, { storeName: layout.settings.logoText });
    const link = { label: page.title.slice(0, 40), href: pageHref(page.handle) };
    let next: StoreLayout = { ...layout, pages: [...pages, page] };
    if (FOOTER_PRESETS.has(preset)) next = addFooterLink(next, link);
    else if (inMenu && menu && menu.length < MAX_MENU_LINKS) next = setHeaderMenu(next, [...menu, link]);
    onAdd(next, page);
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Start from</p>
        <button type="button" aria-label="Cancel" onClick={onCancel} className="rounded p-1 text-muted-foreground hover:bg-accent">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-1.5">
        {PAGE_PRESETS.map((preset) => {
          const info = PAGE_PRESET_INFO[preset];
          return (
            <button
              key={preset}
              type="button"
              onClick={() => add(preset)}
              className="flex items-start gap-2 rounded-md border bg-background p-2 text-left hover:border-primary"
            >
              <FilePlus2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {preset === "blank" ? "Blank page" : info.title}
                  {preset !== "blank" && existing.has(info.handle) && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you have one)</span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">{info.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {menu && (
        <CheckboxField
          label={menu.length < MAX_MENU_LINKS ? "Add a link in the header menu" : "Header menu is full (8 links)"}
          checked={inMenu && menu.length < MAX_MENU_LINKS}
          onChange={setInMenu}
        />
      )}
      <p className="text-xs text-muted-foreground">Shipping, returns and privacy pages are linked from your footer instead.</p>
    </div>
  );
}

export function PageSettingsForm({
  layout,
  page,
  errorAt,
  onChange,
  onDeleted,
}: {
  layout: StoreLayout;
  page: StorePage;
  errorAt: ErrorAt;
  onChange: (layout: StoreLayout) => void;
  onDeleted: () => void;
}) {
  const menu = headerMenu(layout);
  const href = pageHref(page.handle);
  const inMenu = !!menu?.some((l) => l.href === href);

  const setPage = (patch: Partial<StorePage>, base: StoreLayout = layout) => ({
    ...base,
    pages: (base.pages ?? []).map((p) => (p.id === page.id ? { ...p, ...patch } : p)),
  });

  function setHandle(raw: string) {
    const handle = raw.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
    onChange(setPage({ handle }, relinkPage(layout, href, { label: "", href: pageHref(handle) })));
  }

  function toggleMenu(on: boolean) {
    if (!menu) return;
    const next = on ? [...menu, { label: page.title.slice(0, 40), href }] : menu.filter((l) => l.href !== href);
    onChange(setHeaderMenu(layout, next));
  }

  function remove() {
    if (!window.confirm(`Delete the “${page.title}” page? Links to it in your header and footer are removed too.`)) return;
    const next = relinkPage({ ...layout, pages: (layout.pages ?? []).filter((p) => p.id !== page.id) }, href, null);
    onChange(next);
    onDeleted();
  }

  return (
    <>
      <TextField label="Page title" value={page.title} max={60} onChange={(title) => onChange(setPage({ title }))} error={errorAt(["title"])} />
      <div className="space-y-1.5">
        <Label htmlFor="page-handle" className="text-xs">
          Page address
        </Label>
        <div className="flex items-center rounded-md border bg-background text-sm focus-within:ring-1 focus-within:ring-primary">
          <span className="pl-3 text-muted-foreground">/pages/</span>
          <input
            id="page-handle"
            value={page.handle}
            maxLength={60}
            aria-invalid={!!errorAt(["handle"])}
            onChange={(e) => setHandle(e.target.value)}
            onBlur={() => page.handle !== pageHandleFrom(page.handle) && setHandle(pageHandleFrom(page.handle))}
            className="h-9 min-w-0 flex-1 bg-transparent pr-3 outline-none"
          />
        </div>
        <p className={`text-xs ${errorAt(["handle"]) ? "text-destructive" : "text-muted-foreground"}`}>
          {errorAt(["handle"]) ?? "Links in your header and footer follow when you change this."}
        </p>
      </div>
      <TextField
        label="Search description (optional)"
        rows={2}
        value={page.description}
        max={160}
        onChange={(description) => onChange(setPage({ description }))}
        error={errorAt(["description"])}
        hint="Shown by Google and when the link is shared on WhatsApp."
      />
      {menu && (
        <CheckboxField
          label="Show in header menu"
          checked={inMenu}
          onChange={(on) => (!on || menu.length < MAX_MENU_LINKS ? toggleMenu(on) : undefined)}
        />
      )}
      {menu && !inMenu && menu.length >= MAX_MENU_LINKS && (
        <p className="text-xs text-muted-foreground">The header menu is full — remove a link from the Header section first.</p>
      )}
      <Button type="button" variant="outline" size="sm" icon={<Trash2 />} onClick={remove} className="text-destructive">
        Delete page
      </Button>
    </>
  );
}
