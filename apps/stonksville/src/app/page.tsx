import { TradingChart } from "@/components/trading-chart";

const Page = () => {
  return (
    // h-full not h-dvh: on rotated mobile, body height is 100dvw via CSS media query,
    // and 100dvh would resolve to the portrait height causing overflow. Parent chain:
    // html/body { height: 100% } in globals.css, body { height: 100dvw } when rotated.
    <main className="h-full w-full overflow-hidden">
      <TradingChart />
    </main>
  );
};

export default Page;
