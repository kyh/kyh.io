"use client";

import { Popover } from "@base-ui/react/popover";
import Image from "next/image";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";

const CUE_CARDS = [
  "Can say “p(doom)” with a straight face.",
  "Knows the bitter lesson by heart. Agrees with it.",
  "Has a take on your timelines. It matches yours.",
  "Laughs at “attention is all you need.” Every time.",
];

const CARD_TILT = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3"];

const AGENTS = "Taiwanese 7s";
const SUBREDDIT = "r/agi";

const popupClassName =
  "origin-(--transform-origin) border-2 border-foreground bg-background shadow-[5px_5px_0] shadow-foreground outline-none transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0";

const Note = ({ children, label }: { children: ReactNode; label: string }) => (
  <Popover.Root>
    <Popover.Trigger
      className="cursor-help underline decoration-dotted decoration-2 underline-offset-[0.18em] outline-none focus-visible:bg-foreground/10"
      closeDelay={120}
      delay={80}
      openOnHover
    >
      {label}
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Positioner className="z-10" collisionPadding={12} sideOffset={12}>
        <Popover.Popup className={popupClassName}>{children}</Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>
);

const Agent = () => (
  <figure className="w-[240px] p-2">
    <Image
      alt="One of our agents at a tech afterparty, holding a laptop and a lanyard"
      className="aspect-3/4 w-full border border-foreground object-cover"
      height={320}
      src="/agent.jpg"
      width={240}
    />
    <figcaption className="mt-2 font-mono text-[11px] leading-[1.45] tracking-[0.06em] uppercase">
      <span className="text-red">Agent 07.</span> Last seen explaining scaling laws at an
      afterparty.
    </figcaption>
  </figure>
);

const CueCards = () => (
  <div className="w-[280px] p-4">
    <p className="font-mono text-[11px] tracking-[0.08em] uppercase">Agent cue cards</p>
    <ol className="mt-3 space-y-2">
      {CUE_CARDS.map((card, index) => (
        <li
          className={`border border-foreground/20 bg-white bg-[linear-gradient(to_bottom,var(--red)_0_2px,transparent_2px)] px-3 pt-3 pb-2 font-serif text-[16px] leading-[1.3] italic shadow-[0_1px_2px] shadow-foreground/15 ${CARD_TILT[index % CARD_TILT.length]}`}
          key={card}
        >
          {card}
        </li>
      ))}
    </ol>
  </div>
);

const annotate = (part: string) => {
  if (part === AGENTS) {
    return (
      <Note label={AGENTS}>
        <Agent />
      </Note>
    );
  }
  if (part === SUBREDDIT) {
    return (
      <Note label={SUBREDDIT}>
        <CueCards />
      </Note>
    );
  }
  return part;
};

/** The description, with a look at who we send and what they know. */
export const Standfirst = ({ className }: { className: string }) => (
  <p className={className}>
    {siteConfig.description.split(new RegExp(`(${AGENTS}|${SUBREDDIT})`, "u")).map((part) => (
      <span key={part}>{annotate(part)}</span>
    ))}
  </p>
);
