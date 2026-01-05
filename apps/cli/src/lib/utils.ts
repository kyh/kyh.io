import { exec } from "child_process";
import { platform } from "os";

export function openUrl(url: string): void {
  const cmd = platform() === "win32" ? "start" : platform() === "darwin" ? "open" : "xdg-open";
  exec(`${cmd} "${url}"`);
}

export function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ");
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
  }

  return lines;
}

export function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(padding) + text + " ".repeat(width - padding - text.length);
}

export function wrapProjectText(text: string, width: number): string[] {
  const lines = wrapText(text, width);
  while (lines.length < 2) lines.push("");
  return lines.slice(0, 3);
}
