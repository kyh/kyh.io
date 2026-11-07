// The way the dragon's head has swum (`dragon-swim.ts`): marks laid a fixed
// distance apart along the ground, each with the height and the roll it went
// by at. Its body lies along this, so every ring goes where the head went,
// over what it went over and rolled as it rolled, and nothing of it cuts a
// corner. Marks are spaced by distance, not time, so the same swim lays the
// same trail at any frame rate. In ground pixels. Pure (state is stepped in
// place, for a frame's sake).

export interface Mark {
  x: number;
  z: number;
  /** Pixels up, and how far it was rolled (radians) as it went by. */
  h: number;
  roll: number;
}

export interface Trail {
  /** Where the head is now: the trail's live end. */
  head: Mark;
  /** Newest first, `SPACING` apart. */
  marks: Mark[];
  /** How far the head's gone past the newest mark. */
  since: number;
}

const SPACING = 2;

const between = (a: Mark, b: Mark, t: number): Mark => ({
  h: a.h + (b.h - a.h) * t,
  roll: a.roll + (b.roll - a.roll) * t,
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
});

/** A trail `reach` long, straight back from `head` along `heading`. */
export const createTrail = (head: Mark, heading: number, reach: number): Trail => ({
  head,
  marks: Array.from({ length: Math.ceil(reach / SPACING) + 2 }, (_, index) => ({
    ...head,
    x: head.x - Math.cos(heading) * index * SPACING,
    z: head.z - Math.sin(heading) * index * SPACING,
  })),
  since: 0,
});

/** The head moved on to `to`: a mark laid at each `SPACING` it passed. */
export const extendTrail = (trail: Trail, to: Mark) => {
  const from = trail.head;
  const moved = Math.hypot(to.x - from.x, to.z - from.z);
  let laid = SPACING - trail.since;
  while (laid <= moved) {
    trail.marks.unshift(between(from, to, laid / moved));
    trail.marks.pop();
    laid += SPACING;
  }
  trail.since = SPACING - (laid - moved);
  trail.head = to;
};

/** Where the trail lies `behind` pixels back along it from the head. */
export const trailAt = (trail: Trail, behind: number): Mark => {
  const [newest = trail.head] = trail.marks;
  if (behind <= trail.since) {
    return between(trail.head, newest, trail.since > 0 ? behind / trail.since : 0);
  }
  const along = (behind - trail.since) / SPACING;
  const index = Math.min(Math.floor(along), trail.marks.length - 2);
  const near = trail.marks[index] ?? newest;
  return between(near, trail.marks[index + 1] ?? near, along - index);
};
