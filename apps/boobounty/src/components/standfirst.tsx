"use client";

import { Popover } from "@base-ui/react/popover";
import Image, { getImageProps } from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import { preload } from "react-dom";

import { halftone } from "@/lib/print";
import { siteConfig } from "@/lib/site";

const AGENTS = "Taiwanese 7s";
const SUBREDDIT = "r/agi";

const AGENT_FILES = [
  {
    age: 26,
    caption: "thinks it’s cute when a man knows his own p(doom).",
    number: "07",
    scene: "at a tech afterparty, holding up a laptop",
  },
  {
    age: 24,
    caption: "loves long walks and longer context windows.",
    number: "11",
    scene: "at a late-night hackathon, holding a slice of pizza",
  },
  {
    age: 27,
    caption: "has been spotting your staff engineer since March.",
    number: "23",
    scene: "at a bouldering gym, chalk on her hands",
  },
];

const FLASHCARDS = [
  {
    back: "Their odds that AI ends us. Whatever number they give, look worried and say “same.”",
    front: "p(doom)",
  },
  {
    back: "Reinforcement learning from human feedback. You are the human feedback.",
    front: "RLHF",
  },
  {
    back: "When they think AGI arrives. Shorter after two drinks. So is the NDA.",
    front: "Timelines",
  },
  {
    back: "A model agreeing with everything you say. Agree with 80%. They test for this.",
    front: "Sycophancy",
  },
  {
    back: "Getting a system to want what you want. Congratulations: you work in alignment.",
    front: "Alignment",
  },
  {
    back: "Bigger model, lower loss, straight line on a log plot. Say “Chinchilla” once. Never twice.",
    front: "Scaling laws",
  },
  {
    back: "Means they’re about to. Order another round.",
    front: "“I can’t talk about it.”",
  },
  {
    back: "Fighting words. Say it only if you need to leave immediately.",
    front: "Stochastic parrot",
  },
  {
    back: "The model itself: billions of numbers. The thing we are actually here for.",
    front: "Weights",
  },
];

const AGENT_PHOTO = { height: 280, width: 210 };
const agentPhoto = (number: string) => `/agent-${number}.jpg`;

// The popup mounts on open, so without a head start its photos arrive late.
const warmAgents = () => {
  for (const { number } of AGENT_FILES) {
    const { props } = getImageProps({ ...AGENT_PHOTO, alt: "", src: agentPhoto(number) });
    preload(props.src, { as: "image", fetchPriority: "low", imageSrcSet: props.srcSet });
  }
};

const label = "font-mono text-[11px] leading-[1.45] tracking-[0.06em] uppercase";
const popupClassName =
  "origin-(--transform-origin) border-2 border-foreground bg-background shadow-[5px_5px_0] shadow-foreground outline-none transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100";
// An index card: a red rule across the top, faint blue lines below it.
const indexCard =
  "border border-foreground/25 bg-white bg-[linear-gradient(to_bottom,transparent_34px,var(--red)_34px,var(--red)_36px,transparent_36px),repeating-linear-gradient(to_bottom,transparent_0_23px,#c9d8ee_23px_24px)] shadow-[0_1px_3px] shadow-foreground/20";

const Note = ({
  children,
  label: text,
  onWarm,
}: {
  children: ReactNode;
  label: string;
  /** Called when the pointer or focus arrives, before it opens. */
  onWarm?: () => void;
}) => (
  <Popover.Root>
    <Popover.Trigger
      className="cursor-help underline decoration-dotted decoration-2 underline-offset-[0.18em] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
      closeDelay={120}
      delay={80}
      onFocus={onWarm}
      onPointerEnter={onWarm}
      openOnHover
    >
      {text}
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Positioner className="z-10" collisionPadding={12} sideOffset={12}>
        <Popover.Popup className={popupClassName}>{children}</Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>
);

