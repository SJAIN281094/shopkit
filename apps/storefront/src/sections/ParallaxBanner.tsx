import { Parallax } from "@/components/Parallax";
import { storeHref } from "@/lib/store-context";
import type { SectionProps } from "./types";

export function ParallaxBanner({ section, ctx }: SectionProps<"parallax-banner">) {
  const { heading, body, buttonLabel, buttonHref, imageUrl, height, alignment } = section.settings;
  const centered = alignment === "center";

  return (
    <Parallax id={section.id} imageUrl={imageUrl}>
      <div
        className={`mx-auto flex max-w-6xl flex-col justify-center gap-4 px-4 text-white ${
          height === "tall" ? "min-h-[75vh] py-24" : "min-h-[50vh] py-20"
        } ${centered ? "items-center text-center" : "items-start"}`}
      >
        <h2 className="sk-heading max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">{heading}</h2>
        {body && <p className="max-w-2xl text-lg text-white/85">{body}</p>}
        {buttonLabel && (
          <a href={storeHref(buttonHref || "#", ctx)} className="sk-button sk-button-light mt-2">
            {buttonLabel}
          </a>
        )}
      </div>
    </Parallax>
  );
}
