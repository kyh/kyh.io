import { ContactForm } from "@/components/contact-form";
import { LoveTriangle } from "@/components/love-triangle";
import { siteConfig } from "@/lib/site";

const steps = [
  {
    body: "Your operative reads r/agi, LessWrong and every post your team has liked on X. She arrives fluent in mesa-optimizers and quietly devastated about p(doom).",
    title: "Reconnaissance",
  },
  {
    body: "A NeurIPS poster session. A Hayes Valley coffee line. A Hinge match who asks, unprompted, whether you think RLHF is enough.",
    title: "Approach",
  },
  {
    body: "Three dates, at most. She asks about the unreleased model, the context window, the cluster. She is a wonderful listener.",
    title: "Engagement",
  },
  {
    body: "If anything slips, your board gets a timestamped report within 24 hours. Your engineer gets a handwritten note and a reading list.",
    title: "Disclosure",
  },
];

const stats = [
  { label: "Operative rating, Taipei scale. Ten anywhere else.", value: "7/10" },
  { label: "Median time from “so what do you work on” to first leak.", value: "2h 14m" },
  { label: "Weights exfiltrated. We just ask nicely and write it down.", value: "0" },
];

const finding = [
  { label: "Target", value: "Staff Research Engineer, Post-Training" },
  { label: "Vector", value: "Brown sugar boba, Valencia St." },
  { label: "Time to compromise", value: "2h 14m" },
  {
    label: "Disclosed",
    redacted: true,
    value: "Parameter count, launch window, the cluster’s nickname",
  },
  { label: "Remediation", value: "Buddy system at poster sessions. Log off r/agi." },
];

const principles = [
  {
    body: "We stop at disclosure. No blackmail, no photos, no heartbreak beyond what the engagement strictly requires.",
    title: "Nobody gets hurt",
  },
  {
    body: "Every engagement ends in a report to your board, never a headline. What happens over oolong stays in the PDF.",
    title: "Responsible disclosure",
  },
  {
    body: "Our operatives really have read the alignment literature. Several have strong opinions on Yudkowsky. One has met him.",
    title: "Fluent, not fake",
  },
];

const Eyebrow = ({ children }: { children: string }) => (
  <p className="font-mono text-xs tracking-[0.2em] text-honey-deep uppercase">{children}</p>
);

