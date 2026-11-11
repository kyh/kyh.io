import { Honeypot } from "@/components/honeypot";
import { siteConfig } from "@/lib/site";

const STEPS = [
  {
    body: "We study your team's GitHub, Strava and Letterboxd. Mostly Letterboxd.",
    number: "01",
    title: "Recon",
  },
  {
    body: "An operative turns up at the hackathon, the afterparty or the climbing gym, with strong opinions on interpretability.",
    number: "02",
    title: "Approach",
  },
  {
    body: "If anything leaks (weights, roadmap, the real reason the launch slipped) your board hears it first, with timestamps.",
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
    quote: "Ten out of ten. Would get honeypotted again.",
    source: "Former employee",
  },
];

const PACKAGES = [
  {
    body: "One operative, one conference. Made for seed stage.",
    name: "The Crush",
    price: "$",
  },
  {
    body: "Three operatives for a quarter. Includes a Discord presence.",
    name: "The Situationship",
    price: "$$",
  },
  {
    body: "Embedded full time. Your board is notified in real time.",
    name: "The Honeymoon",
    price: "If you have to ask",
  },
];

const label = "font-mono text-[12px] tracking-[0.08em] uppercase";
const sectionRule = "border-t-[5px] border-double border-foreground";

const Home = () => (
  <div className="mx-auto max-w-[1288px] px-4 pb-8 sm:px-8">
    <header className="pt-5 sm:pt-7">
      <div className="flex items-center gap-4">
        <span className={`hidden sm:block ${label}`}>Vol. I · No. 69</span>
        <span className="hidden h-px flex-1 bg-foreground sm:block" />
        <p className="mx-auto font-masthead text-[48px] leading-none sm:text-[72px]">
          {siteConfig.name}
        </p>
        <span className="hidden h-px flex-1 bg-foreground sm:block" />
        <span className={`hidden sm:block ${label}`}>Price: one secret</span>
      </div>
      <div className="relative mt-4 h-1 bg-foreground">
        <span
          className={`absolute top-1/2 left-1/2 -translate-1/2 border border-foreground bg-background px-3 py-1 whitespace-nowrap ${label}`}
        >
          Paid advertisement
        </span>
      </div>
    </header>

    <main>
      <section className="pt-10 sm:pt-12">
        <p className="inline-block -rotate-2 bg-red px-3 py-1 font-headline text-[22px] text-background uppercase">
          Exclusive
        </p>
        <h1 className="mt-4 font-headline text-[clamp(52px,9vw,128px)] leading-[0.92] uppercase">
          {siteConfig.tagline}.
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <figure className="lg:col-span-7">
            <div className="relative h-[clamp(360px,46vw,600px)] border border-foreground">
              <Honeypot />
            </div>
            <figcaption className={`mt-3 ${label}`}>
              Pictured: the honeypot, moments before it worked.
            </figcaption>
          </figure>

          <article className="lg:col-span-5 lg:border-l lg:border-foreground lg:pl-8">
            <p className="text-[26px] leading-[1.15] font-semibold tracking-[-0.01em] sm:text-[30px]">
              {siteConfig.description}
            </p>
            <p className={`mt-5 border-y border-foreground py-2 ${label}`}>
              By our honeytrap correspondent
            </p>
            <div className="mt-5 space-y-4 text-[18px] leading-[1.5]">
              <p className="first-letter:float-left first-letter:mt-1.5 first-letter:mr-2 first-letter:font-headline first-letter:text-[80px] first-letter:leading-[0.8]">
                Your weights are encrypted. Your SOC 2 is spotless. Your staff engineer has been
                texting someone named Vivian since the offsite.
              </p>
              <p>
                BooBounty red-teams the one system you can&rsquo;t patch. Our operatives have read
                every r/agi thread, can argue scaling laws over natural wine, and laugh at the right
                moment in your RLHF joke.
              </p>
              <p>Nobody gets hurt. Somebody gets a second date. Your board gets a PDF.</p>
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="how" className={`mt-12 ${sectionRule} pt-4`}>
        <h2 className={label} id="how">
          How it works
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
              <p className="mt-3 font-mono text-[14px] leading-[1.6]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={`mt-12 ${sectionRule} grid gap-10 pt-4 lg:grid-cols-12`}>
        <section aria-labelledby="customers" className="lg:col-span-5">
          <h2 className={label} id="customers">
            Satisfied customers
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

        <section
          aria-labelledby="packages"
          className="border-t border-foreground pt-4 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8"
        >
          <h2 className={label} id="packages">
            Packages
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {PACKAGES.map((pack) => (
              <li className="flex flex-col border-2 border-foreground p-4" key={pack.name}>
                <h3 className="font-headline text-[30px] leading-none uppercase">{pack.name}</h3>
                <p className="mt-3 flex-1 font-mono text-[14px] leading-[1.55]">{pack.body}</p>
                <p className="mt-4 border-t border-foreground pt-2 font-mono text-[14px] font-medium">
                  {pack.price}
                </p>
              </li>
            ))}
          </ul>

          <aside className="mt-8 border-2 border-dashed border-foreground p-5 sm:p-6">
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
            <p className="mt-3 font-mono text-[13px] leading-[1.6] text-secondary">
              Present to any operative at NeurIPS. One per board. Void where prohibited.
            </p>
          </aside>
        </section>
      </div>

      <p
        className={`mt-12 ${sectionRule} pt-8 text-center font-headline text-[clamp(40px,7vw,96px)] leading-[0.9] uppercase`}
      >
        Don&rsquo;t call us. We&rsquo;ll call your engineers.
      </p>
    </main>

    <footer
      className={`mt-10 flex flex-wrap justify-between gap-2 border-t border-foreground pt-3 ${label}`}
    >
      <span>© 2026 {siteConfig.name}</span>
      <span>Results not typical. Your board may already know.</span>
    </footer>
  </div>
);

export default Home;
