"use client";

// What follows a mouse on St. Patrick's Day: a leprechaun (`leprechaun.ts`),
// built in the round (`leprechaun-pose.ts`) and drawn in the showcase town's
// hand as the theme's pieces are (`piece.tsx`): flat faces, each solid's side
// from the light in its shade under the shade dots, ink round the outside. A
// green coat with its tails in the darker green under the shade dots, a black belt and gold
// buckles, green breeches, white stockings, black shoes, a red beard and hair,
// a buckled green hat, and a gold coin to flip. Each `data-layer` is one part
// the stage stacks by how near the camera it is; each `data-part` is posed a
// frame at a time.
import type { Token } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { leprechaun } from "./leprechaun";
import { SIZE } from "./leprechaun-acts";

/** Ink `width` screen pixels wide, as the ghost's is, though he's drawn bigger (`SIZE`). */
const inked = (width: number) => width / SIZE;

/** Up and to the left, where the town's light comes from. */
const LIGHT = { x: -0.55, y: -0.83 };
/** Ink round a limb drawn as a thick line: this much wider than it. */
const LIMB_INK = inked(1.5);

/** The lit side of a part: the part moved `by` toward the light. */
const toLight = (by: number) => `translate(${LIGHT.x * by} ${LIGHT.y * by})`;

/**
 * A solid of any outline (a beard, a hat's crown) drawn as the town draws
 * one: all of it in its shade under the shade dots, then itself moved toward
 * the light in its color, kept inside it, so the shade's left a crescent on
 * the far side.
 */
const Shaded = ({
  name,
  id,
  fill,
  shade,
  by,
  ink,
}: {
  name: string;
  id: string;
  fill: Token;
  shade: Token;
  by: number;
  ink?: number;
}) => (
  <>
    <clipPath id={`${id}-${name}`}>
      <path data-part={name} />
    </clipPath>
    <path data-part={name} style={filled(shade)} />
    <path data-part={name} fill={`url(#${id}-dots)`} />
    <g clipPath={`url(#${id}-${name})`}>
      <path data-part={name} transform={toLight(by)} style={filled(fill)} />
    </g>
    {ink === undefined ? null : <path data-part={name} style={stroked(ink)} />}
  </>
);

/** A limb drawn as a thick line, inked, its shaded side toward the far side from the light. */
const Limb = ({
  name,
  width,
  fill,
  shade,
}: {
  name: string;
  width: number;
  fill: Token;
  shade: Token;
}) => (
  <>
    <path data-part={name} style={stroked(width, shade)} />
    <path data-part={name} transform={toLight(0.45)} style={stroked(width - 1.1, fill)} />
  </>
);

const Leg = ({ index }: { index: number }) => (
  <g data-layer={`leg-${index}`}>
    <path data-part={`thigh-${index}`} style={stroked(3.4 + LIMB_INK)} />
    <path data-part={`shin-${index}`} style={stroked(2.5 + LIMB_INK)} />
    <Limb name={`thigh-${index}`} width={3.4} fill="festiveGreen" shade="festiveGreenShade" />
    <Limb name={`shin-${index}`} width={2.5} fill="white" shade="whiteShade" />
    <path data-part={`shoe-${index}`} style={filled("screen", inked(0.8))} />
    <path data-part={`shoe-buckle-${index}`} style={filled("gold", inked(0.4))} />
  </g>
);

const Arm = ({ index }: { index: number }) => (
  <g data-layer={`arm-${index}`}>
    <path data-part={`sleeve-${index}`} style={stroked(3.2 + LIMB_INK)} />
    <Limb name={`sleeve-${index}`} width={3.2} fill="festiveGreen" shade="festiveGreenShade" />
    <path data-part={`hand-${index}`} style={filled("skin", inked(0.7))} />
  </g>
);

