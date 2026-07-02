import { Fragment } from "react";

import { TextAttributes } from "@opentui/core";

import { profile } from "../data/content";
import { color } from "../lib/theme";
import { Panel } from "./Panel";
import { Waves } from "./Waves";

type StatusPanelProps = {
  uptime: string;
  entries: number;
  online: boolean;
  innerWidth: number;
};

const LABEL_WIDTH = 10;

function Readout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <box flexDirection="row">
      <text fg={color.faint}>{label.padEnd(LABEL_WIDTH)}</text>
      {children}
    </box>
  );
}

export function StatusPanel({ uptime, entries, online, innerWidth }: StatusPanelProps) {
  return (
    <Panel title="STATUS">
      <box flexDirection="column" paddingTop={0}>
        <Readout label="UPTIME">
          <text fg={color.text}>{uptime}</text>
        </Readout>
        <Readout label="LOCATION">
          <text fg={color.dim}>{profile.location}</text>
        </Readout>
        <Readout label="CHANNEL">
          <text fg={color.dim}>{profile.channel}</text>
        </Readout>
        <Readout label="ENTRIES">
          <text fg={color.dim}>{`${entries} INDEXED`}</text>
        </Readout>
        <Readout label="LINK">
          <Fragment>
            <text fg={online ? color.accent : color.dim}>{online ? "● " : "○ "}</text>
            <text attributes={TextAttributes.BOLD} fg={online ? color.accent : color.dim}>
              {online ? "SECURE" : "OFFLINE"}
            </text>
          </Fragment>
        </Readout>
        <box flexDirection="row" paddingTop={1}>
          <text fg={color.faint}>{"SIGNAL".padEnd(LABEL_WIDTH)}</text>
          <Waves width={Math.max(0, innerWidth - LABEL_WIDTH)} height={2} />
        </box>
      </box>
    </Panel>
  );
}
