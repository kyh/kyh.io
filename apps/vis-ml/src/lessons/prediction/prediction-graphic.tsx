import { salaryData } from "./data";
import { makeFirstGuess, meanAbsoluteError, predict, type RegressionModel } from "./model";

export type PredictionScene =
  | { kind: "offer" }
  | { kind: "dataset"; stage: "rows" | "relationship" | "average" }
  | { kind: "formula"; stage: "plain" | "weight" | "prediction" | "bias" }
  | { kind: "chart"; stage: "points" | "line" | "residuals" | "error" | "weight" | "bias" };

type PredictionGraphicProps = {
  scene: PredictionScene;
  model: RegressionModel;
  onModelChange: (model: RegressionModel) => void;
};

const chart = {
  width: 600,
  height: 400,
  left: 54,
  right: 18,
  top: 18,
  bottom: 38,
  maxYears: 12,
  maxSalary: 80_000,
};

const xTicks: readonly number[] = [0, 2, 4, 6, 8, 10, 12];
const yTicks: readonly number[] = [0, 20_000, 40_000, 60_000, 80_000];
const firstGuess = makeFirstGuess(salaryData);

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const averageYears =
  salaryData.reduce((total, observation) => total + observation.years, 0) / salaryData.length;
const averageSalary =
  salaryData.reduce((total, observation) => total + observation.salary, 0) / salaryData.length;

function xPosition(years: number) {
  const plotWidth = chart.width - chart.left - chart.right;
  return chart.left + (years / chart.maxYears) * plotWidth;
}

function yPosition(salary: number) {
  const plotHeight = chart.height - chart.top - chart.bottom;
  const visibleSalary = Math.min(chart.maxSalary, Math.max(0, salary));
  return chart.top + (1 - visibleSalary / chart.maxSalary) * plotHeight;
}

function OfferGraphic() {
  return (
    <div className="offer">
      <h2>Offer Letter</h2>
      <h3>$xxx,xxx</h3>
      {Array.from({ length: 5 }, (_, index) => (
        <div className="offer-line" key={index} />
      ))}
    </div>
  );
}

