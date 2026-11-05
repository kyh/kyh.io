"use client";

// What follows a mouse at Thanksgiving: a wild tom turkey (`turkey.ts`),
// drawn in the showcase town's hand as the theme's pieces are (`piece.tsx`):
// flat faces in the town's palette, ink outlines, its belly in the darker
// bronze under the shade dots. Bronze feathers scalloped over its body,
// barred wings, a fan of tail feathers banded dark and tipped buff, a bare
// blue head with its red snood and wattle, a beard on its breast, and pink
// legs. Parts marked `data-part` are posed a frame at a time by the stage.
import { useSvgId } from "@/lib/svg-id";
import { point } from "../art";
import { Stage } from "../follower/stage";
import { filled, stroked } from "../follower/ink";
import { ShadeDots } from "../piece";
import { FEATHERS, turkey } from "./turkey";

const BODY =
  "M-18 -47C-9 -58 6 -58 13 -52C23 -46 24 -31 11 -26C1 -23 -13 -24 -20 -31C-24 -36 -24 -43 -18 -47Z";
const BELLY = "M19 -36C16 -28 7 -24 -2 -24C-12 -24 -18 -28 -21 -33C-10 -30 6 -30 19 -36Z";
const WING =
  "M10 -45C4 -48 -8 -46 -15 -38C-17 -35 -16 -33 -13 -33C-4 -32 6 -34 11 -38C12 -41 12 -43 10 -45Z";
/** The wing's barring: rows of pale flecks across its folded flight feathers. */
const BARS = "M-12 -35.6H3M-11 -38.4H5";
const BEARD = "M15 -43l-1.2 9.5M16.6 -42.6l-0.2 9M13.4 -42.4l-2 8.4";
/** One tail feather, along +x from its root: long and round-tipped. */
const FEATHER = "M0 -2.2C10 -4.2 24 -5.2 30 -2.8C32 -1.2 32 1.2 30 2.8C24 5.2 10 4.2 0 2.2Z";
const SKULL = "M-4 -3.6C-1 -6.6 4.4 -5.6 5 -1.6C5.4 1.6 3 4.4 -0.4 4.4C-3.4 4.4 -5 1.6 -4.8 -0.6Z";
const BEAK = "M4.4 -2.2L9.4 -0.2L4.6 1.4Z";
const SNOOD = "M2 -3.4C5 -5.6 8.2 -3.6 8.6 1.6C8.8 4.6 7.6 6.6 6.4 5.6C5.8 2 5 -0.4 2.6 -1.2Z";
const WATTLE = "M-0.6 3.6C-3 6 -3.2 10.6 -0.4 11.4C2.6 12 4 8 2.4 3.2Z";

/** Rows of scalloped bronze feathers over its body, kept inside its outline. */
const SCALES = (() => {
  let d = "";
  for (const [row, y] of [-50, -45, -40, -35, -30].entries()) {
    for (let x = -16 + (row % 2) * 2.5; x < 16; x += 5) {
      const inside = ((x + 1) / 20) ** 2 + ((y + 39) / 15) ** 2 < 0.8;
      if (inside) {
        d += `M${point(x, y)}q2.5 2.6 5 0`;
      }
    }
  }
  return d;
})();
const Leg = ({ index, token }: { index: number; token: "roofPink" | "roofPinkShade" }) => (
  <>
    <path data-part={`leg-${index}`} style={stroked(3.4)} />
    <path data-part={`leg-${index}`} style={stroked(1.9, token)} />
  </>
);

export const Follower = () => {
  const id = useSvgId("turkey");
  return (
    <Stage creature={turkey} box={{ height: 130, width: 150, x: -75, y: -115 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={1} />
        <clipPath id={`${id}-feather`}>
          <path d={FEATHER} />
        </clipPath>
      </defs>
      <g data-part="flip">
        <Leg index={1} token="roofPinkShade" />
        <Leg index={0} token="roofPink" />
        <g data-part="body">
          {Array.from({ length: FEATHERS }, (_, index) => (
            <g key={index} data-part={`feather-${index}`}>
              <path d={FEATHER} style={filled(index % 2 === 0 ? "bronze" : "bronzeShade")} />
              <g clipPath={`url(#${id}-feather)`}>
                <rect x={20} y={-6} width={4.5} height={12} style={filled("screen")} />
                <rect x={24.5} y={-6} width={8} height={12} style={filled("hay")} />
              </g>
              <path d="M1 0H20" style={stroked(0.5, "hayShade")} />
              <path d={FEATHER} style={stroked(0.9)} />
            </g>
          ))}
          <path d={BODY} style={filled("bronze")} />
          <path d={BELLY} style={filled("bronzeShade")} />
          <path d={BELLY} fill={`url(#${id}-dots)`} />
          <path d={SCALES} style={stroked(0.7, "bronzeShade")} />
          <path d={BODY} style={stroked(1.4)} />
          <g data-part="wing">
            <path d={WING} style={filled("bronzeShade")} />
            <path d={BARS} style={{ ...stroked(1.1, "white"), strokeDasharray: "1.6 1.8" }} />
            <path d={WING} style={stroked(0.9)} />
          </g>
          <path d={BEARD} style={stroked(1.1, "screen")} />
          <path data-part="neck" style={stroked(7.6)} />
          <path data-part="neck" style={stroked(5.2, "accentRed")} />
          <g data-part="head">
            <g data-part="wattle">
              <path d={WATTLE} style={filled("festiveRed")} />
              <path d={WATTLE} style={stroked(0.8)} />
            </g>
            <path d={SKULL} style={filled("roofBlue")} />
            <path d={SKULL} style={stroked(1)} />
            <path d={BEAK} style={filled("hay")} />
            <path d={BEAK} style={stroked(0.8)} />
            <circle data-part="eye" cx={1.4} cy={-1.6} r={1.1} style={filled("screen")} />
            <path data-part="eyelid" d="M0.2 -1.4h2.4" style={{ ...stroked(0.8), opacity: 0 }} />
            <g data-part="snood">
              <path d={SNOOD} style={filled("festiveRed")} />
              <path d={SNOOD} style={stroked(0.8)} />
            </g>
          </g>
        </g>
      </g>
    </Stage>
  );
};
