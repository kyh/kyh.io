// A part of a follower in the round drawn as the town draws a solid: all of it
// in its shade color under the shade dots, then its lit part (`<name>-lit`,
// from `solidPaths` in `solid.ts`) over that, kept inside it, and ink round it.
import type { Token } from "@/app/showcase/_components/city/palette";
import { filled, stroked } from "./ink";

/**
 * A shaded solid named `name`. `id` is the drawing's own (`useSvgId`), whose
 * shade dots are `<id>-dots`. Without `ink` it isn't inked round, for a part
 * that shares an outline drawn under it.
 */
export const Solid = ({
  name,
  id,
  fill,
  shade,
  ink,
}: {
  name: string;
  id: string;
  fill: Token;
  shade: Token;
  ink?: number;
}) => (
  <>
    <clipPath id={`${id}-${name}`}>
      <path data-part={name} />
    </clipPath>
    <path data-part={name} style={filled(shade)} />
    <path data-part={name} fill={`url(#${id}-dots)`} />
    <path data-part={`${name}-lit`} style={filled(fill)} clipPath={`url(#${id}-${name})`} />
    {ink === undefined ? null : <path data-part={name} style={stroked(ink)} />}
  </>
);
