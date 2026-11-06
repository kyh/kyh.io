"use client";

// What follows a mouse at Christmas: an Adélie penguin in a red scarf
// (`penguin.ts`), built in the round (`penguin-pose.ts`) and drawn in the
// showcase town's hand as the theme's pieces are (`piece.tsx`): flat faces,
// each solid's side from the light in its shade under the shade dots, ink
// round the outside. A black body and head drawn as one, a white front, a
// white ring round each eye, a stout dark beak, black flippers, pink feet and
// a red scarf striped white, its two ends fringed. Christmas is dark, and a
// penguin's black on a dark page is a hole with an outline: by night its black
// is the town's slate, lifted off the page so it reads as a body. Each
// `data-layer` is one part the stage stacks by how near the camera it is;
// each `data-part` is posed a frame at a time.
import type { Token } from "@/app/showcase/_components/city/palette";
import { PALETTE } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { INK, ShadeDots } from "../piece";
import { penguin } from "./penguin";

/** A color by day in one palette token and by night in another, as the page is. */
const tone = (day: Token, night: Token) =>
  `light-dark(${PALETTE[day].day}, ${PALETTE[night].night})`;

/** Its black: the town's screen by day; by night, slate (lit, and turned from the light). */
const BLACK = tone("screen", "metal");
const BLACK_SHADE = tone("screen", "metalDark");
/** Its beak: dark, a little warm, so it's not lost against its face. */
const BEAK = tone("bronze", "skinDark");
const BEAK_SHADE = tone("bronzeShade", "bronze");

/** Ink round the body and head together: drawn under both, so the seam between them is covered. */
const OUTLINE = 2.8;
/** The scarf's white stripes: short square dashes across the red. */
const STRIPES = {
  ...stroked(4.8, "white"),
  strokeDasharray: "1.4 3.6",
  strokeLinecap: "butt",
} as const;

/** A side of its scarf's ring, inked, red, striped white; its ends cut square where they meet the other side's. */
const Ring = ({ name }: { name: string }) => (
  <>
    <path data-part={name} style={{ ...stroked(6.8), strokeLinecap: "butt" }} />
    <path data-part={name} style={{ ...stroked(4.8, "festiveRed"), strokeLinecap: "butt" }} />
    <path data-part={name} style={STRIPES} />
  </>
);

/** A shaded black solid, as `Solid` draws one, in its black; inked round this wide unless it shares an outline. */
const Black = ({
  name,
  id,
  ink,
  clip = name,
}: {
  name: string;
  id: string;
  ink?: number;
  /** Its clip's name, for a second drawing of a part. */
  clip?: string;
}) => (
  <>
    <clipPath id={`${id}-${clip}`}>
      <path data-part={name} />
    </clipPath>
    <path data-part={name} style={{ fill: BLACK_SHADE }} />
    <path data-part={name} fill={`url(#${id}-dots)`} />
    <path data-part={`${name}-lit`} style={{ fill: BLACK }} clipPath={`url(#${id}-${clip})`} />
    {ink === undefined ? null : <path data-part={name} style={stroked(ink)} />}
  </>
);

const Eye = ({ index }: { index: number }) => (
  <>
    <path data-part={`ring-${index}`} style={filled("white", 0.5)} />
    <path data-part={`eye-${index}`} style={filled("screen")} />
    <path data-part={`lid-${index}`} style={{ ...stroked(0.9), opacity: 0 }} />
  </>
);

/** One of its scarf's ends: a red strip inked round, striped white, and its fringe. */
const ScarfEnd = ({ name }: { name: string }) => (
  <>
    <path data-part={`${name}-fringe`} style={stroked(2.2)} />
    <path data-part={`${name}-fringe`} style={stroked(1, "festiveRed")} />
    <path data-part={name} style={{ ...filled("festiveRed", 1), strokeLinejoin: "round" }} />
    <path data-part={`${name}-stripes`} style={{ ...STRIPES, strokeWidth: 3 }} />
  </>
);

export const Follower = () => {
  const id = useSvgId("penguin");
  return (
    <Stage creature={penguin} box={{ height: 130, width: 150, x: -75, y: -100 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={0.9} />
      </defs>
      {/* Its short legs, feathered dark, down from under its body to its heels: always behind it. */}
      <g data-layer="legs">
        {[0, 1].map((index) => (
          <g key={`leg-${index}`}>
            <path data-part={`leg-${index}`} style={stroked(3.8)} />
            <path data-part={`leg-${index}`} style={{ ...stroked(2.4), stroke: BLACK_SHADE }} />
          </g>
        ))}
      </g>
      {[0, 1].map((index) => (
        <g key={`foot-${index}`} data-layer={`foot-${index}`}>
          <Solid name={`foot-${index}`} id={id} fill="accentPink" shade="accentPink" ink={0.8} />
        </g>
      ))}
      <g data-layer="tail">
        <path data-part="tail" style={{ fill: BLACK, stroke: INK, strokeWidth: 0.9 }} />
      </g>
      {[0, 1].map((index) => (
        <g key={`flipper-${index}`} data-layer={`flipper-${index}`}>
          <Black name={`flipper-${index}`} id={id} ink={0.6} />
        </g>
      ))}
      <g data-layer="torso">
        {/* Its scarf's far side, round the back of its neck: where it shows past its neck, it goes on round. */}
        <Ring name="scarf-back" />
        <path data-part="body" style={stroked(OUTLINE)} />
        <path data-part="head" style={stroked(OUTLINE)} />
        <Black name="body" id={id} />
        <Black name="head" id={id} />
        {/* Its white front: the part of its body turned forward, shaded as the body is. */}
        <Solid name="front" id={id} fill="white" shade="whiteShade" ink={0.7} />
        <Eye index={0} />
        <Eye index={1} />
        <Ring name="scarf" />
        {/* Its head again, over its scarf, for when it bows its head over it or its neck points at the camera. */}
        <g data-part="head-over" style={{ opacity: 0 }}>
          <path data-part="head" style={stroked(OUTLINE)} />
          <Black name="head" id={id} clip="head-over" />
          <Eye index={0} />
          <Eye index={1} />
        </g>
      </g>
      <g data-layer="beak">
        <path data-part="beak-lower" style={{ fill: BEAK_SHADE, stroke: INK, strokeWidth: 0.6 }} />
        <path data-part="beak-upper" style={{ fill: BEAK, stroke: INK, strokeWidth: 0.7 }} />
      </g>
      <g data-layer="scarf-end">
        <g data-part="scarf-ends">
          <ScarfEnd name="scarf-short" />
          <ScarfEnd name="scarf-end" />
        </g>
      </g>
    </Stage>
  );
};
