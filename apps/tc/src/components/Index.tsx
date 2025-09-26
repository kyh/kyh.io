import ParentSize from "@visx/responsive/lib/components/ParentSize";
import Chart from "~/components/Chart";
import { CompForm } from "~/components/CompForm";
import { CompTable } from "~/components/CompTable";
import { Navigation } from "~/components/Navigation";
import { useCompHooks } from "~/lib/comp";
import { currencyTextFormatProps } from "~/lib/formProps";
import { NumericFormat } from "react-number-format";

export default function Index() {
  const comp = useCompHooks();
  const totalTc = comp.data.reduce<number>(
    (acc, curr) => acc + curr.base + curr.bonus + curr.stock,
    0,
  );
  const avgTc = totalTc / comp.data.length;

  return (
    <>
      <Navigation />
      <main className="relative mx-auto mb-20 max-w-7xl md:grid md:grid-cols-5">
        <section className="-ml-5 px-8 md:col-span-2">
          <div className="title-section">
            <h1 className="text-2xl font-bold tracking-tight">
              A layman's Total Compensation Calculator
            </h1>
            <p className="mt-3 text-slate-300">
              Understand your total compensation under current market
              conditions.
            </p>
          </div>
          <div className="mt-10">
            <CompForm comp={comp} />
          </div>
        </section>
        <section
          className={`sticky top-5 overflow-x-hidden overflow-y-auto py-10 transition-opacity md:col-span-3 md:h-screen md:px-20 md:py-0 ${
            avgTc ? "opacity-100" : "pointer-events-none opacity-30"
          }`}
        >
          <p className="px-3 text-sm text-slate-400 md:px-0">
            Estimated Total Compensation
          </p>
          <div className="mt-1 flex items-center justify-between px-3 md:px-0">
            <div>
              <NumericFormat
                className="text-3xl font-bold tracking-tight"
                value={avgTc}
                {...currencyTextFormatProps}
              />
              {!!avgTc && (
                <span className="ml-1 text-xs text-slate-400">(per year)</span>
              )}
            </div>
          </div>
          <ParentSize
            className="mt-10"
            parentSizeStyles={{ height: "auto", width: "100%" }}
          >
            {({ width }) => (
              <Chart width={width} height={400} data={comp.data} />
            )}
          </ParentSize>
          <div className="relative -mt-8 w-full overflow-x-auto">
            <CompTable data={comp.data} />
          </div>
        </section>
      </main>
      <a
        className="fixed right-5 bottom-5"
        href="https://www.producthunt.com/posts/total-compensation-calculator?utm_source=badge-featured&utm_medium=badge&utm_source=badge-total&#0045;compensation&#0045;calculator"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=347810&theme=dark"
          alt="Total Compensation Calculator - Your total compensation under current market conditions | Product Hunt"
          width={250}
          height={54}
        />
      </a>
    </>
  );
}
