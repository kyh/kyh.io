"use client";

import type { Token } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { turkey } from "./turkey";
import { FEATHERS, SIZE } from "./turkey-pose";

const ink = (width: number) => width / SIZE;

const NECK = [
  ["neck", 5, "accentRed"],
  ["neck-low", 6.8, "bronze"],
  ["neck-base", 9, "bronze"],
] as const;

const Flesh = ({ name, width }: { name: string; width: number }) => (
  <>
    <path data-part={name} style={stroked(width + ink(1.4))} />
    <path data-part={name} style={stroked(width, "festiveRed")} />
  </>
);

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
      <g data-layer="hat" style={{ cursor: "grab" }}>
        <g data-part="hat" style={{ opacity: 0 }}>
          <Solid name="hat-brim" id={id} fill="screen" shade="screen" ink={ink(1)} />
          <Solid name="hat-crown" id={id} fill="screen" shade="screen" ink={ink(1)} />
          <path data-part="hat-band" style={filled("screen", ink(0.7))} />
          <path data-part="hat-lid" style={filled("screen", ink(1))} />
          <path data-part="hat-buckle" style={filled("gold", ink(0.6))} />
          <path data-part="hat-clasp" style={filled("screen")} />
        </g>
      </g>
    </Stage>
  );
};
