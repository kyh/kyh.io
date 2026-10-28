"use client";

// What hangs in the page's top corners in a theme that has it: cobwebs at
// Halloween (`web.ts`), a spider on each, one walking round its web and one
// dropping on its thread and climbing back. CSS-animated (global.css), under
// the dock and the cursors; a visitor who'd rather not see motion gets the
// spiders sitting still.
import { themeOf } from "./index";
import { useTheme } from "./store";
import { HANG, HIP, spiderLegs, WALK, WEB_PATH, WEB_SIZE } from "./web";

const Spider = () => (
  <svg viewBox="0 0 24 24" className="block size-full overflow-visible">
    {([0, 1] as const).map((gait) => (
      <path key={gait} d={spiderLegs(gait)} className="spider-legs" data-gait={gait} />
    ))}
    <ellipse cx={9.4} cy={HIP[1]} rx={4.2} ry={3.4} className="spider-body" />
    <circle cx={15.4} cy={HIP[1]} r={2.1} className="spider-body" />
  </svg>
);

const Web = ({ side }: { side: "left" | "right" }) => (
  <div className="theme-corner" data-side={side} style={{ height: WEB_SIZE, width: WEB_SIZE }}>
    <div className="theme-corner-mirror">
      <svg viewBox={`0 0 ${WEB_SIZE} ${WEB_SIZE}`} className="block size-full overflow-visible">
        <path d={WEB_PATH} className="theme-web" />
      </svg>
      {side === "left" ? (
        <span className="spider spider-walk" style={{ offsetPath: `path("${WALK}")` }}>
          <Spider />
        </span>
      ) : (
        <span className="spider-hang" style={{ left: HANG.x, top: HANG.y }}>
          <span className="spider-thread" />
          <span className="spider spider-drop">
            <Spider />
          </span>
        </span>
      )}
    </div>
  </div>
);

export const ThemeCorners = () => {
  const { corners } = themeOf(useTheme());
  if (corners === null) {
    return null;
  }
  return (
    <div className="theme-corners" data-corners={corners} aria-hidden="true">
      <Web side="left" />
      <Web side="right" />
    </div>
  );
};
