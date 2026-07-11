import assert from "node:assert/strict";
import test from "node:test";

import { salaryData } from "./data";
import { fitLeastSquares, makeFirstGuess, meanAbsoluteError, predict } from "./model";

test("predicts from weight and bias", () => {
  assert.equal(predict({ weight: 2_500, bias: 35_000 }, 4), 45_000);
});

test("fits the salary observations better than the first guess", () => {
  const guess = makeFirstGuess(salaryData);
  const fitted = fitLeastSquares(salaryData);

  assert.deepEqual(guess, { weight: 8_000, bias: 0 });
  assert.deepEqual(fitted, { weight: 2_500, bias: 35_600 });
  assert.ok(meanAbsoluteError(fitted, salaryData) < meanAbsoluteError(guess, salaryData));
});

test("empty data has a valid zero model and zero error", () => {
  assert.deepEqual(makeFirstGuess([]), { weight: 0, bias: 0 });
  assert.deepEqual(fitLeastSquares([]), { weight: 0, bias: 0 });
  assert.equal(meanAbsoluteError({ weight: 1, bias: 1 }, []), 0);
});
