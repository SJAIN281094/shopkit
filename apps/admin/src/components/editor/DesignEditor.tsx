"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ExternalLink,
  FileText,
  LayoutTemplate,
  Loader2,
  Palette,
  Rocket,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  collectionProductsOf,
  createSection,
  FONT_OPTIONS,
  getLayoutIssues,
  PAGE_HANDLE_PATTERN,
  productDetailsOf,
  SECTION_LIBRARY,
  type Section,
  type SectionType,
  type StoreLayout,
  type ThemeSettings,
} from "@shopkit/themes";
import { SingleImageField } from "@/components/ImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CREATE_THEME_PREVIEW,
  CURRENT_SHOP,
  DELETE_THEME,
  PRODUCTS,
  PUBLISH_THEME,
  SET_THEME_PREVIEW_DRAFT,
  THEMES,
  UPDATE_THEME,
  type Theme,
} from "@/lib/graphql";
import { storefrontUrl } from "@/lib/storefront-url";
import { cn } from "@/lib/utils";
import { CustomFontsField } from "./CustomFontsField";
import { ColorField, IconButton, SelectField, TextField, type ErrorAt } from "./fields";
import { CollectionProductsForm, ProductDetailsForm } from "./page-main-forms";
import {
  HOME,
  findPage,
  mainBlockInfo,
  mainPath,
  slotsFor,
  targetKey,
  withCollectionProducts,
  withProductDetails,
  withSlots,
  type PageTarget,
} from "./page-targets";
import { PagePicker, PageSettingsForm } from "./PagesPanel";
import { PageCategoryLabel } from "./ProductSourceField";
import { SECTION_FORMS, type FormProps } from "./section-forms";

const STYLE_KEY = "__style__";
const PAGE_SETTINGS_KEY = "__page__";
const MAIN_KEY = "__main__";

/** A row in the section list: a section, or the fixed content of a product/collection page. */
type Row = { kind: "section"; section: Section; list: number; index: number } | { kind: "main" };
const PREVIEW_DEBOUNCE_MS = 500;
/** Keep in sync with the storefront's PreviewRefresh. */
const PREVIEW_REFRESH_MESSAGE = "shopkit:preview-refresh";
const FONT_SELECT_OPTIONS = FONT_OPTIONS.map((f) => ({ value: f, label: f }));

function samePath(a: (string | number)[], b: (string | number)[]) {
  return a.length === b.length && a.every((p, i) => String(p) === String(b[i]));
}

