"use client";

// What follows a mouse at Christmas: an Adélie penguin in a red scarf
// (`penguin.ts`), built in the round (`penguin-pose.ts`) and drawn in the
// showcase town's hand as the theme's pieces are (`piece.tsx`): flat faces,
// each solid's side from the light in its shade under the shade dots, ink
// round the outside. A black body and head drawn as one, a white front, a
// white ring round each eye, a dark beak, black flippers, pink feet and a red
// scarf striped white. Each `data-layer` is one part the stage stacks by how
// near the camera it is; each `data-part` is posed a frame at a time.
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { penguin } from "./penguin";

/** Ink round the body and head together: drawn under both, so the seam between them is covered. */
const OUTLINE = 2.8;
/** The scarf's white stripes: short square dashes across the red. */
const STRIPES = {
  ...stroked(4.8, "white"),
  strokeDasharray: "1.4 3.6",
  strokeLinecap: "butt",
} as const;

const Eye = ({ index }: { index: number }) => (
  <>
    <path data-part={`ring-${index}`} style={filled("white", 0.5)} />
    <path data-part={`eye-${index}`} style={filled("screen")} />
    <path data-part={`lid-${index}`} style={{ ...stroked(0.9), opacity: 0 }} />
  </>
);

export const Follower = () => {
  const id = useSvgId("penguin");
  return (
    <Stage creature={penguin} box={{ height: 130, width: 150, x: -75, y: -100 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={0.9} />
      </defs>
      {[0, 1].map((index) => (
        <g key={`foot-${index}`} data-layer={`foot-${index}`}>
          <path
            data-part={`foot-${index}`}
            style={filled(index === 0 ? "accentPink" : "roofPinkShade", 0.8)}
          />
        </g>
      ))}
      <g data-layer="tail">
        <path data-part="tail" style={filled("screen", 1)} />
      </g>
      {[0, 1].map((index) => (
        <g key={`flipper-${index}`} data-layer={`flipper-${index}`}>
          <Solid name={`flipper-${index}`} id={id} fill="screen" shade="screen" ink={1} />
        </g>
      ))}
      <g data-layer="torso">
        <path data-part="body" style={stroked(OUTLINE)} />
        <path data-part="head" style={stroked(OUTLINE)} />
        <Solid name="body" id={id} fill="screen" shade="screen" />
        <Solid name="head" id={id} fill="screen" shade="screen" />
        {/* Its white front: the part of its body turned forward, shaded as the body is. */}
        <Solid name="front" id={id} fill="white" shade="whiteShade" ink={0.7} />
        <Eye index={0} />
        <Eye index={1} />
        <path data-part="scarf" style={stroked(6.8)} />
        <path data-part="scarf" style={stroked(4.8, "festiveRed")} />
        <path data-part="scarf" style={STRIPES} />
      </g>
      <g data-layer="beak">
        <path data-part="beak-lower" style={filled("screen", 0.6)} />
        <path data-part="beak-upper" style={filled("screen", 0.7)} />
      </g>
      <g data-layer="scarf-end">
        <path data-part="scarf-end" style={stroked(6)} />
        <path data-part="scarf-end" style={stroked(4, "festiveRed")} />
        <path data-part="scarf-end" style={{ ...STRIPES, strokeWidth: 4 }} />
      </g>
    </Stage>
  );
};
