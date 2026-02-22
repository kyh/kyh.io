import type { GuessFeedback } from "@/db/zod-schema";

function feedbackToEmoji(guess: GuessFeedback): string {
  if (guess.isCorrect) return "\u{1f7e9}\u{1f7e9}\u{1f7e9}\u{1f7e9}";

  const sector = guess.sectorMatch ? "\u{1f7e9}" : "\u{2b1c}";
  const cap =
    guess.marketCapDirection === "correct"
      ? "\u{1f7e9}"
      : guess.marketCapDirection === "higher"
        ? "\u{2b06}\u{fe0f}"
        : "\u{2b07}\u{fe0f}";
  const emp =
    guess.employeeDirection === "correct"
      ? "\u{1f7e9}"
      : guess.employeeDirection === "higher"
        ? "\u{2b06}\u{fe0f}"
        : "\u{2b07}\u{fe0f}";
  const ipo =
    guess.ipoYearDirection === "correct"
      ? "\u{1f7e9}"
      : guess.ipoYearDirection === "higher"
        ? "\u{2b06}\u{fe0f}"
        : "\u{2b07}\u{fe0f}";

  return `${sector}${cap}${emp}${ipo}`;
}

export function buildShareText(
  puzzleNumber: number,
  guesses: GuessFeedback[],
  won: boolean,
): string {
  const score = won ? `${guesses.length}/6` : "X/6";
  const grid = guesses.map(feedbackToEmoji).join("\n");
  return `Stonksville #${puzzleNumber} ${score}\n\n${grid}\n\nhttps://stonksville.com`;
}

export async function copyShareText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
