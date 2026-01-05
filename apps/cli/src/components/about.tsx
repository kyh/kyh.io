import { useKeyboard } from "@opentui/react";
import { about } from "../data/content";
import { box, colors, BOX_WIDTH } from "../lib/theme";
import type { ViewProps } from "../lib/types";
import { wrapText } from "../lib/utils";
import { Layout } from "./layout";

export function About({ onBack }: ViewProps) {
  useKeyboard((key) => {
    if (key.name === "escape" || key.name === "q") {
      onBack();
    }
  });

  const bioLines = wrapText(about.bio, BOX_WIDTH - 4);

  return (
    <Layout
      title="About"
      footer={<text fg={colors.dim}>{"  esc back".padEnd(BOX_WIDTH)}</text>}
    >
      <text>{box.vertical}  {about.name.padEnd(BOX_WIDTH - 2)}{box.vertical}</text>
      <box flexDirection="row">
        <text>{box.vertical}</text>
        <text fg={colors.muted}>  {about.tagline.padEnd(BOX_WIDTH - 2)}</text>
        <text>{box.vertical}</text>
      </box>
      <text>{box.vertical}{" ".repeat(BOX_WIDTH)}{box.vertical}</text>
      {bioLines.map((line, i) => (
        <text key={i}>{box.vertical}  {line.padEnd(BOX_WIDTH - 2)}{box.vertical}</text>
      ))}
    </Layout>
  );
}
