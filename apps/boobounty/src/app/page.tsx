import { ContactForm } from "@/components/contact-form";
import { Honeypot } from "@/components/honeypot";
import { siteConfig } from "@/lib/site";

const Home = () => (
  <div className="flex h-svh min-h-[600px] flex-col">
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="min-h-0 w-full flex-1">
        <Honeypot />
      </section>

      <section className="mx-auto w-full max-w-[880px] px-6 pt-2 pb-6 text-center sm:pb-10">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-honey sm:text-[17px]">
          {siteConfig.name}
        </p>
        <h1 className="mt-2 text-[30px] leading-[1.08] font-semibold tracking-[-0.02em] sm:text-[52px] sm:leading-[1.05] sm:[@media(max-height:820px)]:text-[40px]">
          <span className="block">Your weights are air-gapped.</span>
          <span className="block">Your engineers aren&rsquo;t.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-[1.45] text-secondary sm:mt-4 sm:text-[19px] sm:[@media(max-height:820px)]:text-[17px]">
          Honeypot pentesting for AI companies. We send Taiwanese 7s who read r/agi to seduce your
          employees. If it works, your board finds out before you do.
        </p>
        <div className="mt-5 sm:mt-7">
          <ContactForm />
        </div>
      </section>
    </main>

    <footer className="mx-auto w-full max-w-[720px] border-t border-line px-6 py-3 text-center text-[11px] leading-relaxed text-secondary sm:py-4 sm:text-xs">
      {siteConfig.name} is satire. No engineers were seduced in the making of this website. © 2026
    </footer>
  </div>
);

export default Home;
