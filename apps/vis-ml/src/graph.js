import { axisBottom, axisLeft, line, max, scaleLinear, select } from "d3";

class LinearRegressionGraph {
  constructor(
    svg,
    data,
    options = {
      yOffset: 20000,
      width: 600,
      height: 400,
      margin: { top: 20, right: 20, bottom: 20, left: 50 },
    },
    state = {
      bias: 0,
      weight: 0,
    },
  ) {
    this.svg = svg;
    this.data = data;
    this.options = options;
    this.state = state;
    this.biasText = select(".bias-text");
    this.weightText = select(".weight-text");

    this.xScale = scaleLinear()
      .domain([0, max(data, (d) => d.x)])
      .range([options.margin.left, options.width - options.margin.right]);

    this.yScale = scaleLinear()
      .domain([0, max(data, (d) => d.y) + options.yOffset])
      .range([options.height - options.margin.bottom, options.margin.top]);

    this.d3line = line()
      .x((d) => this.xScale(d.x))
      .y((d) => this.yScale(d.y));
  }

  createAxis() {
    const xAxis = (g) =>
      g
        .attr(
          "transform",
          `translate(0, ${this.options.height - this.options.margin.bottom})`,
        )
        .attr("class", "xAxis")
        .call(axisBottom(this.xScale));

    const yAxis = (g) =>
      g
        .attr("transform", `translate(${this.options.margin.left}, 0)`)
        .attr("class", "yAxis")
        .call(axisLeft(this.yScale));

    return { xAxis, yAxis };
  }

  updateState(state) {
    this.state = { ...this.state, ...state };
    this.updateRegressionLine();
    this.updateErrorLines();
    this.updateErrorText();
    this.updateBiasText();
    this.updateWeightText();
    this.updateInputValues();
  }

  updateInputValues() {
    select("#bias").attr("value", this.state.bias);
    select("#weight").attr("value", this.state.weight);
  }

  updateRegressionLine() {
    this.svg
      .select(".regression-line")
      .datum([
        { x: 0, y: this.state.bias },
        { x: 11, y: this.state.weight * 11 + this.state.bias },
      ])
      .attr("d", this.d3line);
  }

  updateErrorLines() {
    this.svg
      .selectAll(".error-line")
      .attr("y1", (d) => this.yScale(d.y))
      .attr("y2", (d) =>
        this.yScale(this.state.weight * d.x + this.state.bias),
      );
  }

  updateErrorText() {
    const error = this.calculateError();
    select(".error-text").text(error.toFixed(2));
  }

  updateBiasText() {
    this.biasText.text(this.state.bias.toFixed(2));
  }

  updateWeightText() {
    this.weightText.text(this.state.weight.toFixed(2));
  }

  calculateError() {
    return this.data.reduce((acc, d) => acc + this.getErrorForDatapoint(d), 0);
  }

  getErrorForDatapoint(d) {
    return Math.abs(d.y - (this.state.weight * d.x + this.state.bias));
  }

  render() {
    const graph = this;
    const target = this.svg;
    const { data } = this;

    const div = select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    const g = target.selectAll("g").data(data).join("g");

    // First, let's make the scatterplot
    g.append("line")
      .classed("error-line", true)
      .attr("transform", (d) => `translate(${graph.xScale(d.x)},0)`)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        div.transition().duration(200).style("opacity", 0.9);
        div
          .html(`Error: ${this.getErrorForDatapoint(d).toFixed(0)}`)
          .style("left", `${event.pageX - 65}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        div.transition().duration(200).style("opacity", 0);
      });
    graph.updateErrorLines();

    g.append("circle")
      .classed("data-point", true)
      .attr("r", 3)
      .attr("cx", (d) => graph.xScale(d.x))
      .attr("cy", (d) => graph.yScale(d.y))
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        div.transition().duration(200).style("opacity", 0.9);
        div
          .html(`Salary: $${d.y}`)
          .style("left", `${event.pageX - 30}px`)
          .style("top", `${event.pageY - 50}px`);
      })
      .on("mouseout", () => {
        div.transition().duration(200).style("opacity", 0);
      });

    // Next, we'll draw the regression line
    target.append("path").classed("regression-line", true);
    graph.updateRegressionLine();

    graph.updateErrorText();
    graph.updateWeightText();
    graph.updateBiasText();

    // Lastly, let's adding the axis
    const { xAxis, yAxis } = graph.createAxis();
    target.append("g").call(xAxis);
    target.append("g").call(yAxis);
  }
}

export default LinearRegressionGraph;
