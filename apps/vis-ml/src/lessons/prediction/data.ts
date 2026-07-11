export type SalaryObservation = {
  id: string;
  years: number;
  salary: number;
};

export const salaryData: readonly SalaryObservation[] = [
  { id: "A", years: 1, salary: 39_000 },
  { id: "B", years: 2.2, salary: 46_200 },
  { id: "C", years: 3.4, salary: 37_700 },
  { id: "D", years: 5.8, salary: 43_500 },
  { id: "E", years: 7.2, salary: 60_150 },
  { id: "F", years: 8.3, salary: 54_500 },
  { id: "G", years: 9, salary: 64_440 },
  { id: "H", years: 10.3, salary: 57_190 },
  { id: "I", years: 11, salary: 63_200 },
];
