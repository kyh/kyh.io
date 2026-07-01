import { TextAttributes } from "@opentui/core";

import { callsign, name, profile } from "../data/content";
import { color } from "../lib/theme";
import { wrapText } from "../lib/utils";
import { Panel } from "./Panel";

type IdentityProps = {
  hero: string;
  innerWidth: number;
};

export function Identity({ hero, innerWidth }: IdentityProps) {
  const bioLines = wrapText(hero, innerWidth);

  return (
    <Panel title="IDENTITY" flexGrow={1}>
      <box flexDirection="column" paddingTop={1}>
        <ascii-font text={callsign} font="block" color={color.accent} />
        <box flexDirection="row" paddingTop={1}>
          <text attributes={TextAttributes.BOLD} fg={color.text}>
            {name.toUpperCase()}
          </text>
        </box>
        <text fg={color.dim}>{profile.role}</text>
        <box paddingTop={1} flexDirection="column">
          {bioLines.map((line) => (
            <text key={line} fg={color.faint}>
              {line}
            </text>
          ))}
        </box>
      </box>
    </Panel>
  );
}
