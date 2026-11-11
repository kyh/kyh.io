"use client";

import { useState } from "react";

import { Honeypot } from "@/components/honeypot";

type Moment = "before" | "handled" | "after" | "exposed";

const CAPTIONS = {
  after: "Pictured: the honeypot, moments after it worked.",
  before: "Pictured: the honeypot, moments before it worked.",
  exposed: "Pictured: Kevin’s badge. Kevin could not be reached for comment.",
  handled: "Pictured: the honeypot, being handled.",
} as const satisfies Record<Moment, string>;

/** The lead photo: the jar, a caption that follows what happens to it, and a flashbulb for Kevin. */
export const LeadPhoto = ({ className }: { className: string }) => {
  const [moment, setMoment] = useState<Moment>("before");
  return (
    <figure className={className}>
      <div className="relative h-[clamp(340px,min(46vw,calc(100svh-300px)),600px)] overflow-hidden border border-foreground">
        <Honeypot
          onCarry={(held) =>
            setMoment((now) => {
              if (now === "exposed") {
                return now;
              }
              return held ? "handled" : "after";
            })
          }
          onExposed={() => setMoment("exposed")}
        />
        {moment === "exposed" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-flash bg-white motion-reduce:hidden"
          />
        )}
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
