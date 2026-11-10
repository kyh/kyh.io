import { Honeypot } from "@/components/honeypot";
import { siteConfig } from "@/lib/site";

const Home = () => (
  <main className="relative h-svh overflow-hidden">
    <div className="absolute inset-0">
      <Honeypot />
    </div>

    <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-[760px] px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center sm:pb-14">
      <h1 className="font-display text-[clamp(32px,5vw,64px)] leading-[1.02] font-semibold tracking-[-0.025em]">
        {siteConfig.tagline}.
      </h1>
      <p className="mx-auto mt-3 max-w-[520px] text-[16px] leading-normal text-secondary sm:mt-4 sm:text-[18px]">
        {siteConfig.description}
      </p>
    </div>
  </main>
);

export default Home;
