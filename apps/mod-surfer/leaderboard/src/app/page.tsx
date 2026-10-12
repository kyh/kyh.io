import { formatCount, formatDuration } from "@/lib/format";
import { standings } from "@/lib/standings";

export const revalidate = 10;

const LeaderboardPage = async () => {
  const rows = await standings();
  return (
    <main>
      <h1>Subway Clauders</h1>
      <p>Who kept Claude running the longest. A run ends five seconds after Claude goes quiet.</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th className="num">Tokens</th>
            <th className="num">Coins</th>
            <th className="num">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="empty" colSpan={5}>
                No runs yet.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.name}>
                <td className="rank">{index + 1}</td>
                <td className="name">{row.name}</td>
                <td className="num tokens">{formatCount(row.tokens)}</td>
                <td className="num">{formatCount(row.coins)}</td>
                <td className="num">{formatDuration(row.seconds)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
};

export default LeaderboardPage;
