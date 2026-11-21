"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

/** Upload-on-pick button. Calls `onUploaded` with the stored image URL. */
export function UploadButton({
  onUploaded,
  label = "Upload image",
  multiple = false,
  disabled,
  size = "sm",
}: {
  onUploaded: (url: string) => void;
  label?: string;
  multiple?: boolean;
  disabled?: boolean;
  size?: "sm" | "default";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        onUploaded(await uploadImage(file));
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size={size}
        loading={uploading}
        disabled={disabled}
        icon={<ImagePlus />}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

/** A single optional image, e.g. a banner background. */
export function SingleImageField({
  value,
  onChange,
  contain = false,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Show the whole image (e.g. a logo) instead of cropping it. */
  contain?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className={contain ? "h-16 w-24 rounded-md border bg-white object-contain p-1" : "h-16 w-24 rounded-md border object-cover"}
        />
      ) : (
        <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <UploadButton label={value ? "Replace" : "Upload"} onUploaded={onChange} />
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

/** Ordered product photos; the first one is the cover. */
export function ImageListField({
  value,
  onChange,
  max,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max: number;
}) {
  // Several files upload one after another; keep the newest list so each upload appends to it.
  const latest = useRef(value);
  latest.current = value;

  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  function append(url: string) {
    const next = [...latest.current, url].slice(0, max);
    latest.current = next;
    onChange(next);
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= value.length) return;
    const next = [...value];
    const [url] = next.splice(from, 1);
    next.splice(to, 0, url);
    onChange(next);
  }

  function endDrag() {
    dragFrom.current = null;
    setDragging(null);
    setOver(null);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url, i) => (
          <div
            key={url}
            draggable={value.length > 1}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", url);
              dragFrom.current = i;
              setDragging(i);
            }}
            onDragOver={(e) => {
              if (dragFrom.current === null) return;
              e.preventDefault();
              setOver(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current !== null) move(dragFrom.current, i);
              endDrag();
            }}
            onDragEnd={endDrag}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg border",
              value.length > 1 && "cursor-grab active:cursor-grabbing",
              dragging === i && "opacity-40",
              over === i && dragging !== i && "ring-2 ring-primary",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="pointer-events-none h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Cover
              </span>
            )}
            <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {i > 0 && (
                <button
                  type="button"
                  aria-label="Make cover photo"
                  className="rounded bg-white/90 p-1 text-zinc-800 shadow"
                  onClick={() => onChange([url, ...value.filter((u) => u !== url)])}
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                aria-label="Remove photo"
                className="rounded bg-white/90 p-1 text-zinc-800 shadow"
                onClick={() => onChange(value.filter((u) => u !== url))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {value.length > 1 && (
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  aria-label="Move photo earlier"
                  disabled={i === 0}
                  className="rounded bg-white/90 p-1 text-zinc-800 shadow disabled:invisible"
                  onClick={() => move(i, i - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move photo later"
                  disabled={i === value.length - 1}
                  className="rounded bg-white/90 p-1 text-zinc-800 shadow disabled:invisible"
                  onClick={() => move(i, i + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {value.length < max && (
          <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-2 text-center">
            <UploadButton label={value.length ? "Add" : "Add photos"} multiple onUploaded={append} />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Up to {max} photos, JPG/PNG/WebP, 5 MB each. Drag to change the order — the first is the cover.
      </p>
    </div>
  );
}
