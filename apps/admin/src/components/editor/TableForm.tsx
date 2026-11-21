"use client";

import { Plus, RefreshCw, X } from "lucide-react";
import {
  DEFAULT_PRODUCT_TABLE,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_ROWS,
  PRODUCT_TABLE_FIELDS,
  PRODUCT_TABLE_FIELD_LABELS,
  PRODUCT_TABLE_SORTS,
  PRODUCT_TABLE_SORT_LABELS,
  type ProductTable,
  type SectionOf,
} from "@shopkit/themes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckboxField, IconButton, NumberField, SelectField, TextField, type ErrorAt } from "./fields";
import { ProductSourceField } from "./ProductSourceField";

type Settings = SectionOf<"table">["settings"];

const cellClass =
  "h-8 w-full min-w-[84px] rounded border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary aria-[invalid=true]:border-destructive";

/** Paste from a spreadsheet: one row per line, cells separated by tabs (or commas). */
function parsePasted(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const sep = lines.some((l) => l.includes("\t")) ? "\t" : ",";
  return lines.map((l) => l.split(sep).map((c) => c.trim()));
}

export function TableForm({
  settings,
  onChange,
  errorAt,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  errorAt: ErrorAt;
}) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const source = settings.source ?? "manual";

  return (
    <>
      <TextField label="Heading" value={settings.heading} max={100} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <TextField label="Intro (optional)" rows={2} value={settings.intro} max={300} onChange={(intro) => set({ intro })} error={errorAt(["intro"])} />

      <SelectField
        label="Rows come from"
        value={source}
        onChange={(next) => set({ source: next, products: settings.products ?? DEFAULT_PRODUCT_TABLE })}
        options={[
          { value: "manual", label: "I'll type them in" },
          { value: "products", label: "My products (updates automatically)" },
        ]}
      />

      {source === "products" ? (
        <ProductTableFields
          table={settings.products ?? DEFAULT_PRODUCT_TABLE}
          onChange={(products) => set({ products })}
          errorAt={(path) => errorAt(["products", ...path])}
        />
      ) : (
        <ManualTable settings={settings} set={set} errorAt={errorAt} />
      )}

      <SelectField
        label="Style"
        value={settings.style}
        onChange={(style) => set({ style })}
        options={[
          { value: "striped", label: "Striped, coloured heading" },
          { value: "bordered", label: "Bordered grid" },
          { value: "minimal", label: "Minimal lines" },
        ]}
      />
      <TextField label="Note below (optional)" value={settings.note} max={200} onChange={(note) => set({ note })} error={errorAt(["note"])} />
    </>
  );
}

