import { LandscapeShell } from "@/components/landscape-lock";
import { TradingChart } from "@/components/trading-chart";

const Page = () => {
  return (
    <main className="h-dvh w-full overflow-hidden">
      <LandscapeShell>
        <TradingChart />
      </LandscapeShell>
    </main>
  );
};

export default Page;
