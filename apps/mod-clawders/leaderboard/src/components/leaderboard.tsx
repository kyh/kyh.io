import { formatCount, formatDuration } from "@/lib/format";
import type { Standing, Totals } from "@/lib/standings";

// The leaderboard as a terminal prints it: each player's best run, in columns.
export const Leaderboard = ({ standings, totals }: { standings: Standing[]; totals: Totals }) => {
  if (standings.length === 0) {
    return <p className="t-result">⎿ No runs yet. Install the mod and take the top spot.</p>;
  }
  return (
    <>
      <p className="t-say">
        <span className="t-dot">⏺</span> Each player’s best run, by output tokens.{" "}
        {formatCount(totals.tokens)} tokens across {formatCount(totals.players)}{" "}
        {totals.players === 1 ? "player" : "players"} so far.
      </p>
      <table className="t-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th className="num" scope="col">
              Tokens
            </th>
            <th className="num extra" scope="col">
              Coins
            </th>
            <th className="num extra" scope="col">
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, index) => (
            <tr key={row.name}>
              <td className={index === 0 ? "t-clay" : "t-dim"}>{index + 1}</td>
              <td className="name">{row.name}</td>
              <td className={index === 0 ? "num t-clay" : "num"}>{formatCount(row.tokens)}</td>
              <td className="num extra t-dim">{formatCount(row.coins)}</td>
              <td className="num extra t-dim">{formatDuration(row.seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
