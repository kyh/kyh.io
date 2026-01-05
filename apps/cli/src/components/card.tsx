import { about } from "../data/content";
import { box, colors } from "../lib/theme";

const CARD_WIDTH = 38;

export function Card() {
  return (
    <box flexDirection="column">
      <text>{box.topLeft}{box.horizontal.repeat(CARD_WIDTH)}{box.topRight}</text>
      <text>{box.vertical}  {about.name.padEnd(CARD_WIDTH - 2)}{box.vertical}</text>
      <box flexDirection="row">
        <text>{box.vertical}</text>
        <text fg={colors.muted}>  {about.tagline.padEnd(CARD_WIDTH - 2)}</text>
        <text>{box.vertical}</text>
      </box>
      <text>{box.vertical}{" ".repeat(CARD_WIDTH)}{box.vertical}</text>
      <text>{box.vertical}  {about.links.website.replace("https://", "").padEnd(CARD_WIDTH - 2)}{box.vertical}</text>
      <text>{box.vertical}  {about.links.github.replace("https://", "").padEnd(CARD_WIDTH - 2)}{box.vertical}</text>
      <text>{box.vertical}  {about.links.email.padEnd(CARD_WIDTH - 2)}{box.vertical}</text>
      <text>{box.bottomLeft}{box.horizontal.repeat(CARD_WIDTH)}{box.bottomRight}</text>
    </box>
  );
}
