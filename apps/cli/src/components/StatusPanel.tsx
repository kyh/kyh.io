import { Fragment } from "react";

import { TextAttributes } from "@opentui/core";

import { profile } from "../data/content";
import { color } from "../lib/theme";
import { Panel } from "./Panel";

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

// Deterministic "barcode" strip — pure decoration echoing the data-transfer
// readouts from the reference art.
function barcode(width: number): string {
  const blocks = "▏▎▍▌▋";
  let out = "";
  for (let i = 0; i < width; i++) {
    // cheap deterministic pseudo-noise, no Date/random needed
    const n = (i * 2654435761) >>> 0;
    out += n % 5 === 0 ? " " : blocks[n % blocks.length];
  }
  return out;
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
        <box paddingTop={1}>
          <text fg={color.ghost}>{barcode(innerWidth)}</text>
        </box>
      </box>
    </Panel>
  );
}
