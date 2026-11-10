"use client";

import { useState } from "react";

const fieldClass =
  "w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-ink placeholder:text-muted/70 transition-[border-color,box-shadow] duration-150 focus:border-honey-deep focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--honey)_35%,transparent)] focus:outline-none";

const labelClass = "font-mono text-[11px] tracking-[0.16em] text-muted uppercase";

const headcounts = ["1–50", "51–500", "501–5,000", "More than we admit"];

// No backend yet: the form only acknowledges.
const ContactForm = () => {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex min-h-80 flex-col justify-center gap-4">
        <output className="flex flex-col gap-4">
          <span className="font-serif text-4xl leading-tight sm:text-5xl">Received.</span>
          <span className="max-w-sm text-lg text-muted">
            An operative will be in touch. You won&rsquo;t know which one.
          </span>
        </output>
        <button
          className="mt-2 self-start font-mono text-xs tracking-[0.16em] text-muted uppercase underline-offset-4 hover:text-ink hover:underline"
          onClick={() => setSent(false)}
          type="button"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form action={() => setSent(true)} className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2">
        <span className={labelClass}>Name</span>
        <input autoComplete="name" className={fieldClass} name="name" required type="text" />
      </label>
      <label className="grid gap-2">
        <span className={labelClass}>Work email</span>
        <input
          autoComplete="email"
          className={fieldClass}
          name="email"
          required
          spellCheck={false}
          type="email"
        />
      </label>
      <label className="grid gap-2">
        <span className={labelClass}>Lab</span>
        <input
          autoComplete="organization"
          className={fieldClass}
          name="company"
          placeholder="Stealth is fine"
          type="text"
        />
      </label>
      <label className="grid gap-2">
        <span className={labelClass}>Headcount</span>
        <span className="relative">
          <select
            className={`${fieldClass} appearance-none pr-10`}
            defaultValue={headcounts[1]}
            name="headcount"
          >
            {headcounts.map((headcount) => (
              <option key={headcount}>{headcount}</option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </label>
      <label className="grid gap-2 sm:col-span-2">
        <span className={labelClass}>Who are you worried about?</span>
        <textarea
          className={`${fieldClass} min-h-32 resize-y`}
          name="message"
          placeholder="Names optional. Job titles appreciated."
        />
      </label>
      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Every engagement is under NDA. Ironically.</p>
        <button
          className="shrink-0 rounded-full bg-ink px-6 py-3.5 text-base whitespace-nowrap font-medium text-paper transition-transform duration-150 ease-out hover:bg-ink/90 active:scale-[0.97]"
          type="submit"
        >
          Request an engagement
        </button>
      </div>
    </form>
  );
};

export { ContactForm };
