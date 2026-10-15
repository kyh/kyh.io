// Clawd as Claude Code draws it at launch: a 1-bit sprite, each pixel a
// little taller than wide like a terminal cell.
const BITS = [
  "000111111111111000",
  "000110111111011000",
  "011111111111111110",
  "000111111111111000",
  "000010100001010000",
];
const CELL_HEIGHT = 2.4;

const runs = BITS.flatMap((row, y) =>
  [...row.matchAll(/1+/gu)].map((match) => ({ length: match[0].length, x: match.index, y })),
);

export const ClawdSprite = ({ scale = 3 }: { scale?: number }) => (
  <svg
    aria-hidden="true"
    className="sprite"
    height={BITS.length * CELL_HEIGHT * scale}
    viewBox={`0 0 ${BITS[0]?.length ?? 0} ${BITS.length * CELL_HEIGHT}`}
    width={(BITS[0]?.length ?? 0) * scale}
  >
    {runs.map((run) => (
      <rect
        height={CELL_HEIGHT}
        key={`${run.x}-${run.y}`}
        width={run.length}
        x={run.x}
        y={run.y * CELL_HEIGHT}
      />
    ))}
  </svg>
);
