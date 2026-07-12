import { useState } from "react";

import { ScrollyStory, type StorySteps } from "../../components/scrolly-story";
import { salaryData } from "./data";
import { makeFirstGuess } from "./model";
import { PredictionGraphic, type PredictionScene } from "./prediction-graphic";

const steps: StorySteps<PredictionScene> = [
  {
    id: "offer",
    body: (
      <>
        <p>After a few interviews, I finally got my first job offer. Great!</p>
        <p>
          Then I saw the salary and wondered: <em>“Is this a good offer?”</em>
        </p>
      </>
    ),
    scene: { kind: "offer" },
  },
  {
    id: "data",
    body: (
      <p>
        It’s hard to tell without a reference. So I asked friends in the same field and collected a
        few data points.
      </p>
    ),
    scene: { kind: "dataset", stage: "rows" },
  },
  {
    id: "relationship",
    body: (
      <>
        <p>Experience and salary seem related. More experience usually means higher pay.</p>
        <p>The pattern is not perfect, but it gives us something to work with.</p>
      </>
    ),
    scene: { kind: "dataset", stage: "relationship" },
  },
  {
    id: "average",
    body: <p>Let’s start with a rough rule: the average salary earned per year of experience.</p>,
    scene: { kind: "dataset", stage: "average" },
  },
  {
    id: "formula",
    body: (
      <>
        <p>Here’s what that rule looks like as a model.</p>
        <p>
          It takes an <strong>input</strong> (years of experience), performs a calculation, and
          returns an <strong>output</strong> (predicted salary).
        </p>
      </>
    ),
    scene: { kind: "formula", stage: "plain" },
  },
  {
    id: "weight",
    body: (
      <>
        <p>
          The amount we multiply by is the <strong className="highlight-weight">weight</strong>.
        </p>
        <p>
          Choosing weights is part of training. We’ll start with our rough average, then improve it.
        </p>
      </>
    ),
    scene: { kind: "formula", stage: "weight" },
  },
  {
    id: "prediction",
    body: (
      <p>
        With four years of experience, we can run the input through the model and get a predicted
        salary.
      </p>
    ),
    scene: { kind: "formula", stage: "prediction" },
  },
  {
    id: "plot",
    body: (
      <p>
        Does that prediction look right? Let’s plot the data so we can compare the rule with what
        people actually earn.
      </p>
    ),
    scene: { kind: "chart", stage: "points" },
  },
  {
    id: "line",
    body: <p>Now add the model’s prediction line.</p>,
    scene: { kind: "chart", stage: "line" },
  },
  {
    id: "misses",
    body: (
      <p>
        The line misses most points. To judge the model, we need to measure the gap between each
        prediction and the true salary.
      </p>
    ),
    scene: { kind: "chart", stage: "residuals" },
  },
  {
    id: "error",
    body: (
      <>
        <p>Each red line is one prediction error.</p>
        <p>
          We average their lengths into{" "}
          <strong className="highlight-error">mean absolute error</strong>: how far off the model
          is, on average.
        </p>
      </>
    ),
    scene: { kind: "chart", stage: "error" },
  },
  {
    id: "tune-weight",
    body: (
      <p>
        Now we have a measuring stick. Move the weight and try to make the average error smaller.
      </p>
    ),
    scene: { kind: "chart", stage: "weight" },
  },
  {
    id: "bias",
    body: (
      <>
        <p>Our first rule forces the prediction to start at $0 when experience is zero.</p>
        <p>
          A <strong className="highlight-bias">bias</strong> adds a baseline prediction and shifts
          the whole line up or down.
        </p>
      </>
    ),
    scene: { kind: "formula", stage: "bias" },
  },
  {
    id: "train",
    body: <p>Try training the model again. Adjust both weight and bias to reduce the error.</p>,
    scene: { kind: "chart", stage: "bias" },
  },
  {
    id: "complete",
    body: (
      <>
        <p>You just trained your first regression model by hand.</p>
        <p>Next, we’ll see how gradient descent makes those adjustments automatically.</p>
      </>
    ),
    scene: { kind: "chart", stage: "bias" },
  },
];

export function PredictionLesson() {
  const [model, setModel] = useState(() => makeFirstGuess(salaryData));

  return (
    <main tabIndex={-1}>
      <section className="intro">
        <h1>Linear Regression</h1>
        <p>A visual introduction to prediction, error, and training</p>
      </section>

      <ScrollyStory
        steps={steps}
        renderGraphic={(scene) => (
          <PredictionGraphic scene={scene} model={model} onModelChange={setModel} />
        )}
      />
    </main>
  );
}
