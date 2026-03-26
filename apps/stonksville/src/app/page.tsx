import { LandscapeLock } from "@/components/landscape-lock";
import { TradingChart } from "@/components/trading-chart";

const Page = () => {
  return (
    <main className="h-dvh w-full overflow-hidden">
      <LandscapeLock />
      <TradingChart />
    </main>
  );
};

export default Page;
