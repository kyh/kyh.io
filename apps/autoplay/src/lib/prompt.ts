// Turns programming into prompts for the director model.
//
// A session is opened on a WORLD: the format of the channel — a sitcom, a
// news network — described once, which the model keeps in memory so that
// characters, sets and running jokes persist across every program. Each
// program is then a SUBJECT the world turns to — the next thing the anchors
// pick up, the next thing the roommates argue about — which is where a post
// comes in. A post is not a shot list: it carries
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

/** The channel formats, each a world the model can hold onto. */
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
    id: "music-video",
    label: "music-video channel",
    world:
      "An always-on original music-video channel receiving broadcasts from alternate realities. Every transmission introduces a new fictional performer, genre, era, world, and visual language, from medieval hip-hop to underwater soul or robot garage rock. Connect videos with seamless portal jumps, distorted signals, and reality glitches. Never imitate or depict real performers, copyrighted songs, or existing franchises.",
  },
  {
    id: "pirate-tv",
    label: "pirate television network",
    world:
      "A continuous pirate television network from an alternate world, inhabited by recurring synthetic hosts with persistent identities and shared lore. Rotate through absurd local news, late-night call-ins, paranormal reports, public-access experiments, original music, fake commercials, and sitcom-like situations. Preserve characters, relationships, running jokes, station history, and consequences across every program.",
  },
  {
    id: "anime-news",
    label: "anime news network",
    world:
      "A continuous original Japanese anime-style news network rendered entirely as polished 2D cel animation. Every shot, person, location, transition, field report, and on-screen element must remain visibly anime-style—never live action or photorealistic. Follow a fixed team of anime anchors, correspondents, analysts, and weather presenters. Preserve their character designs, personalities, newsroom relationships, studio, and the evolving fictional world they cover. Choose among fictional headlines and report them through desk segments, field reports, interviews, weather, culture, and sports with energetic anime storytelling. Clearly label the world as fictional and avoid real-person impersonation.",
  },
];

/** A format for a new session: any of them, so consecutive sessions differ. */
export const pickFormat = (): Format => {
  const format = FORMATS[Math.floor(Math.random() * FORMATS.length)];
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
 * Stated on every prompt, not only the first: the model keeps a handful of
 * prior prompts as context, and a rule that scrolled out of that window is
 * a rule it no longer has.
 */
const CONTINUITY =
  "Continue without a cut, in the same shot or a camera move within it, keeping every character, set and style exactly as established. Never restart the scene, never fade to black, never begin a new video.";

/**
 * The world turning to a new subject, about a post. The stream must not
 * cut: "next segment" reads to the model as a new scene, so the wording is
 * that the scene already on screen carries on and the subject enters it —
 * a story the anchors pick up, a thing the roommates start arguing about.
 * Neutral about the format on purpose; the world is in the model's memory.
 */
export const buildSegmentPrompt = (text: string, authorName: string): string => {
  const subject = truncate(clean(text));
  if (subject === "") {
    return `${CONTINUITY} The moment drifts: a lull in the same place with the same people, inspired by ${authorName} — the station's own texture between stories.`;
  }
  return `${CONTINUITY} The same people, in the same place, now turn to this — "${subject}". They talk about it, react to it, show it where it can be shown; the world evolves around it rather than cutting to something else. No on-screen text, captions, subtitles, watermarks or user interface.`;
};

/** What a session opens on: the world, then its first subject. */
export const buildOpeningPrompt = (format: Format, firstSegment: string): string =>
  `${format.world} The broadcast is one unbroken stream: scenes evolve, they are never restarted.\n\n${firstSegment}`;
