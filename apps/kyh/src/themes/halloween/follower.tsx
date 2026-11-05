"use client";

// What follows a mouse at Halloween: a ghost in a sheet (`ghost.ts`), its
// sheet streaming out behind it on the air and swinging back when it stops.
// Drawn in the showcase town's hand, as the theme's pieces are (`piece.tsx`):
// a flat white face, its side turned from the light shaded and dotted, its
// folds and outline in ink, and a chibi face.
import { useSvgId } from "@/lib/svg-id";
import { Stage } from "../follower/stage";
import { INK, ShadeDots, townColor } from "../piece";
import { ghost } from "./ghost";
import { SQUINT_WIDTH } from "./face";

/** The box drawn about the head: room for the sheet streaming out any way. */
const BOX = 140;

export const Follower = () => {
  const id = useSvgId("ghost");
  return (
    <Stage creature={ghost} box={{ height: BOX, width: BOX, x: -BOX / 2, y: -BOX / 2 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={1} />
      </defs>
      <path data-part="body" style={{ fill: townColor("white") }} />
      <path data-part="shade" style={{ fill: townColor("whiteShade") }} />
      <path data-part="shade" fill={`url(#${id}-dots)`} />
      <path data-part="creases" style={{ fill: "none", stroke: INK, strokeWidth: 0.9 }} />
      <path data-part="body" style={{ fill: "none", stroke: INK, strokeWidth: 1.4 }} />
      {/* A chibi face (`face.ts`): blush, eyes with their shine, > < when squeezed shut. */}
      <path data-part="cheeks" style={{ fill: townColor("accentPink") }} />
      <path data-part="eyes" style={{ fill: townColor("screen") }} />
      <path data-part="mouth" style={{ fill: townColor("screen") }} />
      <path data-part="shine" style={{ fill: townColor("white") }} />
      <path
        data-part="squints"
        style={{ fill: "none", stroke: townColor("screen"), strokeWidth: SQUINT_WIDTH }}
      />
    </Stage>
  );
};
