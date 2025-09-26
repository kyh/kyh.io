import scrollama from "scrollama";
import Stickyfill from "stickyfilljs";
import { select, selectAll } from "d3";
import "./style.css";
import data from "./data";
import { calculateAverage, between, animateLine } from "./utils";
import LinearRegressionGraph from "./graph";

const main = select("main");
const scrolly = main.select("#scrolly");
const figure = scrolly.select("figure");
const article = scrolly.select("article");
const step = article.selectAll(".step");

const offer = figure.select(".offer");
const table = figure.select(".table-container");
const plusLine = figure.select(".plus-line");
const meLine = figure.select(".me-line");
const formula = figure.select(".formula-container");
const chartContainer = figure.select(".chart-container");

const scroller = scrollama();

// generic window resize listener event
function handleResize() {
  // 1. update height of step elements
  const stepH = Math.floor(window.innerHeight * 0.5);
  step.style("height", `${stepH}px`);

  const figureHeight = window.innerHeight / 1.5;
  const figureMarginTop = (window.innerHeight - figureHeight) / 2;

  figure
    .style("height", `${figureHeight}px`)
    .style("top", `${figureMarginTop}px`);

  // 3. tell scrollama to update new element dimensions
  scroller.resize();
}

// scrollama event handlers
function handleStepEnter(response) {
  // add color to current step only
  step.classed("is-active", (_d, i) => {
    return i === response.index;
  });

  if (response.index === 0) {
    offer.classed("hidden", false);
  }
  if (response.index === 1 || response.index === 3) {
    table.classed("hidden", false);
  }
  if (response.index === 3) {
    const { total, averageSalary, averageYears } = calculateAverage(data);
    plusLine
      .select(".experience-line .total-value")
      .text(`${averageYears.toFixed(0)}`);
    plusLine
      .select(".salary-line .total-value")
      .text(`$${averageSalary.toFixed(0)}`);
    plusLine.select(".total .total-value").text(`$${total.toFixed(2)}`);
  }
  if (response.index === 4 || response.index === 6) {
    const { total } = calculateAverage(data);
    formula.classed("hidden", false);
    formula.select(".weight .visual-description").text(`$${total.toFixed(2)}`);
  }
  if (response.index === 5) {
    formula.select(".weight").classed("highlight-weight", true);
  }
  if (response.index === 6) {
    const { total } = calculateAverage(data);
    const test = formula
      .select(".test")
      .classed("hidden", false)
      .text("4 years");
    let changed = false;
    test
      .style("transform", "translateX(0)")
      .transition()
      .delay(3000)
      .duration(5000)
      .style("transform", "translateX(550px)")
      .tween("side-effects", function sideEffect() {
        return function animation(t) {
          if (t > 0.4 && !changed) {
            select(this).text(`$${(4 * total).toFixed(2)}`);
            changed = true;
          }
        };
      });
  }
  if (response.index === 7) {
    chartContainer.classed("hidden", false);
    chartContainer.selectAll(".error-line").classed("hidden", true);
    chartContainer.select(".regression-line").classed("hidden", true);
    if (response.direction === "down") {
      chartContainer
        .selectAll(".data-point")
        .attr("r", "0")
        .transition()
        .duration(300)
        .delay((_d, i) => i * 100)
        .attr("r", "3");
    }
  }
  if (response.index === 8) {
    const line = chartContainer
      .select(".regression-line")
      .classed("hidden", false);
    if (response.direction === "down") {
      animateLine(line);
    }
  }
  if (response.index === 9) {
    const line = chartContainer
      .selectAll(".error-line")
      .classed("hidden", false);
    if (response.direction === "down") {
      animateLine(line, 2000, (_d, i) => i * 500);
    }
  }
  if (response.index === 10) {
    chartContainer.select(".chart-error").classed("hidden", false);
  }
  if (response.index === 11) {
    chartContainer.select(".chart-weight").classed("hidden", false);
  }
  if (response.index === 12 || response.index === 13) {
    formula.classed("hidden", false);
    formula
      .select(".bias")
      .classed("hidden", false)
      .classed("highlight-bias", true);
  }
  if (response.index > 12) {
    chartContainer.select(".chart-bias").classed("hidden", false);
  }
}

