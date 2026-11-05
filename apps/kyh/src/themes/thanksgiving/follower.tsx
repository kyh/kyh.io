"use client";

// What follows a mouse at Thanksgiving: a wild tom turkey (`turkey.ts`),
// built in the round (`turkey-pose.ts`) and drawn in the showcase town's hand
// as the theme's pieces are (`piece.tsx`): flat faces, each solid's side from
// the light in its shade under the shade dots, ink round the outside. A bronze
// body and wings, the wings barred pale, tail feathers banded dark and tipped
// buff, a red neck up to a bare blue head with a red snood and wattle, a pale
// beak, a dark beard and pink legs. Each `data-layer` is one part the stage
// stacks by how near the camera it is; each `data-part` is posed a frame at a
// time.
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

export const Follower = () => {
  const id = useSvgId("turkey");
  return (
    <Stage creature={turkey} box={{ height: 150, width: 170, x: -85, y: -120 }} size={SIZE}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={ink(1)} />
      </defs>
      {(["roofPink", "roofPinkShade"] as const).map((token, index) => (
        <g key={`leg-${index}`} data-layer={`leg-${index}`}>
          <path data-part={`leg-${index}`} style={stroked(1.9 + ink(1.5))} />
          <path data-part={`leg-${index}`} style={stroked(1.9, token)} />
        </g>
      ))}
      {Array.from({ length: FEATHERS }, (_, index) => (
        <g key={`feather-${index}`} data-layer={`feather-${index}`}>
          <path
            data-part={`feather-${index}`}
            style={filled(index % 2 === 0 ? "bronze" : "bronzeShade", ink(0.9))}
          />
          <path data-part={`band-${index}`} style={filled("screen")} />
          <path data-part={`tip-${index}`} style={filled("hay", ink(0.6))} />
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
        <Solid name="body" id={id} fill="bronze" shade="bronzeShade" ink={ink(1.4)} />
        <path data-part="beard" style={stroked(1.6, "screen")} />
      </g>
      <g data-layer="head">
        <path data-part="neck" style={stroked(5.2 + ink(2.4))} />
        <path data-part="neck" style={stroked(5.2, "accentRed")} />
        <Flesh name="wattle" width={3.2} />
        <Solid name="head" id={id} fill="roofBlue" shade="roofBlueShade" ink={ink(1)} />
        {[0, 1].map((index) => (
          <g key={`eye-${index}`}>
            <path data-part={`eye-${index}`} style={filled("screen")} />
            <path data-part={`lid-${index}`} style={{ ...stroked(ink(0.8)), opacity: 0 }} />
          </g>
        ))}
        <path data-part="beak" style={filled("hay", ink(0.8))} />
        <Flesh name="snood" width={2.2} />
      </g>
    </Stage>
  );
};
