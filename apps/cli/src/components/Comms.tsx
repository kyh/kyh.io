import { TextAttributes } from "@opentui/core";

import type { ContactLink } from "../data/content";
import { color } from "../lib/theme";
import { pad } from "../lib/utils";
import { Panel } from "./Panel";

type CommsProps = {
  links: ContactLink[];
  selectedIndex: number;
  innerWidth: number;
};

const LABEL_WIDTH = 12;

export function Comms({ links, selectedIndex, innerWidth }: CommsProps) {
  return (
    <Panel title="COMMS // UPLINK" bottomTitle="ENCRYPTED" flexGrow={1}>
      <box flexDirection="column" paddingTop={1}>
        <text fg={color.faint}>SELECT A CHANNEL TO ESTABLISH CONNECTION</text>
        <box paddingTop={1} flexDirection="column">
          {links.map((link, i) => {
            const selected = i === selectedIndex;
            const label = link.label.toUpperCase().padEnd(LABEL_WIDTH);

            if (selected) {
              return (
                <box key={link.label} flexDirection="row" width={innerWidth} backgroundColor={color.accent}>
                  <text bg={color.accent} fg={color.black}>{"▶ "}</text>
                  <text bg={color.accent} fg={color.black} attributes={TextAttributes.BOLD}>
                    {label}
                  </text>
                  <text bg={color.accent} fg={color.black}>
                    {pad(link.value, Math.max(0, innerWidth - LABEL_WIDTH - 2))}
                  </text>
                </box>
              );
            }

            return (
              <box key={link.label} flexDirection="row">
                <text fg={color.ghost}>{"  "}</text>
                <text fg={color.accentDim}>{label}</text>
                <text fg={color.dim}>{pad(link.value, Math.max(0, innerWidth - LABEL_WIDTH - 2))}</text>
              </box>
            );
          })}
        </box>
      </box>
    </Panel>
  );
}
