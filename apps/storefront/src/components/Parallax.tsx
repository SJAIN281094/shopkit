"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** How far each layer lags behind the page as it scrolls: 0 scrolls with the page, 1 stays still. */
const SPEEDS = { image: 0.45, glow: 0.3, ring: 0.6, dots: 0.15 };

export function Parallax({
  id,
  imageUrl,
  className = "",
  children,
}: {
  id?: string;
  imageUrl?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
      // Re-queried each time: preview refreshes swap the layers (e.g. a photo replacing the shapes) without remounting.
      for (const layer of section.querySelectorAll<HTMLElement>("[data-speed]")) {
        const speed = Number(layer.dataset.speed);
        if (layer.classList.contains("sk-parallax-layer")) {
          // Overhang that keeps a full-bleed layer covering the section at its furthest shift.
          const overhang = `${Math.ceil((speed * (window.innerHeight + rect.height)) / 2) + 2}px`;
          if (layer.style.top !== `-${overhang}`) layer.style.inset = `-${overhang} 0`;
        }
        layer.style.transform = `translate3d(0, ${(-offset * speed).toFixed(1)}px, 0)`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    const observer = new MutationObserver(schedule);
    observer.observe(section, { childList: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={ref} id={id} className={`sk-parallax relative ${className}`}>
      {imageUrl ? (
        <div
          aria-hidden
          data-speed={SPEEDS.image}
          className="sk-parallax-layer"
          style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
        />
      ) : (
        <>
          <div aria-hidden className="sk-parallax-fallback absolute inset-0" />
          <div aria-hidden data-speed={SPEEDS.dots} className="sk-parallax-layer sk-parallax-dots" />
          <div aria-hidden data-speed={SPEEDS.glow} className="sk-parallax-glow left-[8%] top-[12%] h-72 w-72" />
          <div aria-hidden data-speed={SPEEDS.glow} className="sk-parallax-glow bottom-[5%] right-[10%] h-96 w-96 opacity-70" />
          <div aria-hidden data-speed={SPEEDS.ring} className="sk-parallax-ring right-[18%] top-[18%] h-28 w-28" />
          <div aria-hidden data-speed={SPEEDS.ring} className="sk-parallax-ring bottom-[20%] left-[14%] h-16 w-16" />
        </>
      )}
      <div aria-hidden className={`absolute inset-0 ${imageUrl ? "bg-black/45" : "bg-black/10"}`} />
      <div className="relative">{children}</div>
    </section>
  );
}
