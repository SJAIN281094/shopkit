import { storeHref } from "@/lib/store-context";
import type { SectionProps } from "./types";

export function ImageWithText({ section, ctx }: SectionProps<"image-with-text">) {
  const { heading, body, imageUrl, imagePosition, buttonLabel, buttonHref } = section.settings;

  return (
    <section id={section.id} className="sk-soft-bg">
      <div
        className={`mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 md:flex-row ${
          imagePosition === "right" ? "md:flex-row-reverse" : ""
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="aspect-[4/3] w-full rounded-xl object-cover md:w-1/2" />
        ) : (
          <div className="sk-placeholder aspect-[4/3] w-full rounded-xl md:w-1/2" />
        )}
        <div className="w-full space-y-4 md:w-1/2">
          <h2 className="sk-heading text-3xl font-semibold">{heading}</h2>
          {body && <p className="sk-muted whitespace-pre-line leading-relaxed">{body}</p>}
          {buttonLabel && (
            <a href={storeHref(buttonHref || "#", ctx)} className="sk-button">
              {buttonLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
