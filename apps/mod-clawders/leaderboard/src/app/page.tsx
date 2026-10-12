import Image from "next/image";

import { Coin } from "@/components/coin";
import { CopyCommand } from "@/components/copy-command";
import { formatCount, formatDuration } from "@/lib/format";
import { INSTALL_COMMAND, SHELL_INSTALL, SOURCE_URL } from "@/lib/site";
import { standings, totals } from "@/lib/standings";

export const revalidate = 10;

const DEMO = { coins: 16, tokens: 4821 };

const LeaderboardPage = async () => {
  const [rows, total] = await Promise.all([standings(), totals()]);
  return (
    <>
      <header className="hud">
        <p className="pill score" title="Output tokens across every run">
          <span className="visually-hidden">Tokens spent across every run: </span>
          {formatCount(total.tokens)}
        </p>
        <p className="pill coins" title="Coins across every run">
          <Coin className="coin spin" />
          <span className="visually-hidden">Coins: </span>
          {formatCount(total.coins)}
        </p>
      </header>

      <main>
        <section className="hero">
          <h1 className="stroked">Clawders</h1>
          <p className="lede">
            An endless runner for Claude Code. Clawd runs while Claude works, and every token Claude
            writes is a point. Go quiet for five seconds and the run is over.
          </p>
          <CopyCommand command={INSTALL_COMMAND} />
          <p className="hint">Paste it into Claude Code. Needs Google Chrome and Node.</p>

          <figure className="pane">
            <div className="pane-bar">
              <span>Clawders</span>
              <span aria-hidden="true">×</span>
            </div>
            <div className="pane-screen">
              <Image
                alt="Clawd running down the tracks past a barrier, coins ahead, tagged walls and trees on both sides"
                height={820}
                priority
                sizes="(max-width: 760px) 100vw, 720px"
                src="/frame.jpg"
                width={1280}
              />
              <div aria-hidden="true" className="pane-hud">
                <span className="pill score">{formatCount(DEMO.tokens)}</span>
                <span className="pill coins">
                  <Coin className="coin" />
                  {DEMO.coins}
                </span>
              </div>
            </div>
            <figcaption className="pane-status">
              ● LIVE · {formatCount(DEMO.tokens)} tokens · ● {DEMO.coins}
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="leaderboard" className="track">
          <div className="inner">
            <h2 className="stroked" id="leaderboard">
              Leaderboard
            </h2>
            <p className="section-lede">
              Each player’s best run, by output tokens.{" "}
              {total.players > 0
                ? `${formatCount(total.players)} ${total.players === 1 ? "player has" : "players have"} run so far.`
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

        <section aria-labelledby="install" className="wall">
          <span aria-hidden="true" className="tag tag-opus">
            OPUS
          </span>
          <span aria-hidden="true" className="tag tag-haiku">
            HAIKU
          </span>
          <div className="inner">
            <h2 className="stroked" id="install">
              Get on the board
            </h2>
            <ol className="steps">
              <li>
                <h3>Install the mod</h3>
                <CopyCommand command={INSTALL_COMMAND} />
                <p>Or from a shell:</p>
                {SHELL_INSTALL.map((command) => (
                  <CopyCommand command={command} key={command} />
                ))}
              </li>
              <li>
                <h3>Have Chrome and Node</h3>
                <p>
                  Clawders draws the game in your installed Google Chrome, headless, and streams it
                  with Node. kitty and Ghostty show the real picture; other terminals get blocks.
                  Start Claude Code with <code>CLAUDE_CODE_NO_FLICKER=1</code> so the pane docks on
                  the right.
                </p>
              </li>
              <li>
                <h3>Keep Claude busy</h3>
                <p>
                  Send a prompt and the run starts. When Claude finishes you have five seconds to
                  send the next one. Miss it and the run lands here under your git name; change it
                  in <code>/config</code>.
                </p>
              </li>
            </ol>
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
