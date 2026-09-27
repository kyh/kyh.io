import { LandscapeShell } from "@/components/landscape-lock";
import { TradingChart } from "@/components/trading-chart";

const Page = () => (
  <main className="h-dvh w-full overflow-hidden">
    <LandscapeShell>
      <TradingChart />
    </LandscapeShell>
  </main>
);

export default Page;
