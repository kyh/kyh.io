"use client";

// What follows a mouse at Thanksgiving: a wild tom turkey (`turkey.ts`),
// built in the round (`turkey-pose.ts`) and drawn in the showcase town's hand
// as the theme's pieces are (`piece.tsx`): flat faces, each solid's side from
// the light in its shade under the shade dots, ink round the outside. A bronze
// body (its back and breast drawn as one) and wings, inked only along their
// lower edge, their dark primaries barred white, tail feathers banded dark and tipped chestnut, a neck feathered low and
// bare red above up to a bare blue head with a red snood and wattle, a pale
// beak, a near-black beard, bronze drumsticks and pink shanks, the nearer leg lit.
// Each `data-layer` is one part the stage stacks by how near the camera it
// is; each `data-part` is posed a frame at a time.
import type { Token } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { turkey } from "./turkey";
import { FEATHERS, SIZE } from "./turkey-pose";

/** Ink `width` screen pixels wide, as the ghost's is, though the turkey's drawn smaller. */
const ink = (width: number) => width / SIZE;

/** Its neck: bare red skin above, feathered bronze below, thickest where it leaves its body. */
const NECK = [
  ["neck", 5, "accentRed"],
  ["neck-low", 6.8, "bronze"],
  ["neck-base", 9, "bronze"],
] as const;

/** A red fleshy part hanging off its head (the snood, the wattle): a thick red line, inked. */
const Flesh = ({ name, width }: { name: string; width: number }) => (
  <>
    <path data-part={name} style={stroked(width + ink(1.4))} />
    <path data-part={name} style={stroked(width, "festiveRed")} />
  </>
);

/**
 * Its body: its back and its breast, two solids drawn as one. Both inks go
 * under both faces, so only the outside of the two shows, and both lit parts
 * are kept inside the two together, so no seam shows where they meet.
 */
const Torso = ({ id }: { id: string }) => {
  const masses = ["body", "breast"] as const;
  return (
    <>
      <clipPath id={`${id}-torso`}>
        {masses.map((name) => (
          <path key={name} data-part={name} />
        ))}
      </clipPath>
      {masses.map((name) => (
        <path key={`${name}-ink`} data-part={name} style={stroked(ink(2.8))} />
      ))}
      {masses.map((name) => (
        <g key={name}>
          <path data-part={name} style={filled("bronzeShade")} />
          <path data-part={name} fill={`url(#${id}-dots)`} />
        </g>
      ))}
      <g clipPath={`url(#${id}-torso)`}>
        {masses.map((name) => (
          <path key={name} data-part={`${name}-lit`} style={filled("bronze")} />
        ))}
      </g>
    </>
  );
};

/** Its beard: coarse near-black hair, thin at the root and spreading to the tip like a tassel, not inked. */
const Beard = () => (
  <>
    {(
      [
        ["beard", 1.4],
        ["beard-mid", 2.2],
        ["beard-tip", 3],
      ] as const
    ).map(([name, width]) => (
      <path key={name} data-part={name} style={stroked(width, "screen")} />
    ))}
  </>
);

/** A line of a leg (`<part>-<index>`): inked, in its shade, and lit over that as it's nearer the camera. */
const Bone = ({
  part,
  index,
  width,
  lit,
}: {
  part: string;
  index: number;
  width: number;
  lit?: Token;
}) => (
  <>
    <path data-part={`${part}-${index}`} style={stroked(width + ink(1.4))} />
    <path
      data-part={`${part}-${index}`}
      style={stroked(width, lit ? "roofPinkShade" : "bronzeShade")}
    />
    {lit ? <path data-part={`${part}-lit-${index}`} style={stroked(width, lit)} /> : null}
  </>
);

export const Follower = () => {
  const id = useSvgId("turkey");
  return (
    <Stage creature={turkey} box={{ height: 150, width: 170, x: -85, y: -120 }} size={SIZE}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={ink(1)} />
      </defs>
      {[0, 1].map((index) => (
        <g key={`leg-${index}`} data-layer={`leg-${index}`}>
          <Bone part="drumstick" index={index} width={5.6} />
          <Bone part="toes" index={index} width={1.5} lit="roofPink" />
          <Bone part="shank" index={index} width={2.6} lit="roofPink" />
        </g>
      ))}
      {Array.from({ length: FEATHERS }, (_, index) => (
        <g key={`feather-${index}`} data-layer={`feather-${index}`}>
          <path
            data-part={`feather-${index}`}
            style={filled(index % 2 === 0 ? "bronze" : "bronzeShade", ink(0.9))}
          />
          <path data-part={`band-${index}`} style={filled("screen")} />
          <path data-part={`tip-${index}`} style={filled("skinDark", ink(0.6))} />
        </g>
      ))}
      {[0, 1].map((index) => (
        <g key={`wing-${index}`} data-layer={`wing-${index}`}>
          <clipPath id={`${id}-primaries-${index}`}>
            <path data-part={`primaries-${index}`} />
          </clipPath>
          <path data-part={`primaries-${index}`} style={filled("bronzeShade", ink(0.8))} />
          <path
            data-part={`bars-${index}`}
            clipPath={`url(#${id}-primaries-${index})`}
            style={{ ...stroked(1.1, "white"), strokeLinecap: "butt" }}
          />
          <Solid name={`wing-${index}`} id={id} fill="bronze" shade="bronzeShade" />
          <path data-part={`wing-ink-${index}`} style={stroked(ink(0.9))} />
          <path data-part={`wing-edge-${index}`} style={stroked(ink(0.9))} />
        </g>
      ))}
      <g data-layer="torso">
        <Torso id={id} />
      </g>
      <g data-layer="beard">
        <Beard />
      </g>
      <g data-layer="neck">
        {/* A thick feathered base tapering up the neck to the bare red skin, inked round as one. */}
        {NECK.map(([name, width]) => (
          <path key={`${name}-ink`} data-part={name} style={stroked(width + ink(2.4))} />
        ))}
        {NECK.map(([name, width, token]) => (
          <path key={name} data-part={name} style={stroked(width, token)} />
        ))}
      </g>
      <g data-layer="head">
        <Solid name="head" id={id} fill="roofBlue" shade="roofBlueShade" ink={ink(1)} />
        {[0, 1].map((index) => (
          <g key={`eye-${index}`}>
            <path data-part={`eye-${index}`} style={filled("screen")} />
            <path data-part={`lid-${index}`} style={{ ...stroked(ink(0.8)), opacity: 0 }} />
          </g>
        ))}
      </g>
      <g data-layer="face">
        <Flesh name="wattle" width={3.2} />
        <Flesh name="snood" width={2.1} />
        <path data-part="beak" style={filled("hay", ink(0.8))} />
      </g>
    </Stage>
  );
};
