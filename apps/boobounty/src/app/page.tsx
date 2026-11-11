import { LeadPhoto } from "@/components/lead-photo";
import { Standfirst } from "@/components/standfirst";
import { siteConfig } from "@/lib/site";

const COVER_LINES = [
  { page: 3, text: "The five words that make researchers spill" },
  { page: 7, text: "“She knew what a KV cache was”: one engineer’s story" },
  { page: 12, text: "Is YOUR p(doom) attractive? Take the quiz" },
];

const STEPS = [
  {
    body: (
      <>
        We study your team&rsquo;s GitHub, Strava and Letterboxd. Five stars for <i>Her</i>?
        Pre-qualified.
      </>
    ),
    number: "01",
    title: "Recon",
  },
  {
    body: "An agent turns up at the afterparty and asks your engineer a follow-up question about their research. Nobody has ever asked them a follow-up question.",
    number: "02",
    title: "Approach",
  },
  {
    body: "Anything that leaks (weights, roadmap, the real reason the launch slipped) goes to your board, timestamped. Your engineer gets left on read.",
    number: "03",
    title: "Report",
  },
];

const TESTIMONIALS = [
  {
    quote: "I explained our eval suite on the first date. The board had the slides before dessert.",
    source: "Research engineer, frontier lab (name withheld)",
  },
  {
    quote: "We thought our biggest risk was model exfiltration. It was Kevin.",
    source: "Head of security, Series C",
  },
  {
    quote: "Our CEO’s update said ‘on track.’ BooBounty’s said ‘Kevin, 1:14 a.m.’",
    source: "Independent director",
  },
];

const PACKAGES = [
  {
    body: "One agent, one conference, one lanyard. Seed stage, where everyone overshares anyway.",
    name: "The Crush",
    price: "Cheaper than a GPU",
  },
  {
    body: "Three agents, one quarter. Nobody defines it. Includes your Discord.",
    name: "The Situationship",
    popular: true,
    price: "About a rack",
  },
  {
    body: "One agent, embedded full time. Gets equity. Vests before you do.",
    name: "The Engagement",
    price: "Paid in secondaries",
  },
];

const CLASSIFIEDS = [
  {
    body: "Staff engineer with own cluster allocation and strong views on RLHF. Must be able to keep a secret (won’t).",
    box: "07",
    heading: "Seeking",
  },
  {
    body: "One lanyard, FRONTIER LAB, ALL ACCESS. Answers to Kevin. Slightly sticky.",
    box: "23",
    heading: "Lost",
  },
];

const label = "font-mono text-[12px] tracking-[0.08em] uppercase";
const sectionRule = "border-t-[5px] border-double border-foreground";
const kicker =
  "inline-block bg-foreground px-2 pt-1 pb-0.5 font-headline text-[22px] leading-none text-background uppercase";
const dmLink = "underline decoration-dotted underline-offset-[0.15em] hover:text-red";
const dmUrl = `https://x.com/${siteConfig.twitter.slice(1)}`;