export const Follower = () => {
  const id = useSvgId("leprechaun");
  return (
    <Stage creature={leprechaun} box={{ height: 140, width: 140, x: -70, y: -115 }} size={SIZE}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={inked(0.8)} />
      </defs>
      {[0, 1].map((index) => (
        <g key={`tail-${index}`} data-layer={`tail-${index}`}>
          {/* Darker than his breeches, all under the shade dots: a flap of coat, not a leg. */}
          <path data-part={`tail-${index}`} style={filled("festiveGreenShade")} />
          <path data-part={`tail-${index}`} fill={`url(#${id}-dots)`} />
          <path data-part={`tail-${index}`} style={stroked(inked(0.9))} />
        </g>
      ))}
      <Leg index={0} />
      <Leg index={1} />
      <g data-layer="torso">
        <Solid name="coat" id={id} fill="festiveGreen" shade="festiveGreenShade" ink={inked(1.1)} />
        <path data-part="belt" style={stroked(2.3, "screen")} />
        <path data-part="buttons" style={filled("gold", inked(0.4))} />
        <path data-part="belt-buckle" style={filled("gold", inked(0.5))} />
        <path data-part="belt-hole" style={filled("screen")} />
      </g>
      <Arm index={0} />
      <Arm index={1} />
      <g data-layer="head">
        <Solid name="head" id={id} fill="skin" shade="skinDark" ink={inked(1)} />
        <Shaded name="hair" id={id} fill="pumpkin" shade="pumpkinShade" by={1.1} ink={inked(0.7)} />
        {/* His ears, standing out from his head over his hair (and under his beard, on the face). */}
        {[0, 1].map((index) => (
          <g key={`ear-${index}`} data-part={`ear-${index}-shown`}>
            <path data-part={`ear-${index}`} style={filled("skin")} />
            <path data-part={`ear-${index}-rim`} style={stroked(inked(0.45))} />
          </g>
        ))}
      </g>
      <g data-layer="face">
        {/* Ink round the jaw's beard and its point together, under both, so the seam's covered. */}
        <path data-part="beard" style={stroked(inked(2))} />
        <path data-part="tuft" style={stroked(inked(2))} />
        <Shaded name="beard" id={id} fill="pumpkin" shade="pumpkinShade" by={0.7} />
        <Shaded name="tuft" id={id} fill="pumpkin" shade="pumpkinShade" by={0.7} />
        <path data-part="mouth" style={stroked(inked(0.7))} />
        {[0, 1].map((index) => (
          <path
            key={`moustache-${index}`}
            data-part={`moustache-${index}`}
            style={filled("pumpkin", inked(0.5))}
          />
        ))}
        <path data-part="nose" style={filled("accentPink", inked(0.5))} />
        {[0, 1].map((index) => (
          <g key={`eye-${index}`}>
            <path data-part={`cheek-${index}`} style={filled("accentPink")} />
            <path data-part={`eye-${index}`} style={filled("screen")} />
            <path data-part={`lid-${index}`} style={{ ...stroked(inked(0.7)), opacity: 0 }} />
            <path data-part={`brow-${index}`} style={stroked(0.9, "pumpkinShade")} />
          </g>
        ))}
      </g>
      <g data-layer="hat">
        <Solid name="brim" id={id} fill="festiveGreen" shade="festiveGreenShade" ink={inked(0.9)} />
        <Shaded
          name="crown"
          id={id}
          fill="festiveGreen"
          shade="festiveGreenShade"
          by={1.3}
          ink={inked(0.9)}
        />
        <path data-part="band" style={stroked(1.9, "screen")} />
        <path data-part="hat-buckle" style={filled("gold", inked(0.5))} />
        <path data-part="hat-hole" style={filled("screen")} />
        <path data-part="crown-top" style={filled("festiveGreen", inked(0.9))} />
      </g>
      <g data-layer="coin">
        <g data-part="coin" style={{ opacity: 0 }}>
          <path data-part="coin-back" style={filled("goldShade", inked(0.5))} />
          <path data-part="coin-face" style={filled("gold")} />
        </g>
      </g>
    </Stage>
  );
};