const arrow = (direction: "left" | "right") => (
  <svg
    aria-hidden="true"
    className="size-3.5"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d={direction === "left" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
  </svg>
);

const stepButton =
  "grid size-8 place-items-center border border-foreground outline-none hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red";

/** The agents on file, one at a time. */
const AgentNote = () => {
  const [index, setIndex] = useState(0);
  const agent = AGENT_FILES[index];
  const step = (by: number) =>
    setIndex((current) => (current + by + AGENT_FILES.length) % AGENT_FILES.length);
  return (
    <Note label={AGENTS} onWarm={warmAgents}>
      {agent && (
        <figure className="w-[230px] p-3">
          <Popover.Title className="sr-only">Agents on file</Popover.Title>
          <div className="relative border border-foreground">
            <Image
              {...AGENT_PHOTO}
              alt={`Agent ${agent.number}, ${agent.scene}`}
              className="aspect-3/4 w-full object-cover contrast-[1.1]"
              loading="eager"
              src={agentPhoto(agent.number)}
            />
            <div aria-hidden="true" className={halftone} />
          </div>
          <figcaption aria-live="polite" className={`mt-2 min-h-[3lh] ${label}`}>
            <span className="text-red">
              Agent {agent.number}, {agent.age},
            </span>{" "}
            {agent.caption}
          </figcaption>
          <div className="mt-2 flex items-center justify-between">
            <button
              aria-label="Previous agent"
              className={stepButton}
              onClick={() => step(-1)}
              type="button"
            >
              {arrow("left")}
            </button>
            <span className={label}>
              {index + 1} / {AGENT_FILES.length}
            </span>
            <button
              aria-label="Next agent"
              className={stepButton}
              onClick={() => step(1)}
              type="button"
            >
              {arrow("right")}
            </button>
          </div>
        </figure>
      )}
    </Note>
  );
};

/** The agents' study deck: a term on the front, what to do with it on the back. */
const Flashcards = () => {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = FLASHCARDS[index];
  if (!card) {
    return null;
  }
  // The card face is keyed by its term, so the next card arrives face up
  // rather than flipping back with its answer showing.
  return (
    <div className="w-[300px] p-4">
      <Popover.Title className={label}>
        Agent training · card {index + 1} of {FLASHCARDS.length}
      </Popover.Title>
      <div className="relative mt-3 h-[198px]">
        <div
          aria-hidden="true"
          className={`absolute inset-0 translate-x-1.5 translate-y-2 rotate-2 ${indexCard}`}
        />
        <div
          aria-hidden="true"
          className={`absolute inset-0 -translate-x-1 translate-y-1 -rotate-1 ${indexCard}`}
        />
        <button
          aria-label={`Flip card: ${card.front}`}
          aria-pressed={flipped}
          className="absolute inset-0 cursor-pointer perspective-[900px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
          onClick={() => setFlipped((side) => !side)}
          type="button"
        >
          <span
            className={`relative block size-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-3d motion-reduce:duration-0 ${
              flipped ? "rotate-y-180" : ""
            }`}
            key={card.front}
          >
            <span
              className={`absolute inset-0 flex flex-col justify-center px-5 pt-6 backface-hidden ${indexCard}`}
            >
              <span className="text-center text-[30px] leading-[1.05] font-semibold tracking-[-0.01em]">
                {card.front}
              </span>
              <span className={`absolute right-3 bottom-2 text-secondary ${label}`}>Flip ↻</span>
            </span>
            <span
              className={`absolute inset-0 px-5 text-left rotate-y-180 backface-hidden ${indexCard}`}
            >
              <span className={`absolute top-[14px] leading-[24px] text-red ${label}`}>
                Remember
              </span>
              <span className="absolute inset-x-5 top-[54px] text-[17px] leading-[24px] italic">
                {card.back}
              </span>
            </span>
          </span>
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {flipped ? card.back : `Card ${index + 1} of ${FLASHCARDS.length}: ${card.front}`}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <a
          className={`underline decoration-dotted underline-offset-2 hover:text-red ${label}`}
          href="https://www.reddit.com/r/agi/"
          rel="noreferrer"
          target="_blank"
        >
          Study group ↗
        </a>
        <button
          className={`flex items-center gap-2 border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background ${label}`}
          onClick={() => {
            setFlipped(false);
            setIndex((current) => (current + 1) % FLASHCARDS.length);
          }}
          type="button"
        >
          Next card
          {arrow("right")}
        </button>
      </div>
    </div>
  );
};

const annotate = (part: string) => {
  if (part === AGENTS) {
    return <AgentNote />;
  }
  if (part === SUBREDDIT) {
    return (
      <Note label={SUBREDDIT}>
        <Flashcards />
      </Note>
    );
  }
  return part;
};

/** The description, with a look at who we send and what they study. */
export const Standfirst = ({ className }: { className: string }) => (
  <p className={className}>
    {siteConfig.description.split(new RegExp(`(${AGENTS}|${SUBREDDIT})`, "u")).map((part) => (
      <span key={part}>{annotate(part)}</span>
    ))}
  </p>
);