function DatasetGraphic({ scene }: { scene: Extract<PredictionScene, { kind: "dataset" }> }) {
  const emphasizeRelationship = scene.stage === "relationship" || scene.stage === "average";

  return (
    <div className="table-container">
      <table>
        <caption className="sr-only">Peer salaries by years of experience</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col" className={emphasizeRelationship ? "highlight" : undefined}>
              Years of experience
            </th>
            <th scope="col" className={emphasizeRelationship ? "highlight" : undefined}>
              Salary
            </th>
          </tr>
        </thead>
        <tbody>
          {salaryData.map((observation) => (
            <tr key={observation.id}>
              <th scope="row">xxxx</th>
              <td>{observation.years}</td>
              <td>{currency.format(observation.salary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {scene.stage === "average" ? (
        <div className="average-summary">
          <p>
            Average experience: <strong>{averageYears.toFixed(1)} years</strong>
          </p>
          <p>
            Average salary: <strong>{currency.format(averageSalary)}</strong>
          </p>
          <p>
            Roughly{" "}
            <strong className="highlight-weight">{currency.format(firstGuess.weight)}</strong> per
            year of experience
          </p>
        </div>
      ) : null}
    </div>
  );
}

function FormulaNode({
  symbol,
  description,
  className,
}: {
  symbol: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="visual">{symbol}</div>
      <div className="visual-description">{description}</div>
    </div>
  );
}

function FormulaGraphic({ scene }: { scene: Extract<PredictionScene, { kind: "formula" }> }) {
  const showBias = scene.stage === "bias";
  const showPrediction = scene.stage === "prediction";
  const focusWeight = scene.stage === "weight";

  return (
    <div className="formula-container">
      <FormulaNode symbol="x" description="years of experience" className="input" />
      <span className="formula-operator" aria-hidden="true">
        ×
      </span>
      <FormulaNode
        symbol="w"
        description={currency.format(firstGuess.weight)}
        className={focusWeight ? "weight highlight-weight" : "weight"}
      />
      {showBias ? (
        <>
          <span className="formula-operator" aria-hidden="true">
            +
          </span>
          <FormulaNode symbol="b" description="baseline" className="bias highlight-bias" />
        </>
      ) : null}
      <span className="formula-operator" aria-hidden="true">
        =
      </span>
      <FormulaNode symbol="ŷ" description="predicted salary" className="output" />
      {showPrediction ? (
        <div className="formula-test">4 years → {currency.format(predict(firstGuess, 4))}</div>
      ) : null}
    </div>
  );
}

function ModelControls({
  model,
  showBias,
  onModelChange,
}: {
  model: RegressionModel;
  showBias: boolean;
  onModelChange: (model: RegressionModel) => void;
}) {
  return (
    <div className="chart-sliders">
      <div className="chart-weight">
        <input
          id="model-weight"
          type="range"
          min={0}
          max={15_000}
          step={100}
          value={model.weight}
          onChange={(event) =>
            onModelChange({ weight: Number(event.currentTarget.value), bias: model.bias })
          }
        />
        <label htmlFor="model-weight">
          Weight: <output htmlFor="model-weight">{currency.format(model.weight)}</output>
        </label>
      </div>
      {showBias ? (
        <div className="chart-bias">
          <input
            id="model-bias"
            type="range"
            min={0}
            max={80_000}
            step={100}
            value={model.bias}
            onChange={(event) =>
              onModelChange({ weight: model.weight, bias: Number(event.currentTarget.value) })
            }
          />
          <label htmlFor="model-bias">
            Bias: <output htmlFor="model-bias">{currency.format(model.bias)}</output>
          </label>
        </div>
      ) : null}
    </div>
  );
}

function PredictionChart({
  scene,
  model,
  onModelChange,
}: {
  scene: Extract<PredictionScene, { kind: "chart" }>;
  model: RegressionModel;
  onModelChange: (model: RegressionModel) => void;
}) {
  const showLine = scene.stage !== "points";
  const showResiduals = ["residuals", "error", "weight", "bias"].includes(scene.stage);
  const showError = ["error", "weight", "bias"].includes(scene.stage);
  const showWeight = scene.stage === "weight" || scene.stage === "bias";
  const showBias = scene.stage === "bias";
  const error = meanAbsoluteError(model, salaryData);

  return (
    <div className="chart-container">
      <svg
        className="chart"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label={`Salary observations and a prediction line with mean absolute error ${currency.format(error)}`}
      >
        <title>Salary by years of experience</title>
        <line
          className="axis-domain"
          x1={chart.left}
          x2={chart.left}
          y1={chart.top}
          y2={chart.height - chart.bottom}
        />
        <line
          className="axis-domain"
          x1={chart.left}
          x2={chart.width - chart.right}
          y1={chart.height - chart.bottom}
          y2={chart.height - chart.bottom}
        />
        {yTicks.map((salary) => (
          <g key={salary}>
            <line
              className="axis-tick-mark"
              x1={chart.left - 5}
              x2={chart.left}
              y1={yPosition(salary)}
              y2={yPosition(salary)}
            />
            <text className="axis-tick" x={chart.left - 10} y={yPosition(salary) + 4}>
              ${salary / 1_000}k
            </text>
          </g>
        ))}
        {xTicks.map((years) => (
          <g key={years}>
            <line
              className="axis-tick-mark"
              x1={xPosition(years)}
              x2={xPosition(years)}
              y1={chart.height - chart.bottom}
              y2={chart.height - chart.bottom + 5}
            />
            <text
              className="axis-tick axis-tick-x"
              x={xPosition(years)}
              y={chart.height - chart.bottom + 20}
            >
              {years}
            </text>
          </g>
        ))}

        {showResiduals
          ? salaryData.map((observation) => (
              <line
                className="error-line"
                key={`error-${observation.id}`}
                x1={xPosition(observation.years)}
                x2={xPosition(observation.years)}
                y1={yPosition(observation.salary)}
                y2={yPosition(predict(model, observation.years))}
              />
            ))
          : null}

        {showLine ? (
          <line
            className="regression-line"
            x1={xPosition(0)}
            x2={xPosition(chart.maxYears)}
            y1={yPosition(model.bias)}
            y2={yPosition(predict(model, chart.maxYears))}
          />
        ) : null}

        {salaryData.map((observation) => (
          <circle
            className="data-point"
            key={observation.id}
            cx={xPosition(observation.years)}
            cy={yPosition(observation.salary)}
            r="3"
          >
            <title>
              {observation.years} years, {currency.format(observation.salary)}
            </title>
          </circle>
        ))}
      </svg>

      <footer className="chart-controls">
        {showWeight ? (
          <ModelControls model={model} showBias={showBias} onModelChange={onModelChange} />
        ) : null}
        {showError ? (
          <div className="chart-error highlight-error">
            Mean error: <strong>{currency.format(error)}</strong>
          </div>
        ) : null}
      </footer>
    </div>
  );
}

export function PredictionGraphic({ scene, model, onModelChange }: PredictionGraphicProps) {
  if (scene.kind === "offer") return <OfferGraphic />;
  if (scene.kind === "dataset") return <DatasetGraphic scene={scene} />;
  if (scene.kind === "formula") return <FormulaGraphic scene={scene} />;
  return <PredictionChart scene={scene} model={model} onModelChange={onModelChange} />;
}
