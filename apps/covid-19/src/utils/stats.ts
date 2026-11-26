export const growthRate = (yesterday: number, today: number) =>
  (((today - yesterday) / yesterday) * 100).toFixed(2);
