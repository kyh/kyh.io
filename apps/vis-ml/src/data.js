import zipWith from "lodash/zipWith";

const yearsExperience = [1, 2.2, 3.4, 5.8, 7.2, 8.3, 9, 10.3, 11];
const salaries = [
  39000, 46200, 37700, 43500, 60150, 54500, 64440, 57190, 63200,
];

const data = zipWith(yearsExperience, salaries, (year, salary) => ({
  x: year,
  y: salary,
}));

export default data;
