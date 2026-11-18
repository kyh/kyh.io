"use client";

import type { Token } from "@/app/showcase/_components/city/palette";
import { PALETTE } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { INK, ShadeDots } from "../piece";
import { penguin } from "./penguin";
import { SIZE } from "./penguin-go";

const tone = (day: Token, night: Token) =>
  `light-dark(${PALETTE[day].day}, ${PALETTE[night].night})`;

const BLACK = tone("screen", "metal");
const BLACK_SHADE = tone("screen", "metalDark");
const BEAK = tone("bronze", "skinDark");
const BEAK_SHADE = tone("bronzeShade", "bronze");

const inked = (width: number) => width / SIZE;

const OUTLINE = inked(2.8);

const STRIPES = {
  ...stroked(4.8, "white"),
  strokeDasharray: "1.4 3.6",
  strokeLinecap: "butt",
} as const;

const Ring = ({ name }: { name: string }) => (
  <>
    <path data-part={name} style={{ ...stroked(4.8 + inked(2)), strokeLinecap: "butt" }} />
    <path data-part={name} style={{ ...stroked(4.8, "festiveRed"), strokeLinecap: "butt" }} />
    <path data-part={name} style={STRIPES} />
  </>
);

const Black = ({
  name,
  id,
  ink,
  clip = name,
}: {
  name: string;
  id: string;
  ink?: number;
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
    <path data-part={`ring-${index}`} style={filled("white", inked(0.5))} />
    <path data-part={`eye-${index}`} style={filled("screen")} />
    <path data-part={`lid-${index}`} style={{ ...stroked(inked(0.9)), opacity: 0 }} />
  </>
);

const ScarfEnd = ({ name }: { name: string }) => (
  <>
    <path data-part={`${name}-fringe`} style={stroked(2.2)} />
    <path data-part={`${name}-fringe`} style={stroked(1, "festiveRed")} />
    <path data-part={name} style={{ ...filled("festiveRed", inked(1)), strokeLinejoin: "round" }} />
    <path data-part={`${name}-stripes`} style={{ ...STRIPES, strokeWidth: 3 }} />
  </>
);

export const Follower = () => {
  const id = useSvgId("penguin");

  return (
    <Stage creature={penguin} box={{ height: 130, width: 150, x: -75, y: -100 }} size={SIZE}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={inked(0.9)} />
      </defs>
      {}
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
          <Solid
            name={`foot-${index}`}
            id={id}
            fill="accentPink"
            shade="accentPink"
            ink={inked(0.8)}
          />
        </g>
      ))}
      <g data-layer="tail">
        <path data-part="tail" style={{ fill: BLACK, stroke: INK, strokeWidth: inked(0.9) }} />
      </g>
      {[0, 1].map((index) => (
        <g key={`flipper-${index}`} data-layer={`flipper-${index}`}>
          <Black name={`flipper-${index}`} id={id} ink={inked(0.6)} />
        </g>
      ))}
      <g data-layer="torso">
        {}
        <Ring name="scarf-back" />
        <path data-part="body" style={stroked(OUTLINE)} />
        <path data-part="head" style={stroked(OUTLINE)} />
        <Black name="body" id={id} />
        <Black name="head" id={id} />
        {}
        <Solid name="front" id={id} fill="white" shade="whiteShade" ink={inked(0.7)} />
        <Eye index={0} />
        <Eye index={1} />
        <Ring name="scarf" />
        {}
        <g data-part="head-over" style={{ opacity: 0 }}>
          <path data-part="head" style={stroked(OUTLINE)} />
          <Black name="head" id={id} clip="head-over" />
          <Eye index={0} />
          <Eye index={1} />
        </g>
      </g>
      <g data-layer="beak">
        <path
          data-part="beak-lower"
          style={{ fill: BEAK_SHADE, stroke: INK, strokeWidth: inked(0.6) }}
        />
        <path data-part="beak-upper" style={{ fill: BEAK, stroke: INK, strokeWidth: inked(0.7) }} />
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
