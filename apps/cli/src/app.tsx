import { useState } from "react";
import { Box, useApp, useInput, useWindowSize } from "ink";

import packageJson from "../package.json" with { type: "json" };

import { Comms } from "./components/comms";
import { Directory } from "./components/directory";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { Identity } from "./components/identity";
import { StatusPanel } from "./components/status-panel";
import { Telemetry } from "./components/telemetry";
import { contactLinks, heroText, projects, work } from "./data/content";
import { useClock } from "./lib/hooks";
import { color } from "./lib/theme";
import { formatClock, formatUptime, openUrl, wrapText } from "./lib/utils";

const LEFT_WIDTH = 40;
const LEFT_MIN_WIDTH = 96;
const LEFT_MIN_HEIGHT = 36;
const GLOBE_MIN_HEIGHT = 7;
const GLOBE_MAX_HEIGHT = 13;
const LAYOUT_CHROME = 4;
const IDENTITY_CHROME = 13;
const STATUS_HEIGHT = 11;
const GLOBE_PANEL_CHROME = 2;

const allItems = [...projects, ...work];

const sections = [
  { items: projects, label: "PROJECTS" },
  { items: work, label: "EMPLOYMENT" },
];

export const App = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [contactIndex, setContactIndex] = useState(0);
  const { columns: termWidth, rows: termHeight } = useWindowSize();
  const { exit } = useApp();
  const { now, uptime } = useClock();

  useInput((input, key) => {
    const up = key.upArrow || input === "k";
    const down = key.downArrow || input === "j";

    if (showContact) {
      if (up) {
        setContactIndex((i) => (i > 0 ? i - 1 : contactLinks.length - 1));
      } else if (down) {
        setContactIndex((i) => (i < contactLinks.length - 1 ? i + 1 : 0));
      } else if (key.return) {
        const link = contactLinks[contactIndex];

        if (link) {
          openUrl(link.url);
        }
      } else if (key.escape || input === "c") {
        setShowContact(false);
        setContactIndex(0);
      } else if (input === "q") {
        exit();
      }

      return;
    }

    if (up) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : allItems.length - 1));
    } else if (down) {
      setSelectedIndex((i) => (i < allItems.length - 1 ? i + 1 : 0));
    } else if (key.return) {
      const item = allItems[selectedIndex];

      if (item) {
        openUrl(item.url);
      }
    } else if (input === "c") {
      setShowContact(true);
    } else if (key.escape || input === "q") {
      exit();
    }
  });

  const showLeft = termWidth >= LEFT_MIN_WIDTH && termHeight >= LEFT_MIN_HEIGHT;
  const usable = termWidth - 2;
  const mainWidth = showLeft ? usable - LEFT_WIDTH : usable;
  const mainInner = Math.max(0, mainWidth - 4);
  const leftInner = Math.max(0, LEFT_WIDTH - 1 - 4);
  const bioLines = wrapText(heroText, leftInner).length;

  const globeHeight = Math.min(
    GLOBE_MAX_HEIGHT,
    termHeight - (LAYOUT_CHROME + IDENTITY_CHROME + bioLines + GLOBE_PANEL_CHROME + STATUS_HEIGHT),
  );

  const showGlobe = showLeft && globeHeight >= GLOBE_MIN_HEIGHT;
  const maxRows = Math.max(1, termHeight - 9);

  const target = showContact ? contactLinks[contactIndex]?.url : allItems[selectedIndex]?.url;

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
    <Box
      flexDirection="column"
      width={termWidth}
      height={termHeight}
      backgroundColor={color.bg}
      paddingLeft={1}
      paddingRight={1}
    >
      <Header clock={formatClock(now)} version={packageJson.version} />

      <Box flexDirection="row" flexGrow={1} paddingTop={0}>
        {showLeft && (
          <Box flexDirection="column" width={LEFT_WIDTH} paddingRight={1}>
            <Identity hero={heroText} innerWidth={leftInner} />
            {showGlobe && <Telemetry innerWidth={leftInner} globeHeight={globeHeight} />}
            <StatusPanel
              uptime={formatUptime(uptime)}
              entries={allItems.length}
              online
              innerWidth={leftInner}
            />
          </Box>
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
      </Box>

      <Footer keys={footerKeys} target={target} width={termWidth} />
    </Box>
  );
};
