import type { CSSProperties } from "react";

/** A tiny sketch of a template's page structure, drawn in its colours. */
export function LayoutWireframe({
  layout,
  primary,
  accent,
  background,
}: {
  layout: string;
  primary: string;
  accent: string;
  background: string;
}) {
  const ink = { backgroundColor: primary } as CSSProperties;
  const soft = { backgroundColor: `color-mix(in srgb, ${primary} 14%, ${background})` } as CSSProperties;
  const tint = { backgroundColor: `color-mix(in srgb, ${accent} 45%, ${background})` } as CSSProperties;
  const line = (w: string, style: CSSProperties = soft) => <span className="block h-1 rounded-full" style={{ ...style, width: w }} />;
  const products = (n: number, h = "h-5") => (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`${h} rounded-sm`} style={tint} />
      ))}
    </div>
  );
  const header = (centered = false, bold = false) => (
    <div
      className={`flex items-center px-1.5 py-1 ${centered ? "justify-center" : "justify-between"}`}
      style={bold ? ink : undefined}
    >
      {line("22%", bold ? { backgroundColor: "#fff" } : ink)}
      {!centered && line("30%", bold ? { backgroundColor: "rgb(255 255 255 / 0.6)" } : soft)}
    </div>
  );

  let body: React.ReactNode;
  switch (layout) {
    case "editorial":
      body = (
        <>
          {header(true)}
          <div className="grid grid-cols-2 items-center gap-1.5 px-1.5 py-1.5" style={soft}>
            <div className="space-y-1">
              {line("90%", ink)}
              {line("60%", ink)}
              {line("40%")}
            </div>
            <span className="h-9 rounded-sm" style={tint} />
          </div>
          <div className="px-1.5 py-1.5">{products(3)}</div>
        </>
      );
      break;
    case "parallax":
      body = (
        <>
          {header()}
          <div
            className="flex h-12 flex-col items-center justify-center gap-1"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.35) 1px, transparent 0), linear-gradient(135deg, ${primary}, ${accent})`,
              backgroundSize: "6px 6px, 100% 100%",
            }}
          >
            {line("50%", { backgroundColor: "#fff" })}
            {line("30%", { backgroundColor: "rgb(255 255 255 / 0.7)" })}
          </div>
          <div className="px-1.5 py-1.5">{products(3, "h-4")}</div>
          <div className="h-4" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }} />
        </>
      );
      break;
    case "catalog":
      body = (
        <>
          {header(false, true)}
          <div className="space-y-1 px-1.5 py-1.5">
            {line("45%", ink)}
            {products(4, "h-4")}
          </div>
          <div className="mx-1.5 mb-1.5 grid grid-cols-3 gap-px rounded-sm p-px" style={soft}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="h-1.5" style={{ backgroundColor: background }} />
            ))}
          </div>
        </>
      );
      break;
    case "playful":
      body = (
        <>
          {header()}
          <div className="grid grid-cols-2 items-center gap-1.5 px-1.5 py-1.5" style={soft}>
            <div className="space-y-1">
              {line("80%", ink)}
              {line("50%")}
              <span className="block h-1.5 w-6 rounded-full" style={ink} />
            </div>
            <span className="h-8 rounded-md" style={tint} />
          </div>
          <div className="grid grid-cols-3 gap-1 px-1.5 py-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="flex h-5 items-start rounded-md bg-white p-0.5 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-sm" style={ink} />
              </span>
            ))}
          </div>
          <div className="mx-1.5 space-y-px">
            <span className="block h-1.5 rounded-t-sm" style={ink} />
            <span className="block h-1.5" style={soft} />
          </div>
        </>
      );
      break;
    case "minimal":
      body = (
        <>
          {header(true)}
          <div className="flex flex-col items-center gap-1 py-2.5">
            {line("60%", ink)}
            {line("35%")}
          </div>
          <div className="px-3 pb-1.5">{products(2, "h-9")}</div>
        </>
      );
      break;
    default:
      body = (
        <>
          {header()}
          <div className="flex h-9 flex-col items-center justify-center gap-1" style={tint}>
            {line("45%", ink)}
            {line("30%", { backgroundColor: "rgb(255 255 255 / 0.7)" })}
          </div>
          <div className="flex justify-around px-1.5 py-1">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full" style={ink} />
            ))}
          </div>
          <div className="px-1.5 pb-1.5">{products(4, "h-4")}</div>
        </>
      );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-md border bg-white/40 shadow-sm" style={{ backgroundColor: background }} aria-hidden>
      {body}
    </div>
  );
}
