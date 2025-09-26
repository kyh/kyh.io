# COVID-19 Dashboard

[🚀 Live Site](https://covid-19.kyh.io)

> COVID-19 tracking dashboard for the US

![alt text](https://cdn.dribbble.com/users/237579/screenshots/14289162/media/3e5848d894c24e98a9e07d956a616a2d.png?resize=800x600)

## Directory Layout

```
├── /src                         # ReactJS client, which contains most of our UI
│   ├── /components              # React components, reusable across all pages
│   ├── /css                     # Global style definitions
│   ├── /features                # App routes and feature specific code
│   ├── /hooks                   # React hooks
│   └── /utils                   # Client side helper functions/Utilities/Services
└── /public                      # Static assets served as-is by Vite
```

## Setting up

```bash
npm i
# Run in dev mode
npm run dev
# Create a production build
npm run build
```

This project is built with [Vite](https://vitejs.dev/) and [React](https://react.dev/).

API data comes from [The COVID Tracking Project](https://covidtracking.com/)

## Deployment

The site will autodeploy with Cloudflare Pages whenever merged to `main`
