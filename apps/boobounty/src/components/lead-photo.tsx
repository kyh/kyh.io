"use client";

import { useState } from "react";

import { Honeypot } from "@/components/honeypot";

const CAPTIONS = {
  after: "Pictured: the honeypot, moments after it worked.",
  before: "Pictured: the honeypot, moments before it worked.",
  handled: "Pictured: the honeypot, being handled.",
} as const;

type Moment = keyof typeof CAPTIONS;

/** The lead photo: the jar, and a caption that follows what happens to it. */
export const LeadPhoto = ({ className }: { className: string }) => {
  const [moment, setMoment] = useState<Moment>("before");
  return (
    <figure className={className}>
      <div className="relative h-[clamp(340px,min(46vw,calc(100svh-300px)),600px)] overflow-hidden border border-foreground">
        <Honeypot onCarry={(held) => setMoment(held ? "handled" : "after")} />
      </div>
      <figcaption
        aria-live="polite"
        className="mt-3 font-mono text-[12px] tracking-[0.08em] uppercase"
      >
        {CAPTIONS[moment]}
      </figcaption>
    </figure>
  );
};
