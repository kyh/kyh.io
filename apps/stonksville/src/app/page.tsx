import * as stylex from "@stylexjs/stylex";

import { LandscapeShell } from "@/components/landscape-lock";
import { TradingChart } from "@/components/trading-chart";

const styles = stylex.create({
  main: {
    height: "100dvh",
    width: "100%",
    overflow: "hidden",
  },
});

const Page = () => {
  return (
    <main {...stylex.props(styles.main)}>
      <LandscapeShell>
        <TradingChart />
      </LandscapeShell>
    </main>
  );
};

export default Page;