const Home = () => (
  <div className="mx-auto max-w-[1288px] overflow-x-clip px-4 pb-8 sm:px-8">
    <header className="pt-4 sm:pt-5">
      <p className="text-center font-masthead text-[48px] leading-none sm:text-[64px]">
        {siteConfig.name}
      </p>
      <div
        className={`mt-3 flex items-center justify-between gap-4 border-y border-foreground py-1.5 ${label} text-[11px] sm:text-[12px]`}
      >
        <span className="sm:hidden">Nov. 10, 2026</span>
        <span className="hidden sm:inline">Tuesday, November 10, 2026</span>
        <span className="hidden sm:inline">Vol. I · No. 69 · Late city final</span>
        <span>Price: one secret</span>
      </div>
      <div className="relative mt-[3px] h-1 bg-foreground">
        <span
          className={`absolute top-1/2 left-1/2 -translate-1/2 border border-foreground bg-background px-3 py-1 whitespace-nowrap ${label}`}
        >
          Paid advertisement
        </span>
      </div>
      <ul className="mt-6 hidden grid-cols-3 md:grid">
        {COVER_LINES.map((line) => (
          <li
            className="border-l border-foreground px-4 text-[15px] leading-[1.25] font-semibold first:border-l-0 first:pl-0"
            key={line.page}
          >
            <span className="text-red">Inside:</span> {line.text},{" "}
            <span className="font-mono text-[12px] font-normal">p.&nbsp;{line.page}</span>
          </li>
        ))}
      </ul>
    </header>

    <main>
      <section className="pt-5 sm:pt-6">
        <h1 className="relative pt-7 font-headline text-[13vw] leading-[0.86] text-wrap uppercase sm:text-[min(calc((100vw-64px)/8.4),145px)]">
          <span className="absolute top-0 left-0 -rotate-3 bg-red px-3 pt-1 pb-0.5 text-[clamp(16px,1.6vw,22px)] leading-none text-background shadow-[2px_2px_0] shadow-foreground">
            Exclusive
          </span>
          {siteConfig.tagline}.
        </h1>

        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <LeadPhoto className="lg:col-span-7" />

          <article className="lg:col-span-5 lg:border-l lg:border-foreground lg:pl-8">
            <Standfirst className="text-[26px] leading-[1.15] font-semibold tracking-[-0.01em] sm:text-[30px]" />
            <p className={`mt-5 border-y border-foreground py-2 ${label}`}>
              By Vivian, honeytrap correspondent
            </p>
            <div className="mt-5 space-y-4 text-[18px] leading-[1.5] hyphens-auto">
              <p className="first-letter:float-left first-letter:mt-1.5 first-letter:mr-2 first-letter:font-headline first-letter:text-[80px] first-letter:leading-[0.8]">
                Your weights are encrypted. Your SOC 2 is spotless. Your staff engineer has been
                texting someone named Vivian since the offsite.
              </p>
              <p>
                BooBounty red-teams the only attack surface in your company with a dating profile.
                Our agents can argue scaling laws over natural wine and laugh at your paperclip joke
                like it&rsquo;s the first time.
              </p>
              <p>Nobody gets hurt. Somebody gets a second date. Your board gets a PDF.</p>
            </div>
            <p className={`mt-5 text-right ${label}`}>Continued in your next board deck, p. 14 ▸</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="sting" className={`mt-12 ${sectionRule} pt-4`}>
        <h2 className={kicker} id="sting">
          The sting, step by step
        </h2>
        <ol className="mt-5 grid gap-8 md:grid-cols-3 md:gap-0">
          {STEPS.map((step) => (
            <li
              className="md:border-l md:border-foreground md:px-6 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
              key={step.number}
            >
              <span className="font-mono text-[14px] text-red">{step.number}</span>
              <h3 className="mt-1 font-headline text-[44px] leading-none uppercase">
                {step.title}
              </h3>
              <p className="mt-3 text-[17px] leading-[1.5]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={`mt-12 ${sectionRule} grid gap-10 pt-4 lg:grid-cols-12 lg:gap-8`}>
        <div className="lg:col-span-5">
          <section aria-labelledby="confessions">
            <h2 className={kicker} id="confessions">
              Shock confessions
            </h2>
            <ul className="mt-5 space-y-6">
              {TESTIMONIALS.map((testimonial) => (
                <li key={testimonial.source}>
                  <blockquote className="text-[24px] leading-[1.2] italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <p className={`mt-2 text-secondary ${label}`}>{testimonial.source}</p>
                </li>
              ))}
            </ul>
          </section>

          <aside
            aria-label="Coupon"
            className="relative mt-10 -rotate-1 border-2 border-dashed border-foreground bg-background p-5 sm:p-6"
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 right-0 size-36 rotate-12 text-honey opacity-35 sm:-right-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 120 120"
            >
              <circle cx="60" cy="60" r="50" strokeDasharray="190 12 60 20" strokeWidth="5" />
              <circle cx="60" cy="60" r="46" strokeOpacity="0.6" strokeWidth="1.5" />
            </svg>
            <div className="flex items-center gap-3">
              <svg
                aria-hidden="true"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M8.1 8.1 20 20M8.1 15.9 20 4" />
              </svg>
              <p className="font-headline text-[22px] text-red uppercase">Clip &amp; save</p>
            </div>
            <p className="mt-2 text-[34px] leading-[1.05] font-semibold tracking-[-0.01em]">
              10% off your first breach.
            </p>
            <p className="mt-3 text-[15px] leading-normal text-secondary italic">
              Present to any agent at a poster session. You won&rsquo;t know which one. One per
              board. Not valid with existing NDAs.
            </p>
          </aside>
        </div>

        <div className="border-t border-foreground pt-4 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <section aria-labelledby="rates">
            <h2 className={kicker} id="rates">
              Rates
            </h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-3 sm:grid-rows-[auto_1fr_auto]">
              {PACKAGES.map((pack) => (
                <li
                  className="relative flex flex-col border-2 border-foreground p-4 sm:row-span-3 sm:grid sm:grid-rows-subgrid sm:gap-0"
                  key={pack.name}
                >
                  {pack.popular && (
                    <span className="absolute -top-5 -right-3 grid size-[68px] rotate-12 place-items-center bg-red text-center font-headline text-[13px] leading-[1.05] text-background uppercase [clip-path:polygon(50%_0,61%_14%,79%_9%,80%_27%,97%_33%,88%_50%,97%_67%,80%_73%,79%_91%,61%_86%,50%_100%,39%_86%,21%_91%,20%_73%,3%_67%,12%_50%,3%_33%,20%_27%,21%_9%,39%_14%)]">
                      Most
                      <br />
                      popular
                    </span>
                  )}
                  <h3 className="font-headline text-[30px] leading-none uppercase">{pack.name}</h3>
                  <p className="mt-3 text-[16px] leading-[1.45]">{pack.body}</p>
                  <p className="mt-4 border-t border-foreground pt-2 font-headline text-[24px] leading-[1.05] text-red uppercase">
                    {pack.price}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <aside
            aria-label="Correction"
            className="mt-10 border-y-2 border-foreground py-3 text-[16px] leading-normal"
          >
            <span className="font-headline text-[18px] uppercase">Correction:</span> In our last
            edition we said our agents &ldquo;read r/agi.&rdquo; They skim it, like everyone. We
            regret the error.
          </aside>

          <section aria-labelledby="classifieds" className="mt-8">
            <h2 className={label} id="classifieds">
              Classifieds
            </h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2">
              {CLASSIFIEDS.map((ad) => (
                <li className="border border-foreground p-3 text-[15px] leading-[1.4]" key={ad.box}>
                  <span className="font-headline text-[17px] uppercase">{ad.heading}:</span>{" "}
                  {ad.body} <span className="font-mono text-[12px]">Box&nbsp;{ad.box}.</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className={`mt-12 ${sectionRule} pt-8 text-center`}>
        <h2 className="font-headline text-[clamp(40px,7vw,96px)] leading-[0.9] uppercase">
          Don&rsquo;t call us. We&rsquo;ll call your engineers.
        </h2>
        <p className="mt-5 text-[22px] leading-[1.3] font-semibold sm:text-[28px]">
          Bookings: slide into{" "}
          <a className={dmLink} href={dmUrl} rel="noreferrer" target="_blank">
            {siteConfig.twitter}
          </a>
          &rsquo;s DMs. It&rsquo;s how we&rsquo;d do it.
        </p>
      </section>
    </main>

    <footer className="mt-10 border-t border-foreground pt-3">
      <p className="text-[14px] text-secondary italic">
        Ask your board if BooBounty is right for you. Side effects may include a second date and a
        sudden interest in natural wine.
      </p>
      <div className={`mt-3 flex flex-wrap justify-between gap-2 ${label}`}>
        <span>© 2026 {siteConfig.name}</span>
        <span>Results not typical. Your board may already know.</span>
      </div>
    </footer>
  </div>
);

export default Home;
