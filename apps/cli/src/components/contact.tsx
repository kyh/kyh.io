import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import { about } from "../data/content";
import { box, nav, colors, BOX_WIDTH, CONTACT_LABEL_WIDTH, CONTACT_URL_WIDTH } from "../lib/theme";
import type { ViewProps } from "../lib/types";
import { openUrl } from "../lib/utils";
import { Layout } from "./layout";

const links = [
  { key: "website", label: "Website", url: about.links.website },
  { key: "github", label: "GitHub", url: about.links.github },
  { key: "x", label: "X", url: about.links.twitter },
  { key: "linkedin", label: "LinkedIn", url: about.links.linkedin },
  { key: "email", label: "Email", url: `mailto:${about.links.email}` },
];

export function Contact({ onBack }: ViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useKeyboard((key) => {
    switch (key.name) {
      case "up":
      case "k":
        setSelectedIndex((i) => (i > 0 ? i - 1 : links.length - 1));
        break;
      case "down":
      case "j":
        setSelectedIndex((i) => (i < links.length - 1 ? i + 1 : 0));
        break;
      case "return": {
        const link = links[selectedIndex];
        if (link) openUrl(link.url);
        break;
      }
      case "escape":
      case "q":
        onBack();
        break;
    }
  });

  return (
    <Layout
      title="Contact"
      footer={<text fg={colors.dim}>{`  ${nav.arrowUp}${nav.arrowDown} navigate   enter open   esc back`.padEnd(BOX_WIDTH)}</text>}
    >
      {links.map((link, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? nav.selected : " ";
        const label = `${prefix} ${link.label}`.padEnd(CONTACT_LABEL_WIDTH);
        const url = link.url.replace("mailto:", "").replace("https://", "").replace("www.", "");

        return (
          <text key={link.key} fg={isSelected ? colors.highlight : undefined}>
            {box.vertical}  {label}{url.padEnd(CONTACT_URL_WIDTH)}{box.vertical}
          </text>
        );
      })}
    </Layout>
  );
}
