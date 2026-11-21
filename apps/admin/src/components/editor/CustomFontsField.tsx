"use client";

import { useRef, useState } from "react";
import { Type, X } from "lucide-react";
import { toast } from "sonner";
import { MAX_CUSTOM_FONTS, type CustomFont, type ThemeSettings } from "@shopkit/themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCEPTED_FONT_TYPES, MAX_FONT_MB, uploadFont } from "@/lib/upload";
import type { ErrorAt } from "./fields";

const FALLBACK_FONT = "Inter";

/** A valid, unused font name from an uploaded file name, e.g. "Brand_Sans-Bold.woff2" → "Brand Sans-Bold". */
function nameFromFile(fileName: string, taken: string[]): string {
  const base =
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[_.]+/g, " ")
      .replace(/[^A-Za-z0-9 -]/g, "")
      .replace(/^[^A-Za-z0-9]+/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 34) || "My font";
  const lower = taken.map((t) => t.toLowerCase());
  let name = base;
  for (let n = 2; lower.includes(name.toLowerCase()); n++) name = `${base} ${n}`;
  return name;
}

/** Lets the admin page render each uploaded font in its own typeface. */
function FontFaces({ fonts }: { fonts: CustomFont[] }) {
  const css = fonts
    .map((f, i) => `@font-face{font-family:"sk-admin-font-${i}";src:url("${f.url}");font-display:swap;}`)
    .join("");
  return css ? <style>{css}</style> : null;
}

export function CustomFontsField({
  settings,
  onChange,
  errorAt,
}: {
  settings: ThemeSettings;
  onChange: (s: ThemeSettings) => void;
  errorAt: ErrorAt;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fonts = settings.customFonts ?? [];

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFont(file);
      const name = nameFromFile(file.name, fonts.map((f) => f.name));
      onChange({ ...settings, customFonts: [...fonts, { name, url }] });
      toast.success(`“${name}” added — pick it as the heading or body font`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function rename(index: number, name: string) {
    const old = fonts[index].name;
    const swap = (font: string) => (font === old ? name : font);
    onChange({
      ...settings,
      customFonts: fonts.map((f, i) => (i === index ? { ...f, name } : f)),
      fonts: { heading: swap(settings.fonts.heading), body: swap(settings.fonts.body) },
    });
  }

  function remove(index: number) {
    const old = fonts[index].name;
    const swap = (font: string) => (font === old ? FALLBACK_FONT : font);
    onChange({
      ...settings,
      customFonts: fonts.filter((_, i) => i !== index),
      fonts: { heading: swap(settings.fonts.heading), body: swap(settings.fonts.body) },
    });
  }

  return (
    <div className="space-y-2">
      <FontFaces fonts={fonts} />
      <Label className="text-xs">Your fonts</Label>
      {fonts.map((font, i) => {
        const error = errorAt(["customFonts", i, "name"]) ?? errorAt(["customFonts", i, "url"]);
        return (
          <div key={font.url} className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-10 shrink-0 text-center text-lg leading-none"
                style={{ fontFamily: `"sk-admin-font-${i}", sans-serif` }}
                aria-hidden
              >
                Aa
              </span>
              <Input
                value={font.name}
                maxLength={40}
                aria-label="Font name"
                aria-invalid={!!error}
                onChange={(e) => rename(i, e.target.value)}
                className="h-9"
              />
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${font.name}`} onClick={() => remove(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      })}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FONT_TYPES}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {fonts.length < MAX_CUSTOM_FONTS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Type />}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Upload a font
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        WOFF2, WOFF, TTF or OTF, up to {MAX_FONT_MB} MB, {MAX_CUSTOM_FONTS} fonts max. Only upload fonts you have a licence
        to use on the web.
      </p>
    </div>
  );
}