function StyleForm({
  settings,
  onChange,
  errorAt,
}: {
  settings: ThemeSettings;
  onChange: (s: ThemeSettings) => void;
  errorAt: ErrorAt;
}) {
  const setColor = (key: keyof ThemeSettings["colors"]) => (v: string) =>
    onChange({ ...settings, colors: { ...settings.colors, [key]: v } });
  const setFont = (key: keyof ThemeSettings["fonts"]) => (v: string) =>
    onChange({ ...settings, fonts: { ...settings.fonts, [key]: v } });
  const fontOptions = [
    ...(settings.customFonts ?? []).map((f) => ({
      value: f.name,
      label: `${f.name} (uploaded)`,
    })),
    ...FONT_SELECT_OPTIONS,
  ];

  return (
    <>
      <TextField
        label="Store name"
        value={settings.logoText}
        max={60}
        onChange={(logoText) => onChange({ ...settings, logoText })}
        error={errorAt(["logoText"])}
        hint={settings.logoUrl ? "Used as the logo's alt text and in the footer" : undefined}
      />
      <div className="space-y-1.5">
        <Label className="text-xs">Logo</Label>
        <SingleImageField contain value={settings.logoUrl ?? ""} onChange={(logoUrl) => onChange({ ...settings, logoUrl })} />
        <p className="text-xs text-muted-foreground">
          {errorAt(["logoUrl"]) ??
            "Shown in the header instead of your store name. A wide PNG with a transparent background works best."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Main colour"
          value={settings.colors.primary}
          onChange={setColor("primary")}
          error={errorAt(["colors", "primary"])}
        />
        <ColorField
          label="Accent"
          value={settings.colors.accent}
          onChange={setColor("accent")}
          error={errorAt(["colors", "accent"])}
        />
        <ColorField
          label="Background"
          value={settings.colors.background}
          onChange={setColor("background")}
          error={errorAt(["colors", "background"])}
        />
        <ColorField label="Text" value={settings.colors.text} onChange={setColor("text")} error={errorAt(["colors", "text"])} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Heading font" value={settings.fonts.heading} onChange={setFont("heading")} options={fontOptions} />
        <SelectField label="Body font" value={settings.fonts.body} onChange={setFont("body")} options={fontOptions} />
      </div>
      <CustomFontsField settings={settings} onChange={onChange} errorAt={errorAt} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Buttons"
          value={settings.style?.buttons ?? "pill"}
          onChange={(buttons) => onChange({ ...settings, style: { ...settings.style, buttons } })}
          options={[
            { value: "pill", label: "Pill" },
            { value: "rounded", label: "Rounded" },
            { value: "square", label: "Square" },
          ]}
        />
        <SelectField
          label="Product cards"
          value={settings.style?.cards ?? "plain"}
          onChange={(cards) => onChange({ ...settings, style: { ...settings.style, cards } })}
          options={[
            { value: "plain", label: "Plain" },
            { value: "bordered", label: "Bordered" },
            { value: "shadow", label: "Shadow" },
          ]}
        />
      </div>
    </>
  );
}

function SectionForm({
  section,
  onChange,
  errorAt,
}: {
  section: Section;
  onChange: (settings: Section["settings"]) => void;
  errorAt: ErrorAt;
}) {
  const Form = SECTION_FORMS[section.type] as React.ComponentType<FormProps<SectionType>>;
  return <Form settings={section.settings} onChange={onChange} errorAt={errorAt} />;
}

function sectionSummary(section: Section): string {
  const s = section.settings as Record<string, unknown>;
  const text = (s.heading ?? s.text ?? "") as string;
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

export function DesignEditor({ theme }: { theme: Theme & { layout: StoreLayout } }) {
  const router = useRouter();
  const { data: shopData } = useQuery(CURRENT_SHOP);
  const [updateTheme, updateState] = useMutation(UPDATE_THEME);
  const [deleteTheme, deleteState] = useMutation(DELETE_THEME, {
    refetchQueries: [{ query: THEMES }],
  });
  const [publishTheme, publishState] = useMutation(PUBLISH_THEME, {
    refetchQueries: [{ query: THEMES }],
  });
  const [createPreview] = useMutation(CREATE_THEME_PREVIEW);
  const [setPreviewDraft] = useMutation(SET_THEME_PREVIEW_DRAFT);
  const { data: productData } = useQuery(PRODUCTS, {
    variables: { filter: { status: "ACTIVE" } },
  });

  const [layout, setLayout] = useState<StoreLayout>(theme.layout);
  const [selected, setSelected] = useState<PageTarget>(HOME);
  const [name, setName] = useState(theme.name);
  const [status, setStatus] = useState(theme.status);
  const [dirty, setDirty] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(STYLE_KEY);
  const [preview, setPreview] = useState<{
    token: string;
    draftId: string;
  } | null>(null);
  const [previewState, setPreviewState] = useState<"current" | "updating" | "failed">("current");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draftSeq = useRef(0);

  const shop = shopData?.currentShop;
  const isLive = status === "PUBLISHED";
  const issues = useMemo(() => getLayoutIssues(layout), [layout]);
  const nameError = name.trim() ? undefined : "Give this design a name";

  // A deleted page falls back to Home.
  const target = slotsFor(layout, selected) ? selected : HOME;
  const slots = slotsFor(layout, target)!;
  const currentPage = target.kind === "page" ? findPage(layout, target.id) : null;
  const mainInfo = mainBlockInfo(target);
  const mainErrorPath = mainPath(target);
  const ownCollection = target.kind === "collection" ? target.handle : undefined;
  const firstProduct = productData?.products[0]?.handle;
  let previewPath = "/";
  if (currentPage && PAGE_HANDLE_PATTERN.test(currentPage.page.handle)) previewPath = `/pages/${currentPage.page.handle}`;
  if (target.kind === "template")
    previewPath = target.key === "product" && firstProduct ? `/products/${firstProduct}` : "/collections/all";
  if (target.kind === "collection") previewPath = `/collections/${target.handle}`;
  // The preview only moves to a page once the draft containing it has been sent, so a new or renamed page never 404s.
  const [shownPath, setShownPath] = useState("/");
  const previewUrl = shop && preview ? storefrontUrl(shop.subdomain, preview.token, shownPath) : null;
  const pathRef = useRef(previewPath);
  pathRef.current = previewPath;
  const sentLayout = useRef(theme.layout);
  useEffect(() => {
    if (layout === sentLayout.current) setShownPath(previewPath);
  }, [layout, previewPath]);

  const rows: Row[] = slots.lists.flatMap((list, l) => [
    ...(l > 0 ? [{ kind: "main" } as const] : []),
    ...list.map((section, index) => ({
      kind: "section" as const,
      section,
      list: l,
      index,
    })),
  ]);
  const panelKey = (id: string) => `${targetKey(target)}:${id}`;

  useEffect(() => {
    createPreview({
      variables: { input: { themeId: theme.id, withDraft: true } },
    })
      .then(({ data }) => {
        const { token, draftId } = data?.createThemePreview ?? {};
        if (token && draftId) setPreview({ token, draftId });
      })
      .catch((error: Error) => toast.error(error.message));
  }, [theme.id, createPreview]);

  useEffect(() => {
    if (!preview || !previewUrl || layout === sentLayout.current || issues.length) return;
    const seq = ++draftSeq.current;
    setPreviewState("updating");
    const timer = setTimeout(async () => {
      try {
        await setPreviewDraft({
          variables: {
            input: { themeId: theme.id, draftId: preview.draftId, layout },
          },
        });
        if (seq !== draftSeq.current) return;
        sentLayout.current = layout;
        if (pathRef.current !== shownPath) setShownPath(pathRef.current);
        else iframeRef.current?.contentWindow?.postMessage({ type: PREVIEW_REFRESH_MESSAGE }, new URL(previewUrl).origin);
        setPreviewState("current");
      } catch {
        if (seq === draftSeq.current) setPreviewState("failed");
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [layout, issues.length, preview, previewUrl, shownPath, theme.id, setPreviewDraft]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: StoreLayout) {
    setLayout(next);
    setDirty(true);
  }

  function errorsUnder(prefix: (string | number)[]): ErrorAt {
    return (path) => issues.find((issue) => samePath(issue.path, [...prefix, ...path]))?.message;
  }

  function sectionPath(list: number, index: number) {
    return [...slots.paths[list], index];
  }

  function sectionHasErrors(list: number, index: number) {
    const prefix = sectionPath(list, index);
    return issues.some((i) => samePath(i.path.slice(0, prefix.length), prefix));
  }

  function setLists(lists: Section[][]) {
    change(withSlots(layout, target, lists));
  }

  function updateSection(list: number, index: number, settings: Section["settings"]) {
    setLists(
      slots.lists.map((l, li) => (li === list ? l.map((s, i) => (i === index ? ({ ...s, settings } as Section) : s)) : l)),
    );
  }

  /** Swaps a row with its neighbour; on product/collection pages sections can cross the fixed content. */
  function moveRow(from: number, to: number) {
    const flat = rows.map((r) => (r.kind === "main" ? null : r.section));
    [flat[from], flat[to]] = [flat[to], flat[from]];
    const lists: Section[][] = [[]];
    for (const item of flat) {
      if (item === null) lists.push([]);
      else lists[lists.length - 1].push(item);
    }
    if (lists.some((l) => l.length > slots.maxPerList)) {
      toast.error(`Up to ${slots.maxPerList} sections fit there`);
      return;
    }
    setLists(lists);
  }

  function removeSection(list: number, index: number) {
    const section = slots.lists[list][index];
    if (!window.confirm(`Remove the “${SECTION_LIBRARY[section.type].label}” section?`)) return;
    setLists(slots.lists.map((l, li) => (li === list ? l.filter((_, i) => i !== index) : l)));
  }

  /** New sections go before the footer on Home, and at the end (below the fixed content) elsewhere. */
  function addSection(type: SectionType) {
    const section = createSection(
      type,
      slots.lists.flat().map((s) => s.id),
    );
    const last = slots.lists.length - 1;
    const lists = slots.lists.map((l) => [...l]);
    const footerIndex = target.kind === "home" ? lists[0].findIndex((s) => s.type === "footer") : -1;
    lists[last].splice(footerIndex === -1 ? lists[last].length : footerIndex, 0, section);
    setLists(lists);
    setOpenKey(panelKey(section.id));
  }

  function selectPage(next: PageTarget) {
    setSelected(next);
    setOpenKey(next.kind === "home" ? STYLE_KEY : next.kind === "page" ? PAGE_SETTINGS_KEY : `${targetKey(next)}:${MAIN_KEY}`);
  }

  async function save(): Promise<boolean> {
    if (issues.length || nameError) {
      toast.error(nameError ?? "Fix the highlighted fields before saving");
      return false;
    }
    try {
      const { data } = await updateTheme({
        variables: { input: { themeId: theme.id, name: name.trim(), layout } },
      });
      if (data) setStatus(data.updateTheme.status);
      setDirty(false);
      toast.success(isLive ? "Saved — your live store is updated" : "Saved");
      return true;
    } catch (error) {
      toast.error((error as Error).message);
      return false;
    }
  }

  async function publish() {
    if (dirty && !(await save())) return;
    try {
      await publishTheme({ variables: { input: { themeId: theme.id } } });
      setStatus("PUBLISHED");
      toast.success("Your store is live with this design!");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${theme.name}”? This can't be undone.`)) return;
    try {
      await deleteTheme({ variables: { input: { themeId: theme.id } } });
      setDirty(false);
      toast.success("Design deleted");
      router.push("/dashboard");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  let previewNote = "Preview";
  if (issues.length) previewNote = "Fix the highlighted fields to update the preview";
  else if (previewState === "updating") previewNote = "Updating preview…";
  else if (previewState === "failed") previewNote = "Couldn't update the preview. Keep editing to try again.";
  else if (dirty) previewNote = "Preview shows your unsaved changes. Save to keep them.";
  else if (target.kind === "template" && target.key === "product" && productData && !firstProduct) {
    previewNote = "Add an active product to preview the product page — showing your products instead.";
  }

  return (
    <div className="-mx-4 flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard?theme=${theme.id}`} aria-label="Back to store">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            value={name}
            maxLength={80}
            aria-label="Design name"
            aria-invalid={!!nameError}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="h-9 w-56"
          />
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              isLive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {isLive ? "Live" : "Draft"}
          </span>
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
          {issues.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-4 w-4" />
              {issues.length} {issues.length === 1 ? "field needs" : "fields need"} fixing
            </span>
          )}
          {!isLive && (
            <Button variant="ghost" size="sm" icon={<Trash2 />} loading={deleteState.loading} onClick={remove}>
              Delete
            </Button>
          )}
          {previewUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                Open preview <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            loading={updateState.loading}
            disabled={!dirty}
            onClick={save}
          >
            {isLive ? "Save & update live store" : "Save"}
          </Button>
          {!isLive && (
            <Button size="sm" icon={<Rocket />} loading={publishState.loading} onClick={publish}>
              {dirty ? "Save & publish" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
        <aside className="min-h-0 space-y-2 overflow-y-auto border-r bg-background p-3">
          <PagePicker
            layout={layout}
            target={target}
            issuePaths={issues.map((i) => i.path)}
            onSelect={selectPage}
            onChange={(next, select) => {
              change(next);
              if (select) selectPage(select);
            }}
          />

          {target.kind === "home" && (
            <EditorPanel
              title="Store style"
              subtitle="Name, colours and fonts — used on every page"
              icon={<Palette className="h-4 w-4 text-primary" />}
              open={openKey === STYLE_KEY}
              hasErrors={issues.some((i) => i.path[0] === "settings")}
              onToggle={() => setOpenKey(openKey === STYLE_KEY ? null : STYLE_KEY)}
            >
              <StyleForm
                settings={layout.settings}
                onChange={(settings) => change({ ...layout, settings })}
                errorAt={errorsUnder(["settings"])}
              />
            </EditorPanel>
          )}

          {currentPage && (
            <EditorPanel
              title="Page settings"
              subtitle={`Title, address /pages/${currentPage.page.handle}`}
              icon={<FileText className="h-4 w-4 text-primary" />}
              open={openKey === PAGE_SETTINGS_KEY}
              hasErrors={issues.some((i) => i.path[0] === "pages" && i.path[1] === currentPage.index && i.path[2] !== "sections")}
              onToggle={() => setOpenKey(openKey === PAGE_SETTINGS_KEY ? null : PAGE_SETTINGS_KEY)}
            >
              <PageSettingsForm
                layout={layout}
                page={currentPage.page}
                errorAt={errorsUnder(["pages", currentPage.index])}
                onChange={change}
                onDeleted={() => selectPage(HOME)}
              />
            </EditorPanel>
          )}

          <p className="px-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sections</p>
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              No sections yet — add one below.
            </p>
          )}
          <PageCategoryLabel.Provider value={mainInfo?.category ?? null}>
            {rows.map((row, r) =>
              row.kind === "main" && mainInfo && mainErrorPath ? (
                <EditorPanel
                  key={panelKey(MAIN_KEY)}
                  title={mainInfo.main}
                  subtitle="Always on this page — change its layout, or move it"
                  icon={<LayoutTemplate className="h-4 w-4 text-primary" />}
                  open={openKey === panelKey(MAIN_KEY)}
                  hasErrors={issues.some((i) => samePath(i.path.slice(0, mainErrorPath.length), mainErrorPath))}
                  onToggle={() => setOpenKey(openKey === panelKey(MAIN_KEY) ? null : panelKey(MAIN_KEY))}
                  actions={
                    <>
                      <IconButton label="Move up" disabled={r === 0} onClick={() => moveRow(r, r - 1)}>
                        <ArrowUp />
                      </IconButton>
                      <IconButton label="Move down" disabled={r === rows.length - 1} onClick={() => moveRow(r, r + 1)}>
                        <ArrowDown />
                      </IconButton>
                    </>
                  }
                >
                  {target.kind === "template" && target.key === "product" ? (
                    <ProductDetailsForm
                      settings={productDetailsOf(layout)}
                      onChange={(main) => change(withProductDetails(layout, main))}
                    />
                  ) : (
                    <CollectionProductsForm
                      settings={collectionProductsOf(layout, ownCollection)}
                      onChange={(main) => change(withCollectionProducts(layout, main, ownCollection))}
                    />
                  )}
                </EditorPanel>
              ) : row.kind === "main" ? null : (
                <EditorPanel
                  key={panelKey(row.section.id)}
                  title={SECTION_LIBRARY[row.section.type].label}
                  subtitle={sectionSummary(row.section)}
                  open={openKey === panelKey(row.section.id)}
                  hasErrors={sectionHasErrors(row.list, row.index)}
                  onToggle={() => setOpenKey(openKey === panelKey(row.section.id) ? null : panelKey(row.section.id))}
                  actions={
                    <>
                      <IconButton label="Move up" disabled={r === 0} onClick={() => moveRow(r, r - 1)}>
                        <ArrowUp />
                      </IconButton>
                      <IconButton label="Move down" disabled={r === rows.length - 1} onClick={() => moveRow(r, r + 1)}>
                        <ArrowDown />
                      </IconButton>
                      <IconButton
                        label="Remove section"
                        disabled={target.kind === "home" && layout.sections.length <= 1}
                        onClick={() => removeSection(row.list, row.index)}
                      >
                        <Trash2 />
                      </IconButton>
                    </>
                  }
                >
                  <SectionForm
                    section={row.section}
                    onChange={(settings) => updateSection(row.list, row.index, settings)}
                    errorAt={errorsUnder([...sectionPath(row.list, row.index), "settings"])}
                  />
                </EditorPanel>
              ),
            )}
          </PageCategoryLabel.Provider>

          <Select
            value=""
            aria-label="Add a section"
            disabled={slots.lists[slots.lists.length - 1].length >= slots.maxPerList}
            onChange={(e) => e.target.value && addSection(e.target.value as SectionType)}
            className="mt-2"
          >
            <option value="">+ Add a section…</option>
            {slots.addable.map((type) => (
              <option key={type} value={type}>
                {SECTION_LIBRARY[type].label} — {SECTION_LIBRARY[type].description}
              </option>
            ))}
          </Select>
        </aside>

        <section className="hidden min-h-0 flex-col bg-muted/40 lg:flex">
          <p
            className={cn(
              "border-b bg-card px-4 py-1.5 text-center text-xs text-muted-foreground",
              (issues.length > 0 || previewState === "failed") && "text-destructive",
            )}
          >
            {previewNote}
          </p>
          {previewUrl ? (
            <iframe ref={iframeRef} src={previewUrl} title="Store preview" className="min-h-0 flex-1 bg-white" />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function EditorPanel({
  title,
  subtitle,
  icon,
  open,
  hasErrors,
  onToggle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  open: boolean;
  hasErrors: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border bg-card", hasErrors && "border-destructive/60")}>
      <div className="flex items-center gap-1 pr-1.5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 p-3 text-left">
          {icon}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {title}
              {hasErrors && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
            </span>
            {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {actions}
      </div>
      {open && <div className="space-y-3 border-t p-3">{children}</div>}
    </div>
  );
}
