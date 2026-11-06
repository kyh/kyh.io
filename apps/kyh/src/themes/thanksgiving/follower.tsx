"use client";

// What follows a mouse at Thanksgiving: a wild tom turkey (`turkey.ts`),
// built in the round (`turkey-pose.ts`) and drawn in the showcase town's hand
// as the theme's pieces are (`piece.tsx`): flat faces, each solid's side from
// the light in its shade under the shade dots, ink round the outside. A bronze
// body (its back and breast inked round as one) and wings, the wings barred
// pale, tail feathers banded dark and tipped chestnut, a neck feathered low and
// bare red above up to a bare blue head with a red snood and wattle, a pale
// beak, a dark beard, bronze drumsticks and pink shanks, the nearer leg lit.
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

/** A red fleshy part hanging off its head (the snood, the wattle): a thick red line, inked. */
const Flesh = ({ name, width }: { name: string; width: number }) => (
  <>
    <path data-part={name} style={stroked(width + ink(1.4))} />
    <path data-part={name} style={stroked(width, "festiveRed")} />
  </>
);

/**
 * Its body: its back and its breast, two solids inked round as one. Both
 * inks go under both faces, so only the outside of the two shows.
 */
const Torso = ({ id }: { id: string }) => {
  const masses = ["body", "breast"] as const;
  return (
    <>
      {masses.map((name) => (
        <path key={`${name}-ink`} data-part={name} style={stroked(ink(2.8))} />
      ))}
      {masses.map((name) => (
        <Solid key={name} name={name} id={id} fill="bronze" shade="bronzeShade" />
      ))}
    </>
  );
};

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
          <Solid
            name={`wing-${index}`}
            id={id}
            fill="bronzeShade"
            shade="bronzeShade"
            ink={ink(0.9)}
          />
          <path
            data-part={`bars-${index}`}
            style={{ ...stroked(1.2, "white"), strokeDasharray: "0.9 2.6", strokeLinecap: "butt" }}
          />
        </g>
      ))}
      <g data-layer="torso">
        <Torso id={id} />
      </g>
      <g data-layer="beard">
        <path data-part="beard" style={stroked(2 + ink(1))} />
        <path data-part="beard" style={stroked(2, "screen")} />
      </g>
      <g data-layer="neck">
        <path data-part="neck" style={stroked(5 + ink(2.4))} />
        <path data-part="neck" style={stroked(5, "accentRed")} />
        <path data-part="neck-low" style={stroked(5.4, "bronze")} />
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
