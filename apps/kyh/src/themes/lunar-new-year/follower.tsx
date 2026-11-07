"use client";

// What follows a mouse at Lunar New Year: a festival dragon (`dragon.ts`),
// built in the round (`dragon-pose.ts`, `dragon-body.ts`) and drawn in the
// showcase town's hand as the theme's pieces are (`piece.tsx`): flat faces,
// each solid's side from the light in its shade under the shade dots, ink round
// the outside. A long red body ringed in ink, a row of gold fins down its spine
// and a gold belly that shows as it banks; short clawed legs and a gold tuft at
// its tail; a red head with a gold nose and jaw, gold brows, pale horns, gold
// whiskers, a beard and a mane. Each `data-layer` is one part the stage stacks
// by how near the camera it is, restacked within its own parent, so every
// layer of the head is a child of it; each `data-part` is posed a frame at a
// time. Its ears and horns are no layers: they stay first in the head, its mane
// and skull over their roots, or from the side they lie across the mane as a slab.
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { dragon } from "./dragon";
import { LEGS, SEGMENTS, segmentAt } from "./dragon-body";
import { LOCKS, TUFTS } from "./dragon-pose";

const Leg = ({ index, at }: { index: number; at: "front" | "back" }) => (
  <>
    <path data-part={`leg-${index}-${at}`} style={stroked(4)} />
    <path data-part={`leg-${index}-${at}`} style={stroked(2.2, "festiveRedShade")} />
    <path data-part={`claws-${index}-${at}`} style={stroked(1, "gold")} />
  </>
);

const Segment = ({ index, id }: { index: number; id: string }) => {
  const legs = LEGS.flatMap(({ ring }, leg) => (segmentAt(ring) === index ? [leg] : []));
  return (
    <g data-layer={`seg-${index}`}>
      {index === SEGMENTS - 1 &&
        Array.from({ length: TUFTS }, (_, tuft) => (
          <path key={tuft} data-part={`tuft-${tuft}`} style={filled("gold", 0.8)} />
        ))}
      {legs.map((leg) => (
        <Leg key={leg} index={leg} at="back" />
      ))}
      <path data-part={`fin-back-${index}`} style={filled("gold", 0.7)} />
      <path data-part={`seg-${index}`} style={filled("festiveRedShade")} />
      <path data-part={`seg-${index}`} fill={`url(#${id}-dots)`} />
      <path data-part={`lit-${index}`} style={filled("festiveRed")} />
      <path data-part={`belly-${index}`} style={filled("gold")} />
      <path data-part={`hoops-${index}`} style={stroked(0.7, "festiveRedShade")} />
      <path data-part={`edge-${index}`} style={stroked(1.3)} />
      <path data-part={`fin-front-${index}`} style={filled("gold", 0.7)} />
      {legs.map((leg) => (
        <Leg key={leg} index={leg} at="front" />
      ))}
    </g>
  );
};

const Eye = ({ index }: { index: number }) => (
  <>
    <path data-part={`brow-${index}`} style={stroked(2.6)} />
    <path data-part={`brow-${index}`} style={stroked(1.4, "gold")} />
    <path data-part={`eye-${index}`} style={filled("white", 0.6)} />
    <path data-part={`pupil-${index}`} style={filled("screen")} />
    <path data-part={`glint-${index}`} style={filled("white")} />
    <path data-part={`lid-${index}`} style={{ ...stroked(1.1, "screen"), opacity: 0 }} />
  </>
);

export const Follower = () => {
  const id = useSvgId("dragon");
  return (
    <Stage creature={dragon} box={{ height: 340, width: 340, x: -170, y: -170 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={0.8} />
      </defs>
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <Segment key={index} index={index} id={id} />
      ))}
      <g data-layer="head">
        {[0, 1].map((index) => (
          <g key={index}>
            <path data-part={`ear-${index}`} style={filled("festiveRed", 0.8)} />
            <path data-part={`horn-${index}`} style={filled("whiteShade", 0.9)} />
          </g>
        ))}
        {Array.from({ length: LOCKS }, (_, index) => (
          <path
            key={index}
            data-layer={`mane-${index}`}
            data-part={`mane-${index}`}
            style={filled("gold", 0.8)}
          />
        ))}
        {[0, 1].map((index) => (
          <g key={index} data-layer={`whisker-${index}`}>
            <path data-part={`whisker-${index}`} style={stroked(2)} />
            <path data-part={`whisker-${index}`} style={stroked(0.9, "gold")} />
          </g>
        ))}
        <path data-layer="beard" data-part="beard" style={filled("gold", 0.8)} />
        <path data-layer="head-ink" data-part="head-ink" style={stroked(2.6)} />
        <g data-layer="jaw">
          <Solid name="jaw" id={id} fill="gold" shade="goldShade" />
          <path data-part="mouth" style={filled("screen")} />
          <path data-part="tongue" style={filled("festiveRed")} />
          <path data-part="fangs-lower" style={filled("white", 0.4)} />
        </g>
        <g data-layer="skull">
          <Solid name="skull" id={id} fill="festiveRed" shade="festiveRedShade" />
        </g>
        <g data-layer="muzzle">
          <path data-part="fangs-upper" style={filled("white", 0.4)} />
          <Solid name="muzzle" id={id} fill="festiveRed" shade="festiveRedShade" />
          <Solid name="nose-0" id={id} fill="gold" shade="goldShade" ink={0.5} />
          <Solid name="nose-1" id={id} fill="gold" shade="goldShade" ink={0.5} />
          <path data-part="lip-0" style={stroked(0.7)} />
          <path data-part="lip-1" style={stroked(0.7)} />
          <path data-part="nostril-0" style={filled("screen")} />
          <path data-part="nostril-1" style={filled("screen")} />
        </g>
        <g data-layer="face">
          <Eye index={0} />
          <Eye index={1} />
        </g>
      </g>
      <g data-layer="puffs">
        {[0, 1, 2, 3].map((index) => (
          <path key={index} data-part={`puff-${index}`} style={filled("white", 0.7)} />
        ))}
      </g>
    </Stage>
  );
};
