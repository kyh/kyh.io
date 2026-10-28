"use client";

// Draws a theme's piece (`art.ts`) in a 24×24 <svg>, in the showcase town's
// hand: each face flat in its palette color, outlined in ink, its shaded side
// in the darker color under a checker of dots (`shadow-dots.ts` does the same
// to the town). Colors follow the page's light or dark (`light-dark()`, read
// against the `color-scheme` the theme store paints), as the town's day and
// night. A page showing many of one piece (a burst, the drift) shares one set
// of defs: the dots, and each shaded face's outline to clip its shade to.
import type { Token } from "@/app/showcase/_components/city/palette";
import { PALETTE } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import type { Art, Layer } from "./art";

/** A palette color by day and by night, as the page is. */
export const townColor = (token: Token) =>
  `light-dark(${PALETTE[token].day}, ${PALETTE[token].night})`;

/** The town's ink, and its shade dots: darker by day, paler by night, as the town's are. */
export const INK = townColor("ink");
const DOTS = "light-dark(rgb(0 0 0 / 0.2), rgb(255 255 255 / 0.3))";
/** The town's fine line, in the box's units. */
const FINE = 0.6;
/** A dot, in the box's units: about two pixels at the size pieces show. */
const DOT = 0.75;

/** The checker of shade dots, `size` units a dot, for inside <defs> under `id`. */
export const ShadeDots = ({ id, size }: { id: string; size: number }) => (
  <pattern id={id} width={size * 2} height={size * 2} patternUnits="userSpaceOnUse">
    <rect width={size} height={size} style={{ fill: DOTS }} />
    <rect x={size} y={size} width={size} height={size} style={{ fill: DOTS }} />
  </pattern>
);

/** A piece's defs: its shade dots and the outlines its shades are clipped to. */
export const PieceDefs = ({ art, id }: { art: Art; id: string }) => (
  <>
    <ShadeDots id={`${id}-dots`} size={DOT} />
    {art.layers.map((layer, index) =>
      layer.shade === undefined ? null : (
        <clipPath key={index} id={`${id}-clip-${index}`}>
          <path d={layer.d} />
        </clipPath>
      ),
    )}
  </>
);

/** A swinging layer's class and the pivot and angles its animation reads (global.css). */
const swingOf = ({ swing }: Layer) => {
  if (swing === undefined) {
    return {};
  }
  // SAFETY: CSS custom properties are valid inline styles, but
  // React.CSSProperties has no index signature for `--*` keys; the object
  // holds nothing else.
  const style = {
    "--swing-from": `${swing.from}deg`,
    "--swing-to": `${swing.to}deg`,
    "--swing-x": `${swing.at[0]}px`,
    "--swing-y": `${swing.at[1]}px`,
  } as React.CSSProperties;
  return { className: "piece-swing", style };
};

const PieceLayer = ({ layer, index, id }: { layer: Layer; index: number; id: string }) => {
  const { className, style } = swingOf(layer);
  if (layer.fill === undefined) {
    // A line: in a palette color, or ink.
    return (
      <path
        d={layer.d}
        className={className}
        style={{
          ...style,
          fill: "none",
          stroke: layer.stroke ? townColor(layer.stroke) : INK,
          strokeWidth: layer.strokeWidth ?? FINE,
        }}
      />
    );
  }
  const split = layer.split ?? 12;
  return (
    <g className={className} style={style}>
      <path d={layer.d} style={{ fill: townColor(layer.fill) }} />
      {layer.shade !== undefined && (
        <g clipPath={`url(#${id}-clip-${index})`}>
          <rect x={split} y={-4} width={32} height={32} style={{ fill: townColor(layer.shade) }} />
          <rect x={split} y={-4} width={32} height={32} fill={`url(#${id}-dots)`} />
        </g>
      )}
      {layer.ink !== 0 && (
        <path d={layer.d} style={{ fill: "none", stroke: INK, strokeWidth: layer.ink ?? FINE }} />
      )}
    </g>
  );
};

/** A piece's layers, shaded from the defs `PieceDefs` made under the same id. */
export const PieceLayers = ({ art, id }: { art: Art; id: string }) => (
  <g strokeLinecap="round" strokeLinejoin="round">
    {art.layers.map((layer, index) => (
      <PieceLayer key={index} layer={layer} index={index} id={id} />
    ))}
  </g>
);

/** One piece on its own, defs and all: an icon. */
export const PieceIcon = ({ art, className }: { art: Art; className?: string }) => {
  const id = useSvgId("piece");
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <PieceDefs art={art} id={id} />
      </defs>
      <PieceLayers art={art} id={id} />
    </svg>
  );
};
