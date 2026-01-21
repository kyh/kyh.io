import { exec } from "child_process";
import { platform } from "os";

export function openUrl(url: string): void {
  const cmd =
    platform() === "win32"
      ? "start"
      : platform() === "darwin"
        ? "open"
        : "xdg-open";
  exec(`${cmd} "${url}"`);
}

export function wrapText(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}
