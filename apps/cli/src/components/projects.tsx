import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import { projects } from "../data/content";
import { box, nav, colors, BOX_WIDTH, PROJECT_INNER_WIDTH, PROJECT_CONTENT_WIDTH, PROJECT_TITLE_WIDTH, PROJECT_BADGE_WIDTH } from "../lib/theme";
import type { ViewProps } from "../lib/types";
import { openUrl, wrapProjectText, centerText } from "../lib/utils";
import { Layout } from "./layout";

export function Projects({ onBack }: ViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const project = projects[currentIndex]!;

  useKeyboard((key) => {
    switch (key.name) {
      case "left":
      case "h":
        setCurrentIndex((i) => (i > 0 ? i - 1 : projects.length - 1));
        break;
      case "right":
      case "l":
        setCurrentIndex((i) => (i < projects.length - 1 ? i + 1 : 0));
        break;
      case "return":
        openUrl(project.url);
        break;
      case "escape":
      case "q":
        onBack();
        break;
    }
  });

  const dots = projects
    .map((_, i) => (i === currentIndex ? nav.dotFilled : nav.dotEmpty))
    .join(" ");

  const typeBadge = project.type === "work" ? "[work]" : "[project]";

  return (
    <Layout
      title="Projects"
      footer={<text fg={colors.dim}>{`  ${nav.arrowLeft}${nav.arrowRight} browse   enter open   esc back`.padEnd(BOX_WIDTH)}</text>}
    >
      {/* Inner card */}
      <text>{box.vertical}  {box.innerTopLeft}{box.horizontal.repeat(PROJECT_INNER_WIDTH)}{box.innerTopRight}  {box.vertical}</text>
      <text>{box.vertical}  {box.vertical}  {project.title.padEnd(PROJECT_TITLE_WIDTH)}{typeBadge.padStart(PROJECT_BADGE_WIDTH)}  {box.vertical}  {box.vertical}</text>
      <text>{box.vertical}  {box.vertical}{" ".repeat(PROJECT_INNER_WIDTH)}{box.vertical}  {box.vertical}</text>

      {wrapProjectText(project.description, PROJECT_CONTENT_WIDTH).map((line, i) => (
        <text key={i}>{box.vertical}  {box.vertical}  {line.padEnd(PROJECT_CONTENT_WIDTH)}  {box.vertical}  {box.vertical}</text>
      ))}

      <text>{box.vertical}  {box.vertical}{" ".repeat(PROJECT_INNER_WIDTH)}{box.vertical}  {box.vertical}</text>
      <text>{box.vertical}  {box.innerBottomLeft}{box.horizontal.repeat(PROJECT_INNER_WIDTH)}{box.innerBottomRight}  {box.vertical}</text>
      <text>{box.vertical}{" ".repeat(BOX_WIDTH)}{box.vertical}</text>

      {/* Navigation */}
      <box flexDirection="row">
        <text>{box.vertical}</text>
        <text fg={colors.dim}>  {centerText(dots, BOX_WIDTH - 4)}  </text>
        <text>{box.vertical}</text>
      </box>
      <box flexDirection="row">
        <text>{box.vertical}</text>
        <text fg={colors.dim}>  {centerText(`${currentIndex + 1}/${projects.length} projects`, BOX_WIDTH - 4)}  </text>
        <text>{box.vertical}</text>
      </box>
    </Layout>
  );
}
