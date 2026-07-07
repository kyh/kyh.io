export type Item = {
  title: string;
  description: string;
  url: string;
};

export type ContactLink = {
  label: string;
  value: string;
  url: string;
};

export const name = "Kaiyu Hsu";

// Rendered as the big ASCII logo in the identity panel.
export const callsign = "KYH";

export const heroText = `Hello world. You can call me Kai since we're pretty much friends now. I enjoy creating things for the internet. By day, I get to do that through investing, advising, and building products you may not have heard of, yet. Welcome to my corner of the web.`;

// Readout lines for the STATUS panel.
export const profile = {
  role: "DESIGN ENGINEER",
  location: "SAN FRANCISCO, CA",
  channel: "KYH.IO",
} as const;

// Mirrors apps/kyh/src/lib/data.ts (order, titles, descriptions, urls) —
// keep in sync with the site. Emoji stripped for the terminal.
export const projects: Item[] = [
  {
    title: "Vibedgames",
    description: "A game studio for your agent",
    url: "https://www.vibedgames.com",
  },
  {
    title: "Yours Sincerely",
    description: "Anonymous love letters written in disappearing ink",
    url: "https://www.yourssincerely.org",
  },
  {
    title: "UICapsule",
    description: "A curated collection of components that spark joy",
    url: "https://www.uicapsule.com",
  },
  {
    title: "Founding",
    description: "Initialize your technical team",
    url: "https://www.founding.so",
  },
  {
    title: "Inteligir",
    description: "An artificially intelligent operating system",
    url: "https://www.inteligir.com",
  },
  {
    title: "Dataembed",
    description:
      "Search the web like a database. Query and transform scattered web information into structured datasets",
    url: "https://www.dataembed.com",
  },
  {
    title: "Edgestories",
    description: "Research into the data between people",
    url: "https://www.edgestories.com",
  },
  {
    title: "Total Compensation Calculator",
    description:
      "A simple tool to help you navigate tech startup compensation. None of these rosy numbers HR loves to give. No estimation brainwork required. Just fill in the numbers and hit the bank",
    url: "https://tc.kyh.io",
  },
  {
    title: "Covid-19 Dashboard",
    description: "A real-time dashboard visualizing global Covid-19 data and trends",
    url: "https://covid-19.kyh.io",
  },
  {
    title: "Keiko and Friends",
    description: "Cute sticker pack",
    url: "https://apps.apple.com/us/app/id1209391711",
  },
  {
    title: "Policing Ice",
    description: "Documenting incidents of ICE overreach through crowdsourced video evidence",
    url: "https://www.policingice.com",
  },
  {
    title: "LoremLLM",
    description: "Mock responses for LLMs",
    url: "https://www.loremllm.com",
  },
  {
    title: "Stonksville",
    description:
      "Minute trading. Realtime trading game where you tap to bet on price up to 90 seconds ahead",
    url: "https://www.stonksville.com",
  },
  {
    title: "Kwadrants",
    description: "Everything lives in a 2x2 matrix",
    url: "https://www.kwadrants.com",
  },
  {
    title: "Init",
    description: "An AI native starter kit to build, launch, and scale your next project",
    url: "https://init.kyh.io",
  },
  {
    title: "AI Canvas",
    description: "Forkable Next.js template featuring a design canvas UI with AI integration",
    url: "https://canvas.kyh.io",
  },
  {
    title: "AI Datagrid",
    description: "Forkable Next.js template featuring an Excel-like UI with AI integration",
    url: "https://datagrid.kyh.io",
  },
  {
    title: "AI Notes",
    description: "Forkable Next.js template featuring an AI-powered notes app",
    url: "https://notes.kyh.io",
  },
  {
    title: "AI Calendar",
    description: "Forkable Next.js template featuring an AI-powered calendar app",
    url: "https://calendar.kyh.io",
  },
  {
    title: "AI Messages",
    description: "Forkable Next.js template featuring an AI-powered communications app",
    url: "https://coms.kyh.io",
  },
];

export const work: Item[] = [
  {
    title: "Sequoia Capital",
    description: "Technical Staff",
    url: "https://sequoiacap.com",
  },
  {
    title: "Vercel",
    description: "Software Engineer",
    url: "https://vercel.com",
  },
  {
    title: "Google",
    description: "Design Engineer",
    url: "https://grow.google",
  },
  {
    title: "Amazon",
    description: "Software Engineer",
    url: "https://amazon.design",
  },
  {
    title: "Atrium",
    description: "Software Engineer",
    url: "https://www.crunchbase.com/organization/atrium-lts",
  },
  {
    title: "Cardiogram",
    description: "Design Engineer",
    url: "https://www.crunchbase.com/organization/cardiogram",
  },
];

export const contactLinks: ContactLink[] = [
  { label: "Website", value: "kyh.io", url: "https://kyh.io" },
  { label: "GitHub", value: "github.com/kyh", url: "https://github.com/kyh" },
  { label: "X", value: "x.com/kaiyuhsu", url: "https://x.com/kaiyuhsu" },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/kyh",
    url: "https://linkedin.com/in/kyh",
  },
  { label: "Email", value: "hello@kyh.io", url: "mailto:hello@kyh.io" },
];
