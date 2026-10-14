// What people say on their way out of each project. A project without lines
// of its own gets its kind's.
import type { ProjectKind } from "./draw-landmarks";

const BY_SLUG = new Map<string, readonly string[]>([
  ["ai-canvas", ["Sketched it, AI finished it.", "My whiteboard has ideas now."]],
  ["ai-coms", ["Inbox zero, finally.", "Replies wrote themselves."]],
  ["ai-datagrid", ["Spreadsheets that think!", "Formulas? Just asked."]],
  ["ai-notes", ["My notes tidy themselves.", "Never losing a thought again."]],
  ["ai-schedule", ["My calendar planned my day.", "Meetings sorted. Lunch is mine."]],
  [
    "autoplay",
    ["My feed is a sitcom now.", "Can't stop watching my inbox.", "Channel 1 is so good."],
  ],
  [
    "clawders",
    ["New high score while I waited!", "Clawd ran the whole build.", "Keep running, little guy."],
  ],
  ["covid-19-dashboard", ["Charts that finally make sense.", "Clear numbers, clear head."]],
  [
    "dataembed",
    ["Queried the whole web. Neat.", "Got it all in one table!", "Research done in minutes."],
  ],
  ["edgestories", ["Learned something about us.", "What a fascinating read."]],
  [
    "founding",
    ["Just met my new tech team.", "Our first sprint starts Monday!", "Building feels easy now."],
  ],
  ["init", ["Launched a project today!", "Scaffolded in one command.", "Liftoff!"]],
  ["inteligir", ["My computer gets me now.", "The OS ran my errands."]],
  ["keiko-and-friends", ["Got the cutest stickers!", "Keiko is adorable."]],
  [
    "kwadrants",
    ["Sorted my whole week.", "Everything fits in four boxes.", "Urgent, important, done."],
  ],
  ["loremllm", ["Mocked my LLM in seconds.", "Tests pass, no API bill!"]],
  ["policing-ice", ["Glad this record exists.", "Every video counts."]],
  ["stonksville", ["Called the next candle!", "Up 40% in ninety seconds.", "Stonks only go up."]],
  ["total-compensation-calculator", ["Now I know what it's worth.", "Negotiated a better offer!"]],
  [
    "uicapsule",
    ["These components spark joy.", "Found the perfect button.", "So much polish in there."],
  ],
  [
    "vibedgames",
    ["My agent made a game!", "Shipped a game before lunch.", "Multiplayer just worked."],
  ],
  [
    "yourssincerely",
    ["Someone wrote me a letter 💌", "Left a note. Felt lighter.", "That made my whole day."],
  ],
]);

const BY_KIND: Record<ProjectKind, readonly string[]> = {
  "mini-app": ["Small app, big smile.", "That was fun!"],
  project: ["Loved it in there.", "Worth the visit!", "Coming back tomorrow."],
  template: ["Forked it already.", "Great place to start."],
  venture: ["Loved it in there.", "Coming back tomorrow."],
};

/** The `pick`th thing someone says leaving this project, round and round its lines. */
export const quoteFor = (slug: string, kind: ProjectKind, pick: number) => {
  const lines = BY_SLUG.get(slug) ?? BY_KIND[kind];
  return lines[Math.abs(Math.floor(pick)) % lines.length] ?? "";
};
