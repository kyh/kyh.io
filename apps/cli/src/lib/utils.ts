import { exec } from "child_process";
import { platform } from "os";

export function openUrl(url: string): void {
  const cmd = platform() === "win32" ? "start" : platform() === "darwin" ? "open" : "xdg-open";
  exec(`${cmd} "${url}"`);
}

export function hostFromUrl(url: string): string {
  try {
    if (url.startsWith("mailto:")) return url.slice("mailto:".length);
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function truncate(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text;
  if (width <= 1) return text.slice(0, width);
  return text.slice(0, width - 1) + "…";
}

export function pad(text: string, width: number): string {
  return truncate(text, width).padEnd(width);
}

const pad2 = (n: number) => n.toString().padStart(2, "0");

// Elapsed time since a start timestamp, formatted HH:MM:SS.
export function formatUptime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function formatClock(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
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