const Home = () => (
  <>
    <header className="sticky top-0 z-10 border-b border-line/60 bg-paper/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a className="flex items-center gap-2 font-serif text-2xl" href="#top">
          <svg aria-hidden="true" className="size-5" viewBox="0 0 38 35">
            <path
              d="M19 35 C7 26 0 19 0 10.5 C0 4.6 4.5 0 10 0 C14 0 17.2 2.3 19 5.6 C20.8 2.3 24 0 28 0 C33.5 0 38 4.6 38 10.5 C38 19 31 26 19 35 Z"
              fill="var(--honey)"
            />
          </svg>
          {siteConfig.name}
        </a>
        <div className="flex items-center gap-6 text-sm">
          <a className="text-muted transition-colors hover:text-ink max-sm:hidden" href="#method">
            Method
          </a>
          <a className="text-muted transition-colors hover:text-ink max-sm:hidden" href="#findings">
            Findings
          </a>
          <a
            className="rounded-full bg-ink px-4 py-2 font-medium text-paper transition-colors hover:bg-ink/85"
            href="#contact"
          >
            Book an engagement
          </a>
        </div>
      </nav>
    </header>

    <main id="top">
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[36rem] max-w-4xl rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--honey)_45%,transparent),transparent)] blur-2xl"
        />
        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-16 text-center sm:px-8 sm:pt-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-paper/70 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-dress" />
            {siteConfig.tagline}
          </p>
          <h1 className="mx-auto mt-8 max-w-4xl font-serif text-[clamp(3rem,9vw,7.25rem)] leading-[0.92] tracking-[-0.02em]">
            Your weights are air-gapped. <em className="text-honey-deep">Your engineers</em>{" "}
            aren&rsquo;t.
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            We send Taiwanese 7s who read r/agi to seduce your staff. If it works, your board hears
            about it before anyone else does.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              className="rounded-full bg-ink px-7 py-3.5 text-base font-medium text-paper transition-transform duration-150 ease-out hover:bg-ink/90 active:scale-[0.97]"
              href="#contact"
            >
              Book an engagement
            </a>
            <a
              className="rounded-full px-7 py-3.5 text-base font-medium text-ink transition-colors hover:bg-paper-deep"
              href="#method"
            >
              How it works ↓
            </a>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          <div className="rounded-[2rem] border border-line bg-paper/80 p-5 shadow-[0_1px_0_white_inset,0_30px_60px_-30px_color-mix(in_oklab,var(--honey-deep)_45%,transparent)] sm:p-12">
            <div className="mb-8 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-muted uppercase sm:text-xs">
              <span>Fig. 1: Threat model</span>
              <span className="max-sm:hidden">Every lab, every time</span>
            </div>
            <LoveTriangle />
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center font-serif text-2xl leading-snug italic sm:text-3xl">
            Firewalls stop packets. They don&rsquo;t stop someone asking about your eval results
            over oolong.
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-paper-deep/60" id="method">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="max-w-2xl">
            <Eyebrow>The method</Eyebrow>
            <h2 className="mt-4 font-serif text-5xl leading-none tracking-[-0.01em] sm:text-6xl">
              Social engineering, <em>literally.</em>
            </h2>
          </div>
          <ol className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li className="flex flex-col gap-4 bg-paper p-7" key={step.title}>
                <span className="font-mono text-xs text-honey-deep tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-3xl">{step.title}</h3>
                <p className="leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32" id="findings">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Eyebrow>Findings</Eyebrow>
            <h2 className="mt-4 font-serif text-5xl leading-none tracking-[-0.01em] sm:text-6xl">
              Your board gets a report. <em>Not a scandal.</em>
            </h2>
            <dl className="mt-12 grid gap-8">
              {stats.map((stat) => (
                <div className="grid grid-cols-[8.5rem_1fr] items-baseline gap-6" key={stat.value}>
                  <dt className="font-serif text-5xl whitespace-nowrap tabular-nums">
                    {stat.value}
                  </dt>
                  <dd className="text-muted">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <article className="rotate-1 rounded-2xl border border-line bg-white p-7 shadow-[0_40px_80px_-40px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-transform duration-300 ease-out hover:rotate-0 sm:p-10">
            <div className="flex items-start justify-between gap-4 border-b border-line pb-6">
              <div>
                <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
                  Finding BB-2026-0417
                </p>
                <h3 className="mt-2 font-serif text-3xl">Disclosure over dessert</h3>
              </div>
              <span className="shrink-0 rounded-full bg-dress px-3 py-1 font-mono text-[11px] tracking-[0.12em] text-white uppercase">
                Critical
              </span>
            </div>
            <dl className="divide-y divide-line">
              {finding.map((row) => (
                <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6" key={row.label}>
                  <dt className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase sm:pt-0.5">
                    {row.label}
                  </dt>
                  <dd>
                    {row.redacted ? (
                      <span className="bg-ink box-decoration-clone px-1 text-ink select-none">
                        {row.value}
                      </span>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
              Board notified · 09:12 the next morning
            </p>
          </article>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <p className="font-mono text-xs tracking-[0.2em] text-honey uppercase">Principles</p>
          <div className="mt-12 grid gap-12 md:grid-cols-3">
            {principles.map((principle) => (
              <div className="border-t border-paper/20 pt-6" key={principle.title}>
                <h3 className="font-serif text-3xl">{principle.title}</h3>
                <p className="mt-4 leading-relaxed text-paper/65">{principle.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32" id="contact">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <Eyebrow>Contact</Eyebrow>
            <h2 className="mt-4 font-serif text-5xl leading-none tracking-[-0.01em] sm:text-6xl">
              Find out who <em className="text-honey-deep">would talk.</em>
            </h2>
            <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted">
              Tell us about your lab. We&rsquo;ll scope an engagement, assign an operative, and
              never tell you which one.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-white/60 p-6 sm:p-10">
            <ContactForm />
          </div>
        </div>
      </section>
    </main>

    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-serif text-lg text-ink">{siteConfig.name}</span> is a joke. Please
          don&rsquo;t seduce anyone&rsquo;s employees.
        </p>
        <p className="font-mono text-xs tracking-[0.14em] uppercase">© 2026 {siteConfig.name}</p>
      </div>
    </footer>
  </>
);

export default Home;
