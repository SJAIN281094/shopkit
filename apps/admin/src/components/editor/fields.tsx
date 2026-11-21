"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ErrorAt = (path: (string | number)[]) => string | undefined;

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-xs text-destructive">{error}</p> : null;
}

export function TextField({
  label,
  value,
  onChange,
  error,
  max,
  rows,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  max?: number;
  /** Renders a textarea when set. */
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {rows ? (
        <Textarea
          rows={rows}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          value={value}
          maxLength={max}
          placeholder={placeholder}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError error={error} />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-md border bg-background p-1"
        />
        <Input value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
      <FieldError error={error} />
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  error,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
      <FieldError error={error} />
    </div>
  );
}

/** A list of repeatable items (menu links, features, testimonials) with add, remove and reorder. */
export function ItemList<T>({
  label,
  items,
  onChange,
  createItem,
  min = 0,
  max,
  itemLabel,
  renderItem,
  error,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  min?: number;
  max: number;
  itemLabel: (item: T, index: number) => string;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  error?: string;
}) {
  function move(from: number, to: number) {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-md border bg-muted/30 p-2.5">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-medium text-muted-foreground">{itemLabel(item, i)}</span>
            <div className="flex shrink-0">
              <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp />
              </IconButton>
              <IconButton label="Move down" disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown />
              </IconButton>
              <IconButton label="Remove" disabled={items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <X />
              </IconButton>
            </div>
          </div>
          {renderItem(item, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))), i)}
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" icon={<Plus />} onClick={() => onChange([...items, createItem()])}>
          Add
        </Button>
      )}
      <FieldError error={error} />
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [&_svg]:h-3.5 [&_svg]:w-3.5"
    >
      {children}
    </button>
  );
}
