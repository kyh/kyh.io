import { ContactForm } from "@/components/contact-form";
import { Honeypot } from "@/components/honeypot";
import { siteConfig } from "@/lib/site";

const Home = () => (
  <>
    <main>
      <section className="aspect-[4/5] max-h-[85svh] w-full sm:aspect-auto sm:h-[min(74svh,780px)]">
        <Honeypot />
      </section>

      <section className="mx-auto max-w-[880px] px-6 pt-6 pb-24 text-center sm:pt-10 sm:pb-32">
        <p className="text-[17px] font-semibold tracking-[-0.01em] text-honey">{siteConfig.name}</p>
        <h1 className="mt-3 text-[36px] leading-[1.08] font-semibold tracking-[-0.02em] sm:text-[64px] sm:leading-[1.05]">
          <span className="block">Your weights are air-gapped.</span>
          <span className="block">Your engineers aren&rsquo;t.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[540px] text-[17px] leading-[1.5] text-secondary sm:text-[21px] sm:leading-[1.45]">
          Honeypot pentesting for AI companies. We send Taiwanese 7s who read r/agi to seduce your
          employees. If it works, your board finds out before you do.
        </p>
        <div className="mt-10">
          <ContactForm />
        </div>
      </section>
    </main>

    <footer className="mx-auto max-w-[720px] border-t border-line px-6 py-6 text-center text-xs leading-relaxed text-secondary">
      <p>{siteConfig.name} is satire. No engineers were seduced in the making of this website.</p>
      <p className="mt-1">© 2026 {siteConfig.name}</p>
    </footer>
  </>
);

export default Home;
