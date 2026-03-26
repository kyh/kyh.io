/** Pick a nice time interval in seconds for time axis labels. */
export function niceTimeInterval(windowSecs: number): number {
  if (windowSecs <= 15) return 2
  if (windowSecs <= 30) return 5
  if (windowSecs <= 60) return 10
  if (windowSecs <= 120) return 15
  if (windowSecs <= 300) return 30
  if (windowSecs <= 600) return 60             // 10min → 1min ticks
  if (windowSecs <= 1800) return 300           // 30min → 5min ticks
  if (windowSecs <= 3600) return 600           // 1hr → 10min ticks
  if (windowSecs <= 14400) return 1800         // 4hr → 30min ticks
  if (windowSecs <= 43200) return 3600         // 12hr → 1hr ticks
  if (windowSecs <= 86400) return 7200         // 1day → 2hr ticks
  if (windowSecs <= 604800) return 86400       // 1week → 1day ticks
  return 604800                                // beyond → 1week ticks
}
