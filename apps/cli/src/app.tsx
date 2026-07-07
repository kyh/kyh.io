import { useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";

import { Comms } from "./components/Comms";
import { Directory } from "./components/Directory";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Identity } from "./components/Identity";
import { StatusPanel } from "./components/StatusPanel";
import { Telemetry } from "./components/Telemetry";
import { contactLinks, heroText, projects, work } from "./data/content";
import { useClock } from "./lib/hooks";
import { color } from "./lib/theme";
import { formatClock, formatUptime, openUrl, wrapText } from "./lib/utils";

const VERSION = "0.1.3";
const LEFT_WIDTH = 40;
// The identity + status stack needs both room to the side and enough height to
// render without the two panels overlapping; below either, go full-width.
const LEFT_MIN_WIDTH = 96;
const LEFT_MIN_HEIGHT = 36;
// Taller terminals also get the gyroscope telemetry panel; it scales with
// whatever height is left over, within these bounds.
const GLOBE_MIN_HEIGHT = 7;
const GLOBE_MAX_HEIGHT = 13;
// Left-column row budget (see Identity/StatusPanel/Telemetry internals):
const LAYOUT_CHROME = 4; // header + footer
const IDENTITY_CHROME = 13; // border(2) + gap + logo(6) + gap + name + role + gap
const STATUS_HEIGHT = 11; // border(2) + gap + 5 readouts + gap + signal(2)
const GLOBE_PANEL_CHROME = 2; // border

const allItems = [...projects, ...work];
const sections = [
  { label: "PROJECTS", items: projects },
  { label: "EMPLOYMENT", items: work },
];

export function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [contactIndex, setContactIndex] = useState(0);
  const { width: termWidth, height: termHeight } = useTerminalDimensions();
  const { now, uptime } = useClock();

  useKeyboard((key) => {
    if (showContact) {
      switch (key.name) {
        case "up":
        case "k":
          setContactIndex((i) => (i > 0 ? i - 1 : contactLinks.length - 1));
          break;
        case "down":
        case "j":
          setContactIndex((i) => (i < contactLinks.length - 1 ? i + 1 : 0));
          break;
        case "return":
          openUrl(contactLinks[contactIndex]!.url);
          break;
        case "escape":
        case "c":
          setShowContact(false);
          setContactIndex(0);
          break;
        case "q":
          process.exit(0);
          break;
      }
      return;
    }

    switch (key.name) {
      case "up":
      case "k":
        setSelectedIndex((i) => (i > 0 ? i - 1 : allItems.length - 1));
        break;
      case "down":
      case "j":
        setSelectedIndex((i) => (i < allItems.length - 1 ? i + 1 : 0));
        break;
      case "return":
        openUrl(allItems[selectedIndex]!.url);
        break;
      case "c":
        setShowContact(true);
        break;
      case "escape":
      case "q":
        process.exit(0);
        break;
    }
  });

  const showLeft = termWidth >= LEFT_MIN_WIDTH && termHeight >= LEFT_MIN_HEIGHT;
  const usable = termWidth - 2;
  // left column carries a 1-col right gutter; each panel eats border(2)+padding(2)
  const mainWidth = showLeft ? usable - LEFT_WIDTH : usable;
  // clamp so tiny / zero-width terminals never yield negative child widths
  const mainInner = Math.max(0, mainWidth - 4);
  const leftInner = Math.max(0, LEFT_WIDTH - 1 - 4);
  // the gyroscope takes whatever height remains after the full (untruncated)
  // bio and status panel — shrinking down to its minimum before hiding
  // entirely; the bio never gets clipped for it
  const bioLines = wrapText(heroText, leftInner).length;
  const globeHeight = Math.min(
    GLOBE_MAX_HEIGHT,
    termHeight -
      (LAYOUT_CHROME + IDENTITY_CHROME + bioLines + GLOBE_PANEL_CHROME + STATUS_HEIGHT),
  );
  const showGlobe = showLeft && globeHeight >= GLOBE_MIN_HEIGHT;
  // row capacity = termHeight - header(2) - footer(2) - panel border(2)
  //   - column header(1) - two scroll-hint lines(2)
  const maxRows = Math.max(1, termHeight - 9);

  const target = showContact
    ? contactLinks[contactIndex]?.url
    : allItems[selectedIndex]?.url;

  const footerKeys = showContact
    ? [
        { keys: "↑↓", label: "NAV" },
        { keys: "⏎", label: "CONNECT" },
        { keys: "C/ESC", label: "BACK" },
        { keys: "Q", label: "QUIT" },
      ]
    : [
        { keys: "↑↓ jk", label: "NAV" },
        { keys: "⏎", label: "OPEN" },
        { keys: "C", label: "COMMS" },
        { keys: "Q", label: "QUIT" },
      ];

  return (
    <box
      flexDirection="column"
      width={termWidth}
      height={termHeight}
      backgroundColor={color.bg}
      paddingLeft={1}
      paddingRight={1}
    >
      <Header clock={formatClock(now)} version={VERSION} />

      <box flexDirection="row" flexGrow={1} paddingTop={0}>
        {showLeft && (
          <box flexDirection="column" width={LEFT_WIDTH} paddingRight={1}>
            <Identity hero={heroText} innerWidth={leftInner} />
            {showGlobe && <Telemetry innerWidth={leftInner} globeHeight={globeHeight} />}
            <StatusPanel
              uptime={formatUptime(uptime)}
              entries={allItems.length}
              online
              innerWidth={leftInner}
            />
          </box>
        )}

        {showContact ? (
          <Comms links={contactLinks} selectedIndex={contactIndex} innerWidth={mainInner} />
        ) : (
          <Directory
            sections={sections}
            selectedIndex={selectedIndex}
            innerWidth={mainInner}
            maxRows={maxRows}
          />
        )}
      </box>

      <Footer keys={footerKeys} target={target} width={termWidth} />
    </box>
  );
}
