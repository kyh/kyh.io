import { select } from "d3";

export function calculateAverage(d) {
  const averageSalary = d.reduce((acc, d) => acc + d.y, 0) / d.length;
  const averageYears = d.reduce((acc, d) => acc + d.x, 0) / d.length;
  return { averageSalary, averageYears, total: averageSalary / averageYears };
}

export function between(x, min, max) {
  return x >= min && x <= max;
}

export function animateLine(line, duration = 2000, delay = () => 0) {
  const totalLength = line.node().getTotalLength();
  line
    .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(duration)
    .delay(delay)
    .attr("stroke-dashoffset", 0)
    .on("end", function onEnd() {
      select(this).attr("stroke-dasharray", 0).attr("stroke-dashoffset", 0);
    });
}
