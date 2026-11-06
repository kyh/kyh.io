"use client";

// What follows a mouse at Easter: a white rabbit (`bunny.ts`), built in the
// round (`bunny-pose.ts`) and drawn in the showcase town's hand as the
// theme's pieces are (`piece.tsx`): a white coat, each solid's side from the
// light in the shaded white under the shade dots, ink round the outside; long
// ears lined pink, dark eyes with a glint, a pink nose over two whisker pads,
// whiskers, and a cotton tail. Each `data-layer` is one part the stage stacks
// by how near the camera it is; each `data-part` is posed a frame at a time.
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { bunny } from "./bunny";
import { SIZE } from "./bunny-pose";

/** Ink `width` screen pixels wide, as the ghost's is, though the bunny's drawn bigger. */
const ink = (width: number) => width / SIZE;

/** Ink round its torso and chest together, and its head: drawn under both, so the seams are covered. */
const OUTLINE = 2.6;

const Eye = ({ index }: { index: number }) => (
  <>
    <path data-part={`eye-${index}`} style={filled("screen")} />
    <path data-part={`glint-${index}`} style={filled("white")} />
    <path data-part={`lid-${index}`} style={{ ...stroked(ink(0.8)), opacity: 0 }} />
  </>
);

export const Follower = () => {
  const id = useSvgId("bunny");
  return (
    <Stage creature={bunny} box={{ height: 150, width: 160, x: -80, y: -115 }} size={SIZE}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={ink(0.9)} />
        {/* Everywhere but its body: where its haunches' rims are inked. */}
        <clipPath id={`${id}-beyond`}>
          <path data-part="beyond-torso" clipRule="evenodd" />
        </clipPath>
      </defs>
      {[0, 1].map((index) => (
        <g key={`hind-${index}`} data-layer={`hind-${index}`}>
          {/* Its shin and foot one outline: inked round both first, then filled, no seam between. */}
          <path data-part={`hind-leg-${index}`} style={stroked(ink(2))} />
          <path data-part={`hind-${index}`} style={stroked(ink(2))} />
          <path data-part={`hind-leg-${index}`} style={filled("white")} />
          <Solid name={`hind-${index}`} id={id} fill="white" shade="whiteShade" />
        </g>
      ))}
      {[0, 1].map((index) => (
        <g key={`fore-${index}`} data-layer={`fore-${index}`}>
          {/* Its foreleg and paw one outline: the paw shaded inside it, no seam between. */}
          <path data-part={`fore-leg-${index}`} style={filled("white", ink(0.9))} />
          <Solid name={`fore-${index}`} id={id} fill="white" shade="whiteShade" />
        </g>
      ))}
      <g data-layer="tail">
        <Solid name="tail" id={id} fill="white" shade="whiteShade" ink={ink(1)} />
      </g>
      <g data-layer="torso">
        <path data-part="torso" style={stroked(ink(OUTLINE))} />
        <path data-part="chest" style={stroked(ink(OUTLINE))} />
        <Solid name="torso" id={id} fill="white" shade="whiteShade" />
        <Solid name="chest" id={id} fill="white" shade="whiteShade" />
      </g>
      {[0, 1].map((index) => (
        <g key={`haunch-${index}`} data-layer={`haunch-${index}`}>
          {/* Inked round its outer rim only, where it stands out past its body; a fine crease where it's on it. */}
          <Solid name={`haunch-${index}`} id={id} fill="white" shade="whiteShade" />
          <path data-part={`haunch-${index}`} style={stroked(ink(0.5))} />
          <path
            data-part={`haunch-${index}`}
            style={stroked(ink(1.1))}
            clipPath={`url(#${id}-beyond)`}
          />
        </g>
      ))}
      <g data-layer="head">
        <path data-part="head" style={stroked(ink(OUTLINE))} />
        {/* Its whisker pads' ink, in with its head's, so its muzzle and head have one outline. */}
        <path data-part="pad-ink-0" style={stroked(ink(OUTLINE))} />
        <path data-part="pad-ink-1" style={stroked(ink(OUTLINE))} />
        <Solid name="head" id={id} fill="white" shade="whiteShade" />
        <Eye index={0} />
        <Eye index={1} />
      </g>
      <g data-layer="muzzle">
        <Solid name="pad-0" id={id} fill="white" shade="whiteShade" />
        <Solid name="pad-1" id={id} fill="white" shade="whiteShade" />
        {/* Its eyes again, over its pads: nosing down, its muzzle mustn't cover them. */}
        <Eye index={0} />
        <Eye index={1} />
        <path data-part="whiskers" style={stroked(ink(0.35))} />
        <path data-part="mouth" style={stroked(ink(0.5))} />
        <path data-part="nose" style={filled("accentPink", ink(0.5))} />
      </g>
      {[0, 1].map((index) => (
        <g key={`ear-${index}`} data-layer={`ear-${index}`}>
          <Solid name={`ear-${index}`} id={id} fill="white" shade="whiteShade" ink={ink(1.1)} />
          <path data-part={`lining-${index}`} style={filled("accentPink")} />
        </g>
      ))}
    </Stage>
  );
};
