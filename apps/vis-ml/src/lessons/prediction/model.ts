import type { SalaryObservation } from "./data";

export interface RegressionModel {
  weight: number;
  bias: number;
}

const sum = (values: readonly number[]) => {
  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total;
};

export const predict = (model: RegressionModel, years: number) => model.weight * years + model.bias;

export const meanAbsoluteError = (
  model: RegressionModel,
  observations: readonly SalaryObservation[],
) => {
  if (observations.length === 0) {
    return 0;
  }

  const totalError = sum(
    observations.map((observation) =>
      Math.abs(observation.salary - predict(model, observation.years)),
    ),
  );

  return totalError / observations.length;
};

export const makeFirstGuess = (observations: readonly SalaryObservation[]) => {
  if (observations.length === 0) {
    return { bias: 0, weight: 0 } satisfies RegressionModel;
  }

  const years = sum(observations.map((observation) => observation.years));
  const salary = sum(observations.map((observation) => observation.salary));
  const weight = years === 0 ? 0 : salary / years;

  return { bias: 0, weight: Math.round(weight / 100) * 100 } satisfies RegressionModel;
};

export const fitLeastSquares = (observations: readonly SalaryObservation[]) => {
  if (observations.length === 0) {
    return { bias: 0, weight: 0 } satisfies RegressionModel;
  }

  const meanYears = sum(observations.map((observation) => observation.years)) / observations.length;

  const meanSalary =
    sum(observations.map((observation) => observation.salary)) / observations.length;

  const covariance = sum(
    observations.map(
      (observation) => (observation.years - meanYears) * (observation.salary - meanSalary),
    ),
  );

  const variance = sum(observations.map((observation) => (observation.years - meanYears) ** 2));

  if (variance === 0) {
    return { bias: Math.round(meanSalary / 100) * 100, weight: 0 } satisfies RegressionModel;
  }

  const weight = covariance / variance;
  const bias = meanSalary - weight * meanYears;

  return {
    bias: Math.round(bias / 100) * 100,
    weight: Math.round(weight / 100) * 100,
  } satisfies RegressionModel;
};
