// Turns programming into prompts for the director model.
//
// A session is opened on a WORLD: the format of the channel — a sitcom, a
// news network — described once, which the model keeps in memory so that
// characters, sets and running jokes persist across every program. Each
// program is then a SEGMENT: the next thing that happens in that world,
// which is where a post comes in. A post is not a shot list: it carries
// links, handles, hashtags and opinions, and handed over raw the model tries
// to render an argument. So the noise is stripped and what remains is framed
// as the subject of the next segment.

const URL_PATTERN = /https?:\/\/\S+/g;
const MENTION_PATTERN = /@\w+/g;
const HASHTAG_PATTERN = /#(\w+)/g;
/** Long posts blur the subject; a segment only ever depicts the opening idea. */
const MAX_SUBJECT_LENGTH = 300;

export type Format = {
  id: string;
  label: string;
  world: string;
};

/**
 * The channel formats, each a world the model can hold onto. All of them are
 * grounded — people, sets, a broadcast — because the abstract ones (a channel
 * of alternate-reality music videos, a pirate network of synthetic hosts)
 * came out as glass figures, crystals and chrome robots, and read as noise.
 */
export const FORMATS: readonly Format[] = [
  {
    id: "sitcom-94",
    label: "1994 sitcom",
    world:
      "A continuous original live-action American sitcom produced in 1994, following the same ensemble of adult roommates, coworkers, neighbors, and rivals. Preserve appearances, apartment and workplace layouts, relationships, jobs, secrets, running jokes, and unresolved storylines. Advance through dialogue, entrances, misunderstandings, escalating attempts to hide mistakes, reversals, and warm character payoffs. Avoid references to existing sitcoms or actors.",
  },
  {
    id: "satire-news",
    label: "satirical news network",
    world:
      "A continuous satirical news network covering an entirely fictional world. Preserve the recurring anchors, correspondents, studio, cities, political institutions, and consequences of earlier reports. Move through breaking news, field reports, weather, interviews, sports, entertainment, and fake commercials while treating increasingly absurd events with total broadcast seriousness. Clearly remain fictional and avoid impersonating real outlets or people.",
  },
  {
    id: "anime-news",
    label: "anime news network",
    world:
      "A continuous original Japanese anime-style news network rendered entirely as polished 2D cel animation. Every shot, person, location, transition, field report, and on-screen element must remain visibly anime-style—never live action or photorealistic. Follow a fixed team of anime anchors, correspondents, analysts, and weather presenters. Preserve their character designs, personalities, newsroom relationships, studio, and the evolving fictional world they cover. Choose among fictional headlines and report them through desk segments, field reports, interviews, weather, culture, and sports with energetic anime storytelling. Clearly label the world as fictional and avoid real-person impersonation.",
  },
];

/**
 * The format for a day, the same for every session that day: a channel is one
 * show at a time, and a replay of the day's sessions reads as one show too.
 * The day is UTC and the pick is a hash of it, so it changes overnight and
 * never depends on who asked.
 */
export const pickFormat = (day: string = new Date().toISOString().slice(0, 10)): Format => {
  let hash = 0;
  for (const char of day) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const format = FORMATS[hash % FORMATS.length];
  if (format === undefined) throw new Error("no formats");
  return format;
};

export const formatById = (id: string): Format | undefined =>
  FORMATS.find((format) => format.id === id);

const clean = (text: string): string =>
  text
    .replace(URL_PATTERN, "")
    .replace(MENTION_PATTERN, "")
    // A hashtag's word is usually the subject — keep it, drop the hash.
    .replace(HASHTAG_PATTERN, "$1")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (text: string): string => {
  if (text.length <= MAX_SUBJECT_LENGTH) return text;
  const clipped = text.slice(0, MAX_SUBJECT_LENGTH);
  const lastStop = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf(", "));
  return lastStop > MAX_SUBJECT_LENGTH / 2 ? clipped.slice(0, lastStop) : clipped;
};

/**
 * The next segment of the world, about a post. Neutral about the format on
 * purpose: the world is in the model's memory, and "the next segment" reads
 * as a scene in a sitcom and a report on a news desk alike.
 */
export const buildSegmentPrompt = (text: string, authorName: string): string => {
  const subject = truncate(clean(text));
  if (subject === "") {
    return `Next segment: a brief interlude in the same world, inspired by ${authorName} — a lull between programs, the station's own texture. Keep every character, set and style exactly as established.`;
  }
  return `Next segment, in the same world and with the same cast, sets and style: the story is about this — "${subject}". Depict it literally where it can be pictured and evoke its mood where it cannot. No on-screen text, captions, subtitles, watermarks or user interface.`;
};

/** What a session opens on: the world, then its first segment. */
export const buildOpeningPrompt = (format: Format, firstSegment: string): string =>
  `${format.world}\n\n${firstSegment}`;
