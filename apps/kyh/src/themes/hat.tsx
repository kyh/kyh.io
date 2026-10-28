"use client";

// The theme's hat, worn tilted on the corner of the homepage's icon: the hat
// the showcase's town draws for it, a witch's at Halloween, Santa's at
// Christmas, pictured on the server (`hat-pictures.ts`). The picture's origin
// is the brim's middle, so that's the point set on the corner.
import type { HatPictures } from "./hat-pictures";
import { useTheme } from "./store";

/** Pixels to a picture unit (a town cell is 100). */
const SCALE = 0.32;
const TILT = 20;

export const ThemeHat = ({ pictures }: { pictures: HatPictures }) => {
  const picture = pictures[useTheme()];
  if (!picture) {
    return null;
  }
  const [left, top, width, height] = picture.box;
  return (
    <span
      className="pointer-events-none absolute top-[5px] right-[7px] size-0"
      style={{ rotate: `${TILT}deg` }}
      aria-hidden="true"
    >
      <svg
        viewBox={picture.box.join(" ")}
        className="absolute overflow-visible"
        style={{
          height: height * SCALE,
          left: left * SCALE,
          top: top * SCALE,
          width: width * SCALE,
        }}
      >
        <g strokeLinecap="round" strokeLinejoin="round">
          {picture.layers.map((layer, index) =>
            layer.kind === "faces" ? (
              // A hairline of the face's own color closes the seams between facets.
              <path
                key={index}
                d={layer.d}
                fill={layer.fill}
                stroke={layer.fill}
                strokeWidth={0.4}
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <path
                key={index}
                d={layer.d}
                fill="none"
                stroke={layer.stroke}
                strokeWidth={layer.width}
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}
        </g>
      </svg>
    </span>
  );
};
