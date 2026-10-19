"use client";

// Draws a season's piece (`art.ts`) in a 24×24 <svg>: its gradients once, in
// <defs> under an id, and its layers wherever it shows, filling from them. A
// page showing many of one piece (a burst, the drift) shares one set of defs.
import { useId } from "react";

import type { Art, Gradient, Layer } from "./art";

/** An id for a piece's gradients: useId's punctuation isn't safe inside url(#…). */
export const usePieceId = () => `piece-${useId().replaceAll(/[^\w-]/gu, "")}`;

const Stops = ({ gradient }: { gradient: Gradient }) =>
  gradient.stops.map(([offset, color, opacity]) => (
    <stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
  ));

/** A piece's gradients, for inside <defs>. */
export const PieceDefs = ({ art, id }: { art: Art; id: string }) =>
  Object.entries(art.gradients ?? {}).map(([name, gradient]) =>
    gradient.kind === "radial" ? (
      <radialGradient
        key={name}
        id={`${id}-${name}`}
        cx={gradient.at[0]}
        cy={gradient.at[1]}
        r={gradient.r}
      >
        <Stops gradient={gradient} />
      </radialGradient>
    ) : (
      <linearGradient
        key={name}
        id={`${id}-${name}`}
        x1={gradient.from[0]}
        y1={gradient.from[1]}
        x2={gradient.to[0]}
        y2={gradient.to[1]}
      >
        <Stops gradient={gradient} />
      </linearGradient>
    ),
  );

const fillOf = (layer: Layer, id: string) =>
  layer.gradient === undefined ? (layer.fill ?? "none") : `url(#${id}-${layer.gradient})`;

const PieceLayer = ({ layer, id }: { layer: Layer; id: string }) => {
  const flap = layer.flap ? "piece-flap" : undefined;
  const filled = layer.gradient !== undefined || layer.fill !== undefined;
  return (
    <>
      {layer.shadow && (
        <path
          d={layer.d}
          className={flap}
          fill={filled ? "black" : "none"}
          stroke={layer.stroke && "black"}
          strokeWidth={layer.strokeWidth}
          opacity={0.2}
          transform="translate(0 1.5)"
        />
      )}
      <path
        d={layer.d}
        className={flap}
        fill={fillOf(layer, id)}
        stroke={layer.stroke}
        strokeWidth={layer.strokeWidth}
        opacity={layer.opacity}
      />
    </>
  );
};

/** A piece's layers, filled from the gradients `PieceDefs` made under the same id. */
export const PieceLayers = ({ art, id }: { art: Art; id: string }) => (
  <g strokeLinecap="round" strokeLinejoin="round">
    {art.layers.map((layer, index) => (
      <PieceLayer key={index} layer={layer} id={id} />
    ))}
  </g>
);

/** One piece on its own, gradients and all: an icon. */
export const PieceIcon = ({ art, className }: { art: Art; className?: string }) => {
  const id = usePieceId();
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <PieceDefs art={art} id={id} />
      </defs>
      <PieceLayers art={art} id={id} />
    </svg>
  );
};
