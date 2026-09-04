// The UI's icons, drawn on a 10×10 grid instead of typed. Unicode glyphs
// come from whichever fallback font has them, each with its own ink offset,
// so a ✕ sits on the baseline and a ▁ fills the box; an SVG in currentColor
// lands the same in every button and stays crisp at 8 to 12px.

const GLYPHS = {
  minimize: <rect x="2" y="7" width="6" height="2" />,
  maximize: <path fillRule="evenodd" d="M1 1h8v8H1zM2 3h6v5H2z" />,
  close: (
    <path
      d="M2 2l6 6M8 2l-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
    />
  ),
  pause: <path d="M2 1h2v8H2zM6 1h2v8H6z" />,
  play: <path d="M2 1l7 4-7 4z" />,
  "sound-on": (
    <>
      <path d="M1 3.5h2L6 1v8L3 6.5H1z" />
      <path
        d="M7.5 3.5a2.2 2.2 0 0 1 0 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </>
  ),
  "sound-off": (
    <>
      <path d="M1 3.5h2L6 1v8L3 6.5H1z" />
      <path
        d="M7 3.5l3 3M10 3.5l-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
      />
    </>
  ),
  up: <path d="M5 2l4 5H1z" />,
  down: <path d="M1 3h8l-4 5z" />,
} as const;

export type GlyphName = keyof typeof GLYPHS;

type GlyphProps = {
  name: GlyphName;
  /** Rendered size in CSS pixels. */
  size?: number;
};

export const Glyph = (props: GlyphProps) => (
  <svg
    viewBox="0 0 10 10"
    width={props.size ?? 10}
    height={props.size ?? 10}
    fill="currentColor"
    aria-hidden
    className="block shrink-0"
  >
    {GLYPHS[props.name]}
  </svg>
);
