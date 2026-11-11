"use client";

import { Popover } from "@base-ui/react/popover";
import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";

import { halftone } from "@/lib/print";
import { siteConfig } from "@/lib/site";

const AGENTS = "Taiwanese 7s";
const SUBREDDIT = "r/agi";

const AGENT_FILES = [
  {
    caption: "Last seen explaining scaling laws at an afterparty.",
    number: "07",
    scene: "at a tech afterparty, holding up a laptop",
  },
  {
    caption: "Last seen at a hackathon, asking which evals you’re failing.",
    number: "11",
    scene: "at a late-night hackathon, holding a slice of pizza",
  },
  {
    caption: "Last seen at the bouldering gym, spotting your staff engineer.",
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
    back: "Scale beats cleverness. Agree, then ask what they’re scaling.",
    front: "The Bitter Lesson",
  },
  {
    back: "When they think AGI arrives. The answer is always “sooner than people think.”",
    front: "Timelines",
  },
  {
    back: "Tests their models fail. Ask which ones. They will tell you everything.",
    front: "Evals",
  },
  {
    back: "Bigger model, lower loss, straight line on a log plot. Say “Chinchilla” once. Never twice.",
    front: "Scaling laws",
  },
  {
    back: "Reading a model’s mind. Tell them you wish you could read theirs.",
    front: "Interpretability",
  },
  {
    back: "The model itself: billions of numbers. The thing we are actually here for.",
    front: "Weights",
  },
];

const label = "font-mono text-[11px] leading-[1.45] tracking-[0.06em] uppercase";
const popupClassName =
  "origin-(--transform-origin) border-2 border-foreground bg-background shadow-[5px_5px_0] shadow-foreground outline-none transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0";
// An index card: a red rule across the top, faint blue lines below it.
const indexCard =
  "border border-foreground/25 bg-white bg-[linear-gradient(to_bottom,transparent_34px,var(--red)_34px,var(--red)_36px,transparent_36px),repeating-linear-gradient(to_bottom,transparent_0_23px,#c9d8ee_23px_24px)] shadow-[0_1px_3px] shadow-foreground/20";

const Note = ({
  children,
  label: text,
  onOpenChange,
}: {
  children: ReactNode;
  label: string;
  onOpenChange?: (open: boolean) => void;
}) => (
  <Popover.Root onOpenChange={onOpenChange}>
    <Popover.Trigger
      className="cursor-help underline decoration-dotted decoration-2 underline-offset-[0.18em] outline-none focus-visible:bg-foreground/10"
      closeDelay={120}
      delay={80}
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

/** A different agent every time it opens. */
const AgentNote = () => {
  const [opens, setOpens] = useState(0);
  const agent = AGENT_FILES[(opens + AGENT_FILES.length - 1) % AGENT_FILES.length];
  return (
    <Note
      label={AGENTS}
      onOpenChange={(open) => {
        if (open) {
          setOpens((count) => count + 1);
        }
      }}
    >
      {agent && (
        <figure className="w-[210px] p-2">
          <div className="relative border border-foreground">
            <Image
              alt={`Agent ${agent.number}, ${agent.scene}`}
              className="aspect-3/4 w-full object-cover contrast-[1.1]"
              height={280}
              src={`/agent-${agent.number}.jpg`}
              width={210}
            />
            <div aria-hidden="true" className={halftone} />
          </div>
          <figcaption className={`mt-2 ${label}`}>
            <span className="text-red">Agent {agent.number}.</span> {agent.caption}
          </figcaption>
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
  return (
    <div className="w-[300px] p-4">
      <p className={label}>
        Agent training · card {index + 1} of {FLASHCARDS.length}
      </p>
      <div className="relative mt-3 h-[180px]">
        <div
          aria-hidden="true"
          className={`absolute inset-0 translate-x-1.5 translate-y-2 rotate-2 ${indexCard}`}
        />
        <div
          aria-hidden="true"
          className={`absolute inset-0 -translate-x-1 translate-y-1 -rotate-1 ${indexCard}`}
        />
        <button
          aria-label={flipped ? card.back : `${card.front}. Flip to see what to remember.`}
          className="absolute inset-0 cursor-pointer perspective-[900px] outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          onClick={() => setFlipped((side) => !side)}
          type="button"
        >
          <span
            className={`relative block size-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-3d motion-reduce:duration-0 ${
              flipped ? "rotate-y-180" : ""
            }`}
          >
            <span
              className={`absolute inset-0 flex flex-col justify-center px-5 pt-6 backface-hidden ${indexCard}`}
            >
              <span className="text-center text-[30px] leading-[1.05] font-semibold tracking-[-0.01em]">
                {card.front}
              </span>
              <span className={`absolute right-3 bottom-2 text-secondary ${label}`}>
                Tap to flip
              </span>
            </span>
            <span
              className={`absolute inset-0 flex flex-col justify-center gap-1 px-5 pt-7 text-left rotate-y-180 backface-hidden ${indexCard}`}
            >
              <span className={`text-red ${label}`}>Remember</span>
              <span className="text-[17px] leading-[1.3] italic">{card.back}</span>
            </span>
          </span>
        </button>
      </div>
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
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
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
