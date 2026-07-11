# COVID-19 Dashboard

[🚀 Live Site](https://covid-19.kyh.io)

> COVID-19 tracking dashboard for the US

![alt text](https://cdn.dribbble.com/users/237579/screenshots/14289162/media/3e5848d894c24e98a9e07d956a616a2d.png?resize=800x600)

## Directory Layout

```
├── /src                         # ReactJS client, which contains most of our UI
│   ├── /components              # React components, reusable across all pages
│   ├── /data                    # Static data snapshots
│   ├── /features                # App routes and feature specific code
│   ├── /hooks                   # React hooks
│   └── /utils                   # Client side helper functions/Utilities/Services
└── /public                      # Static assets served as-is by Vite
```

## Stack

- Framework - [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- Visualization - [D3](https://d3js.org/)
- Styling - [Tailwind CSS](https://tailwindcss.com)
- Data - archived snapshot of [The COVID Tracking Project](https://covidtracking.com/) (the live API was retired in 2021)
- Hosting - [Cloudflare Pages](https://pages.cloudflare.com/)

## Development

```bash
pnpm install
pnpm dev:covid
```
