"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ProductDetailsSettings } from "@shopkit/themes";

const SHAPES: Record<ProductDetailsSettings["imageShape"], string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  landscape: "aspect-[4/3]",
};
const ZOOM = 2.5;
const trackClass = "flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const arrowClass = "absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-zinc-800 shadow md:block";

/** Scroll-snap strip of slides: swipe on phones, arrows elsewhere. */
function useSlides(count: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const go = (index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.min(Math.max(index, 0), count - 1);
    track.scrollTo({ left: next * track.clientWidth, behavior });
    setActive(next);
  };
  const onScroll = () => {
    const track = trackRef.current;
    if (track?.clientWidth) setActive(Math.round(track.scrollLeft / track.clientWidth));
  };
  return { trackRef, active, go, onScroll };
}

export function ProductGallery({
  images,
  title,
  shape = "square",
  thumbnails = "below",
}: {
  images: string[];
  title: string;
  shape?: ProductDetailsSettings["imageShape"];
  thumbnails?: ProductDetailsSettings["thumbnails"];
}) {
  const { trackRef, active, go, onScroll } = useSlides(images.length);
  const [viewing, setViewing] = useState<number | null>(null);

  if (images.length === 0) return <div className={`sk-placeholder ${SHAPES[shape]} w-full rounded-xl`} />;
  const several = images.length > 1;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div ref={trackRef} onScroll={onScroll} className={`${trackClass} rounded-xl`} data-gallery-track>
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setViewing(i)}
              aria-label={`View photo ${i + 1} full screen`}
              className={`${SHAPES[shape]} w-full shrink-0 snap-center cursor-zoom-in`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={i === 0 ? title : `${title}, photo ${i + 1}`} className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
        {several && (
          <>
            {active > 0 && (
              <button type="button" aria-label="Previous photo" onClick={() => go(active - 1)} className={`${arrowClass} left-3`}>
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {active < images.length - 1 && (
              <button type="button" aria-label="Next photo" onClick={() => go(active + 1)} className={`${arrowClass} right-3`}>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white md:hidden">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {thumbnails === "below" && several && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`overflow-hidden rounded-md border-2 ${i === active ? "border-[var(--sk-primary)]" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className={`${SHAPES[shape]} w-full object-cover`} />
            </button>
          ))}
        </div>
      )}
      {thumbnails === "hidden" && several && (
        <div className="flex justify-center gap-1.5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`h-2 w-2 rounded-full ${i === active ? "bg-[var(--sk-primary)]" : "bg-black/20"}`}
            />
          ))}
        </div>
      )}

      {viewing !== null && (
        <Lightbox
          images={images}
          title={title}
          start={viewing}
          onClose={(last) => {
            setViewing(null);
            go(last, "auto");
          }}
        />
      )}
    </div>
  );
}

/** Full-screen photos: swipe or arrow keys to move, tap to zoom, Esc to close. */
function Lightbox({
  images,
  title,
  start,
  onClose,
}: {
  images: string[];
  title: string;
  start: number;
  onClose: (lastIndex: number) => void;
}) {
  const { trackRef, active, go, onScroll } = useSlides(images.length);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useLayoutEffect(() => go(start, "auto"), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(activeRef.current);
      if (e.key === "ArrowLeft") go(activeRef.current - 1);
      if (e.key === "ArrowRight") go(activeRef.current + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setZoom(null), [active]);

  /** Zoom origin, as percentages of the photo, from a pointer position. */
  const originAt = (el: HTMLElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(Math.max(((clientX - r.left) / r.width) * 100, 0), 100),
      y: Math.min(Math.max(((clientY - r.top) / r.height) * 100, 0), 100),
    };
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span>
          {active + 1} / {images.length}
        </span>
        <button type="button" aria-label="Close" onClick={() => onClose(active)} className="rounded-full p-2 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className={`${trackClass} h-full ${zoom ? "overflow-x-hidden" : ""}`}
          data-lightbox-track
        >
          {images.map((src, i) => (
            <div key={src} onClick={() => onClose(active)} className="flex h-full w-full shrink-0 snap-center items-center justify-center overflow-hidden p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${title}, photo ${i + 1}`}
                draggable={false}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(zoom ? null : originAt(e.currentTarget, e.clientX, e.clientY));
                }}
                onMouseMove={(e) => zoom && i === active && setZoom(originAt(e.currentTarget, e.clientX, e.clientY))}
                onTouchMove={(e) => zoom && i === active && setZoom(originAt(e.currentTarget, e.touches[0].clientX, e.touches[0].clientY))}
                style={
                  zoom && i === active
                    ? { transform: `scale(${ZOOM})`, transformOrigin: `${zoom.x}% ${zoom.y}%`, touchAction: "none" }
                    : undefined
                }
                className={`max-h-full max-w-full select-none object-contain transition-transform duration-200 ${
                  zoom && i === active ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && !zoom && (
          <>
            {active > 0 && (
              <button type="button" aria-label="Previous photo" onClick={() => go(active - 1)} className={`${arrowClass} left-4`}>
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {active < images.length - 1 && (
              <button type="button" aria-label="Next photo" onClick={() => go(active + 1)} className={`${arrowClass} right-4`}>
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>
      <p className="px-4 pb-4 text-center text-xs text-white/60">{zoom ? "Move to look around · tap to zoom out" : "Tap the photo to zoom"}</p>
    </div>,
    document.body,
  );
}