function ProductTableFields({
  table,
  onChange,
  errorAt,
}: {
  table: ProductTable;
  onChange: (t: ProductTable) => void;
  errorAt: ErrorAt;
}) {
  const set = (patch: Partial<ProductTable>) => onChange({ ...table, ...patch });
  const toggleField = (field: (typeof PRODUCT_TABLE_FIELDS)[number], on: boolean) =>
    set({ fields: PRODUCT_TABLE_FIELDS.filter((f) => (f === field ? on : table.fields.includes(f))) });
  const fieldsError = errorAt(["fields"]);

  return (
    <>
      <p className="flex gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Prices, stock and new products show up on your site by themselves — no need to edit this table again.
      </p>
      <ProductSourceField value={table} onChange={set} />
      <div className="space-y-1.5">
        <Label className="text-xs">Columns</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRODUCT_TABLE_FIELDS.map((field) => (
            <CheckboxField
              key={field}
              label={PRODUCT_TABLE_FIELD_LABELS[field]}
              checked={table.fields.includes(field)}
              onChange={(on) => toggleField(field, on)}
            />
          ))}
        </div>
        {fieldsError && <p className="text-xs text-destructive">{fieldsError}</p>}
        {table.fields.length > MAX_TABLE_COLUMNS && (
          <p className="text-xs text-destructive">Pick up to {MAX_TABLE_COLUMNS} so the table fits on phones.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Order"
          value={table.sort}
          onChange={(sort) => set({ sort })}
          options={PRODUCT_TABLE_SORTS.map((value) => ({ value, label: PRODUCT_TABLE_SORT_LABELS[value] }))}
        />
        <NumberField label="How many rows" value={table.limit} min={1} max={MAX_TABLE_ROWS} onChange={(limit) => set({ limit })} error={errorAt(["limit"])} />
      </div>
      {table.fields.includes("product") && (
        <CheckboxField label="Show product photos" checked={table.showImages} onChange={(showImages) => set({ showImages })} />
      )}
      <CheckboxField label="Hide sold-out products" checked={table.hideSoldOut} onChange={(hideSoldOut) => set({ hideSoldOut })} />
    </>
  );
}

function ManualTable({
  settings,
  set,
  errorAt,
}: {
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
  errorAt: ErrorAt;
}) {
  const { columns, rows } = settings;

  function setColumn(index: number, value: string) {
    set({ columns: columns.map((c, i) => (i === index ? value : c)) });
  }
  function addColumn() {
    set({ columns: [...columns, `Column ${columns.length + 1}`], rows: rows.map((r) => [...r, ""]) });
  }
  function removeColumn(index: number) {
    set({ columns: columns.filter((_, i) => i !== index), rows: rows.map((r) => r.filter((_, i) => i !== index)) });
  }
  function setCell(row: number, col: number, value: string) {
    set({ rows: rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? value : c)) : r)) });
  }
  function addRow() {
    set({ rows: [...rows, columns.map(() => "")] });
  }
  function removeRow(index: number) {
    set({ rows: rows.filter((_, i) => i !== index) });
  }
  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\n")) return;
    e.preventDefault();
    const parsed = parsePasted(text);
    if (parsed.length < 2) return;
    const width = Math.min(Math.max(...parsed.map((r) => r.length)), MAX_TABLE_COLUMNS);
    const pad = (r: string[]) => Array.from({ length: width }, (_, i) => (r[i] ?? "").slice(0, 120));
    set({
      columns: pad(parsed[0]).map((c, i) => (c || `Column ${i + 1}`).slice(0, 40)),
      rows: parsed.slice(1, MAX_TABLE_ROWS + 1).map(pad),
    });
  }

  const tableError =
    errorAt(["columns"]) ??
    columns.map((_, i) => errorAt(["columns", i])).find(Boolean) ??
    rows.map((_, i) => errorAt(["rows", i])).find(Boolean) ??
    errorAt(["rows"]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Table</Label>
      <div className="overflow-x-auto rounded-md border p-2" onPaste={handlePaste}>
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              {columns.map((column, c) => (
                <th key={c} className="align-top">
                  <div className="flex items-center gap-0.5">
                    <input
                      value={column}
                      maxLength={40}
                      aria-label={`Column ${c + 1} heading`}
                      aria-invalid={!!errorAt(["columns", c])}
                      onChange={(e) => setColumn(c, e.target.value)}
                      className={`${cellClass} font-semibold`}
                    />
                    <IconButton label="Remove column" disabled={columns.length <= 1} onClick={() => removeColumn(c)}>
                      <X />
                    </IconButton>
                  </div>
                </th>
              ))}
              <th className="align-top">
                {columns.length < MAX_TABLE_COLUMNS && (
                  <IconButton label="Add column" onClick={addColumn}>
                    <Plus />
                  </IconButton>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {columns.map((_, c) => (
                  <td key={c}>
                    <input
                      value={row[c] ?? ""}
                      maxLength={120}
                      aria-label={`Row ${r + 1}, ${columns[c] || `column ${c + 1}`}`}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className={cellClass}
                    />
                  </td>
                ))}
                <td>
                  <IconButton label="Remove row" disabled={rows.length <= 1} onClick={() => removeRow(r)}>
                    <X />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tableError && <p className="text-xs text-destructive">{tableError}</p>}
      <div className="flex items-center justify-between gap-2">
        {rows.length < MAX_TABLE_ROWS ? (
          <Button type="button" variant="outline" size="sm" icon={<Plus />} onClick={addRow}>
            Add row
          </Button>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted-foreground">
          {rows.length}/{MAX_TABLE_ROWS} rows · {columns.length}/{MAX_TABLE_COLUMNS} columns
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: copy cells from Excel or Google Sheets and paste into the table — the first row becomes the headings.
      </p>
    </div>
  );
}
