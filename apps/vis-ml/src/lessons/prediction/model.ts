import type { SalaryObservation } from "./data";

export type RegressionModel = {
  weight: number;
  bias: number;
};

export function predict(model: RegressionModel, years: number) {
  return model.weight * years + model.bias;
}

export function meanAbsoluteError(
  model: RegressionModel,
  observations: readonly SalaryObservation[],
) {
  if (observations.length === 0) return 0;

  const totalError = observations.reduce(
    (sum, observation) => sum + Math.abs(observation.salary - predict(model, observation.years)),
    0,
  );

  return totalError / observations.length;
}

export function makeFirstGuess(observations: readonly SalaryObservation[]): RegressionModel {
  if (observations.length === 0) return { weight: 0, bias: 0 };

  const totals = observations.reduce(
    (result, observation) => ({
      years: result.years + observation.years,
      salary: result.salary + observation.salary,
    }),
    { years: 0, salary: 0 },
  );

  const weight = totals.years === 0 ? 0 : totals.salary / totals.years;
  return { weight: Math.round(weight / 100) * 100, bias: 0 };
}

export function fitLeastSquares(observations: readonly SalaryObservation[]): RegressionModel {
  if (observations.length === 0) return { weight: 0, bias: 0 };

  const means = observations.reduce(
    (result, observation) => ({
      years: result.years + observation.years / observations.length,
      salary: result.salary + observation.salary / observations.length,
    }),
    { years: 0, salary: 0 },
  );

  const sums = observations.reduce(
    (result, observation) => {
      const centeredYears = observation.years - means.years;
      return {
        covariance: result.covariance + centeredYears * (observation.salary - means.salary),
        variance: result.variance + centeredYears * centeredYears,
      };
    },
    { covariance: 0, variance: 0 },
  );

  if (sums.variance === 0) return { weight: 0, bias: Math.round(means.salary / 100) * 100 };

  const weight = sums.covariance / sums.variance;
  const bias = means.salary - weight * means.years;

  return {
    weight: Math.round(weight / 100) * 100,
    bias: Math.round(bias / 100) * 100,
  };
}
