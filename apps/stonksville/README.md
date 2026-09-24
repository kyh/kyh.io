# Stonksville

> Interactive trading chart game.

Canvas-based live trading chart visualization with candlestick rendering, order book, and particle effects.

The chart replays real S&P 500 history. Each 5-second grid cell is one trading day, played back from the daily open/high/low/close of `^GSPC` (1927 → today). A session starts on a random day with a few years of runway; `?from=1987-10-19` starts on a chosen date.

Ticks inside a day are synthetic: a seeded Brownian bridge from the open through the day's high and low to the close, clamped to the real range. So whether a block gets touched is decided by the real data — the price crosses every level between the day's low and high — and only the wiggle in between is made up. Bars before 1962 carry only a close, so their range is open → close plus a little slack.

Grid rows are geometric (each 0.4% of price) so the game plays the same at 17 in 1928 as at 7,700 in 2026. The vertical range grows to fit whatever history is on screen, so big days are never clipped.

### Data

The history is a CSV in Vercel Blob, served by `/api/spx` through the CDN. The first request seeds the store from Yahoo Finance, and a Vercel Cron (`vercel.json`, weekdays after the US close) re-pulls it via `/api/cron/spx`. If Yahoo is down the stored copy keeps serving. Without a Blob store (local dev) `/api/spx` reads Yahoo directly. See `.env.example`.

## Stack

- Framework - [Next.js](https://nextjs.org/)
- Animation - [Motion](https://motion.dev/)
- Styling - [Tailwind CSS v4](https://tailwindcss.com)

## Development

```bash
pnpm install
pnpm dev:stonksville
```
