export const growthRate = (yesterday, today) => {
  return (((today - yesterday) / yesterday) * 100).toFixed(2);
};

export const growthRateDifference = (twoDaysAgo, yesterday, today) => {
  const todayGrowth = growthRate(yesterday, today);
  const yesterdayGrowth = growthRate(twoDaysAgo, yesterday);
  const difference = todayGrowth - yesterdayGrowth;

  return difference;
};
