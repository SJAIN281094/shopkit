"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  MAX_OPTION_VALUES,
  MAX_PRODUCT_OPTIONS,
  MAX_VARIANTS,
  variantCombinations,
  variantKey,
  variantTitle,
} from "@shopkit/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductOption } from "@/lib/graphql";

/** Form values for one variant, as typed (rupees, not paise). */
export interface VariantRow {
  price: string;
  compareAt: string;
  stock: string;
  sku: string;
}

export const EMPTY_ROW: VariantRow = { price: "", compareAt: "", stock: "", sku: "" };

export interface VariantsValue {
  options: ProductOption[];
  /** Keyed by `variantKey(optionValues)` so edits survive adding or reordering values. */
  rows: Record<string, VariantRow>;
}

export function variantList(options: ProductOption[]): string[][] {
  const named = options.filter((o) => o.name.trim() && o.values.length);
  return named.length ? variantCombinations(named) : [];
}

const OPTION_SUGGESTIONS = ["Size", "Colour", "Material"];

function OptionEditor({
  option,
  onChange,
  onRemove,
}: {
  option: ProductOption;
  onChange: (option: ProductOption) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState("");

  function addValues(text: string) {
    const incoming = text
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const seen = new Set(option.values.map((v) => v.toLowerCase()));
    const next = [...option.values];
    for (const value of incoming) {
      if (seen.has(value.toLowerCase()) || next.length >= MAX_OPTION_VALUES) continue;
      seen.add(value.toLowerCase());
      next.push(value.slice(0, 40));
    }
    onChange({ ...option, values: next });
    setDraft("");
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Option name"
          className="max-w-48"
          value={option.name}
          maxLength={30}
          placeholder="e.g. Size"
          onChange={(e) => onChange({ ...option, name: e.target.value })}
        />
        <Button type="button" variant="ghost" size="icon" aria-label="Remove option" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {option.values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium">
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ ...option, values: option.values.filter((v) => v !== value) })}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          aria-label={`Add ${option.name || "option"} value`}
          className="h-8 w-56"
          value={draft}
          placeholder={option.values.length ? "Add another" : "Type values, e.g. S, M, L"}
          onChange={(e) => {
            if (e.target.value.endsWith(",")) addValues(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValues(draft);
            }
          }}
          onBlur={() => draft.trim() && addValues(draft)}
        />
      </div>
    </div>
  );
}

export function VariantsEditor({
  value,
  onChange,
  basePrice,
}: {
  value: VariantsValue;
  onChange: (value: VariantsValue) => void;
  /** Pre-fills the price of newly created variants. */
  basePrice: string;
}) {
  const [bulkPrice, setBulkPrice] = useState("");
  const combos = variantList(value.options);
  const tooMany = combos.length > MAX_VARIANTS;

  function setOptions(options: ProductOption[]) {
    const rows = { ...value.rows };
    for (const combo of variantList(options)) {
      const key = variantKey(combo);
      rows[key] ??= { ...EMPTY_ROW, price: basePrice };
    }
    onChange({ options, rows });
  }

  function setRow(key: string, patch: Partial<VariantRow>) {
    onChange({ ...value, rows: { ...value.rows, [key]: { ...(value.rows[key] ?? EMPTY_ROW), ...patch } } });
  }

  function applyPriceToAll() {
    if (!bulkPrice.trim()) return;
    const rows = { ...value.rows };
    for (const combo of combos) rows[variantKey(combo)] = { ...(rows[variantKey(combo)] ?? EMPTY_ROW), price: bulkPrice.trim() };
    onChange({ ...value, rows });
  }

  const unusedSuggestion = OPTION_SUGGESTIONS.find(
    (s) => !value.options.some((o) => o.name.trim().toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {value.options.map((option, i) => (
        <OptionEditor
          key={i}
          option={option}
          onChange={(next) => setOptions(value.options.map((o, j) => (j === i ? next : o)))}
          onRemove={() => setOptions(value.options.filter((_, j) => j !== i))}
        />
      ))}
      {value.options.length < MAX_PRODUCT_OPTIONS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Plus />}
          onClick={() => setOptions([...value.options, { name: value.options.length ? "" : unusedSuggestion ?? "", values: [] }])}
        >
          {value.options.length ? "Add another option" : "Add options like size or colour"}
        </Button>
      )}

      {tooMany && (
        <p className="text-sm text-destructive">
          That makes {combos.length} variants; the limit is {MAX_VARIANTS}. Remove some values.
        </p>
      )}

      {combos.length > 0 && !tooMany && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Set every price (₹)</span>
              <Input className="h-8 w-28" inputMode="decimal" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={applyPriceToAll}>
              Apply
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Variant</th>
                  <th className="px-2 py-2 font-medium">Price (₹)</th>
                  <th className="px-2 py-2 font-medium">Original (₹)</th>
                  <th className="px-2 py-2 font-medium">Stock</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {combos.map((combo) => {
                  const key = variantKey(combo);
                  const row = value.rows[key] ?? EMPTY_ROW;
                  return (
                    <tr key={key}>
                      <td className="whitespace-nowrap px-3 py-1.5 font-medium">{variantTitle(combo)}</td>
                      <td className="px-2 py-1.5">
                        <Input aria-label={`${variantTitle(combo)} price`} className="h-8 w-24" inputMode="decimal" value={row.price} onChange={(e) => setRow(key, { price: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input aria-label={`${variantTitle(combo)} original price`} className="h-8 w-24" inputMode="decimal" value={row.compareAt} onChange={(e) => setRow(key, { compareAt: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input aria-label={`${variantTitle(combo)} stock`} className="h-8 w-20" inputMode="numeric" placeholder="∞" value={row.stock} onChange={(e) => setRow(key, { stock: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input aria-label={`${variantTitle(combo)} SKU`} className="h-8 w-28" maxLength={64} value={row.sku} onChange={(e) => setRow(key, { sku: e.target.value })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Leave stock empty if you don&apos;t track it. Set stock to 0 to show a variant as sold out.</p>
        </div>
      )}
    </div>
  );
}