function handleStepExit(response) {
  if (response.index === 0) {
    offer.classed("hidden", true);
  }
  if (
    (response.index === 1 && response.direction === "up") ||
    (response.index === 3 && response.direction === "down")
  ) {
    table.classed("hidden", true);
  }
  if (response.index === 2) {
    meLine.classed("hidden", true).attr("style", "transform: translateY(0)");
  }
  if (response.index === 3) {
    table.selectAll("tbody tr td:nth-child(2)").classed("highlight", false);
    table.selectAll("tbody tr td:nth-child(3)").classed("highlight", false);
    plusLine.select(".experience-line").classed("hidden", true);
    plusLine.select(".salary-line").classed("hidden", true);
    plusLine.select(".total").classed("hidden", true);
  }
  if (
    (response.index === 4 && response.direction === "up") ||
    (response.index === 6 && response.direction === "down") ||
    (response.index === 12 && response.direction === "up") ||
    (response.index === 13 && response.direction === "down")
  ) {
    formula.classed("hidden", true);
    if (response.index === 12 && response.direction === "up") {
      formula.select(".bias").classed("hidden", true);
    }
  }
  if (response.index === 5) {
    formula.select(".weight").classed("highlight-weight", false);
  }
  if (response.index === 6) {
    formula.select(".test").classed("hidden", true).transition();
  }
  if (response.index === 7 && response.direction === "up") {
    chartContainer.classed("hidden", true);
  }
  if (response.index < 10) {
    chartContainer.select(".chart-error").classed("hidden", true);
  }
  if (response.index < 11) {
    chartContainer.select(".chart-weight").classed("hidden", true);
  }
  if (response.index < 14) {
    chartContainer.select(".chart-bias").classed("hidden", true);
  }
}

function handleStepProgress(response) {
  if (response.index === 0) {
    offer.attr(
      "style",
      `transform: perspective(800px) rotateY(${
        10 + response.progress * 20
      }deg) rotateX(10deg) scaleX(0.95)
    translate(-50%, -55%)`
    );
  }
  if (response.index === 1) {
    const index = Math.floor(response.progress * 10);
    const trs = table.selectAll("tbody tr");
    trs.filter((_d, i) => i < index).attr("style", "transform: scaleY(1)");
    trs.filter((_d, i) => i > index).attr("style", "transform: scaleY(0)");
  }
  if (response.index === 2 && response.progress > 0.5) {
    figure
      .select(".me-line")
      .classed("hidden", false)
      .attr("style", "transform: translateY(165px)");
  }
  if (response.index === 3) {
    const t1 = table
      .selectAll("tbody tr td:nth-child(2)")
      .classed("highlight", false);
    const t2 = table
      .selectAll("tbody tr td:nth-child(3)")
      .classed("highlight", false);

    if (between(response.progress, 0, 0.5)) {
      t1.classed("highlight", true);
      plusLine.select(".experience-line").classed("hidden", false);
    }
    if (between(response.progress, 0.5, 0.7)) {
      t2.classed("highlight", true);
      plusLine.select(".salary-line").classed("hidden", false);
    }
    if (between(response.progress, 0.7, 1)) {
      plusLine.select(".total").classed("hidden", false);
    }
  }
}

function setupStickyfill() {
  selectAll(".sticky").each(() => {
    Stickyfill.add(this);
  });
}

function init() {
  setupStickyfill();

  // 1. force a resize on load to ensure proper dimensions are sent to scrollama
  handleResize();

  // 2. setup the scroller passing options
  // 		this will also initialize trigger observations
  // 3. bind scrollama event handlers
  scroller
    .setup({
      step: "#scrolly article .step",
      offset: 0.5,
      progress: true,
      // debug: true,
    })
    .onStepEnter(handleStepEnter)
    .onStepExit(handleStepExit)
    .onStepProgress(handleStepProgress);

  // setup resize event
  window.addEventListener("resize", handleResize);
}

// kick things off
init();

const { total } = calculateAverage(data);
const regressionGraph = new LinearRegressionGraph(
  chartContainer.select(".chart"),
  data
);
regressionGraph.render();

regressionGraph.updateState({
  bias: 0,
  weight: total,
});

select("#bias").on("input", function onBiasChange() {
  regressionGraph.updateState({
    bias: +this.value,
  });
  formula.select(".bias .visual-description").text(this.value);
});

select("#weight").on("input", function onWeightChange() {
  regressionGraph.updateState({
    weight: +this.value,
  });
  formula.select(".weight .visual-description").text(this.value);
});

function constructTable() {
  const rows = table
    .select("tbody")
    .selectAll("tr")
    .data(data)
    .join("tr")
    .attr("style", "transform: scaleY(0)");

  rows
    .selectAll("td")
    .data((d) => ["xxxx", d.x, d.y])
    .join("td")
    .text((d) => d);
}

constructTable();
