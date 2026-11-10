import { ContactForm } from "@/components/contact-form";
import { Honeypot } from "@/components/honeypot";
import { siteConfig } from "@/lib/site";

const Home = () => (
  <main className="flex h-svh min-h-[560px] flex-col">
    <section className="min-h-0 w-full flex-1">
      <Honeypot />
    </section>

    <section className="mx-auto w-full max-w-[760px] px-6 pt-2 pb-10 text-center sm:pb-14">
      <h1 className="text-[21px] leading-[1.3] font-semibold tracking-[-0.015em] sm:text-[30px] sm:leading-[1.25] sm:[@media(max-height:820px)]:text-[26px]">
        {siteConfig.description}
      </h1>
      <div className="mt-6 sm:mt-8">
        <ContactForm />
      </div>
    </section>
  </main>
);

export default Home;
