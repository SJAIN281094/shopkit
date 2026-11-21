import { Parallax } from "@/components/Parallax";
import { storeHref } from "@/lib/store-context";
import type { SectionProps } from "./types";

const HEIGHTS = {
  medium: "py-24 sm:py-32",
  tall: "min-h-[70vh] py-20",
  full: "min-h-[calc(100vh-4.5rem)] py-20",
};

function bgImage(url: string) {
  return { backgroundImage: `url(${JSON.stringify(url)})` };
}

export function Hero({ section, ctx }: SectionProps<"hero">) {
  const { heading, subheading, buttonLabel, buttonHref, imageUrl, alignment, variant = "banner", height = "medium" } =
    section.settings;
  const centered = alignment === "center";
  const parallax = variant === "parallax";
  const button = buttonLabel ? (
    <a href={storeHref(buttonHref || "#", ctx)} className={`sk-button mt-2 ${parallax ? "sk-button-light" : ""}`}>
      {buttonLabel}
    </a>
  ) : null;

  if (variant === "split") {
    return (
      <section className="sk-soft-bg">
        <div className={`mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2 ${HEIGHTS[height]}`}>
          <div className="flex flex-col items-start gap-5">
            <h1 className="sk-heading text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">{heading}</h1>
            {subheading && <p className="sk-muted max-w-xl text-lg">{subheading}</p>}
            {button}
          </div>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="aspect-[4/5] w-full rounded-2xl object-cover shadow-xl md:aspect-square" />
          ) : (
            <div className="sk-placeholder relative aspect-[4/5] w-full overflow-hidden rounded-2xl md:aspect-square">
              <div className="sk-accent-bg absolute -bottom-10 -right-10 h-48 w-48 rounded-full opacity-60" />
              <div className="absolute left-8 top-8 h-24 w-24 rounded-full border-8 border-white/50" />
            </div>
          )}
        </div>
      </section>
    );
  }

  if (variant === "minimal") {
    return (
      <section className="sk-border border-b">
        <div
          className={`mx-auto flex max-w-6xl flex-col justify-center gap-5 px-4 ${
            height === "medium" ? "py-16 sm:py-20" : HEIGHTS[height]
          } ${centered ? "items-center text-center" : "items-start"}`}
        >
          <h1 className="sk-heading max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            {heading}
          </h1>
          {subheading && <p className="sk-muted max-w-2xl text-lg">{subheading}</p>}
          {button}
        </div>
      </section>
    );
  }

  const dark = parallax || !!imageUrl;
  const content = (
    <div
      className={`relative mx-auto flex max-w-6xl flex-col justify-center gap-5 px-4 ${HEIGHTS[height]} ${
        centered ? "items-center text-center" : "items-start text-left"
      } ${dark ? "text-white" : ""}`}
    >
      <h1 className="sk-heading max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">{heading}</h1>
      {subheading && <p className={`max-w-2xl text-lg ${dark ? "text-white/85" : "sk-muted"}`}>{subheading}</p>}
      {button}
    </div>
  );

  if (parallax) {
    return <Parallax imageUrl={imageUrl}>{content}</Parallax>;
  }

  return (
    <section
      className={`relative bg-cover bg-center ${imageUrl ? "" : "sk-placeholder"}`}
      style={imageUrl ? bgImage(imageUrl) : undefined}
    >
      {dark && <div className="absolute inset-0 bg-black/45" />}
      {content}
    </section>
  );
}
