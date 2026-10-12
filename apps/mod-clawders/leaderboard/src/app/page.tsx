import { Coin } from "@/components/coin";
import { Demo } from "@/components/demo";
import { formatCount, formatDuration } from "@/lib/format";
import { SOURCE_URL } from "@/lib/site";
import { standings, totals } from "@/lib/standings";

export const revalidate = 10;

const LeaderboardPage = async () => {
  const [rows, total] = await Promise.all([standings(), totals()]);
  return (
    <>
      <main>
        <h1 className="visually-hidden">Clawders</h1>
        <Demo />

        <section aria-labelledby="leaderboard" className="track">
          <div className="inner">
            <h2 className="stroked" id="leaderboard">
              Leaderboard
            </h2>
            <p className="section-lede">
              Each player’s best run, by output tokens.{" "}
              {total.players > 0
                ? `${formatCount(total.tokens)} tokens and ${formatCount(total.coins)} coins across ${formatCount(total.players)} ${total.players === 1 ? "player" : "players"} so far.`
                : ""}
            </p>
            {rows.length === 0 ? (
              <p className="empty">No runs yet. Install the mod and take the top spot.</p>
            ) : (
              <ol className="board">
                {rows.map((row, index) => (
                  <li className="board-row" key={row.name}>
                    <span className="rank">
                      {index === 0 ? <Coin className="coin" /> : null}
                      <span className={index === 0 ? "visually-hidden" : undefined}>
                        {index + 1}
                      </span>
                    </span>
                    <span className="name">{row.name}</span>
                    <span className="tokens">
                      {formatCount(row.tokens)}
                      <small> tokens</small>
                    </span>
                    <span className="detail">
                      <span>{formatCount(row.coins)} coins</span>
                      <span>{formatDuration(row.seconds)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>

      <footer className="grass">
        <p>
          Made by <a href="https://kyh.io">Kaiyu Hsu</a>. <a href={SOURCE_URL}>Source on GitHub</a>.
        </p>
      </footer>
    </>
  );
};

export default LeaderboardPage;
