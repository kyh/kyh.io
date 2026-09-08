export interface Item {
  title: string;
  description: string;
  url: string;
}

export interface ContactLink {
  label: string;
  value: string;
  url: string;
}

export const name = "Kaiyu Hsu";

// Rendered as the big ASCII logo in the identity panel.
export const callsign = "KYH";

export const heroText = `Hello world. You can call me Kai since we're pretty much friends now. I enjoy creating things for the internet. By day, I get to do that through investing, advising, and building products you may not have heard of, yet. Welcome to my corner of the web.`;

// Readout lines for the STATUS panel.
export const profile = {
  channel: "KYH.IO",
  location: "SAN FRANCISCO, CA",
  role: "DESIGN ENGINEER",
} as const;

// Mirrors apps/kyh/src/lib/data.ts (order, titles, descriptions, urls) —
// keep in sync with the site. Emoji stripped for the terminal.
export const projects: Item[] = [
  {
    description: "A game studio for your agent",
    title: "Vibedgames",
    url: "https://www.vibedgames.com",
  },
  {
    description: "Anonymous love letters written in disappearing ink",
    title: "Yours Sincerely",
    url: "https://www.yourssincerely.org",
  },
  {
    description: "A curated collection of components that spark joy",
    title: "UICapsule",
    url: "https://www.uicapsule.com",
  },
  {
    description: "Initialize your technical team",
    title: "Founding",
    url: "https://www.founding.so",
  },
  {
    description: "An artificially intelligent operating system",
    title: "Inteligir",
    url: "https://www.inteligir.com",
  },
  {
    description:
      "Search the web like a database. Query and transform scattered web information into structured datasets",
    title: "Dataembed",
    url: "https://www.dataembed.com",
  },
  {
    description: "Research into the data between people",
    title: "Edgestories",
    url: "https://www.edgestories.com",
  },
  {
    description:
      "A simple tool to help you navigate tech startup compensation. None of these rosy numbers HR loves to give. No estimation brainwork required. Just fill in the numbers and hit the bank",
    title: "Total Compensation Calculator",
    url: "https://tc.kyh.io",
  },
  {
    description: "A real-time dashboard visualizing global Covid-19 data and trends",
    title: "Covid-19 Dashboard",
    url: "https://covid-19.kyh.io",
  },
  {
    description: "Cute sticker pack",
    title: "Keiko and Friends",
    url: "https://apps.apple.com/us/app/id1209391711",
  },
  {
    description: "Documenting incidents of ICE overreach through crowdsourced video evidence",
    title: "Policing Ice",
    url: "https://www.policingice.com",
  },
  {
    description: "Mock responses for LLMs",
    title: "LoremLLM",
    url: "https://www.loremllm.com",
  },
  {
    description:
      "Minute trading. Realtime trading game where you tap to bet on price up to 90 seconds ahead",
    title: "Stonksville",
    url: "https://www.stonksville.com",
  },
  {
    description: "Everything lives in a 2x2 matrix",
    title: "Kwadrants",
    url: "https://www.kwadrants.com",
  },
  {
    description: "Your feeds as live TV channels of AI-generated video",
    title: "Autoplay",
    url: "https://autoplay.kyh.io",
  },
  {
    description: "An AI native starter kit to build, launch, and scale your next project",
    title: "Init",
    url: "https://init.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring a design canvas UI with AI integration",
    title: "AI Canvas",
    url: "https://canvas.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring an Excel-like UI with AI integration",
    title: "AI Datagrid",
    url: "https://datagrid.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring an AI-powered notes app",
    title: "AI Notes",
    url: "https://notes.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring an AI-powered calendar app",
    title: "AI Calendar",
    url: "https://calendar.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring an AI-powered communications app",
    title: "AI Messages",
    url: "https://coms.kyh.io",
  },
];

export const work: Item[] = [
  {
    description: "Technical Staff",
    title: "Sequoia Capital",
    url: "https://sequoiacap.com",
  },
  {
    description: "Software Engineer",
    title: "Vercel",
    url: "https://vercel.com",
  },
  {
    description: "Design Engineer",
    title: "Google",
    url: "https://grow.google",
  },
  {
    description: "Software Engineer",
    title: "Amazon",
    url: "https://amazon.design",
  },
  {
    description: "Software Engineer",
    title: "Atrium",
    url: "https://www.crunchbase.com/organization/atrium-lts",
  },
  {
    description: "Design Engineer",
    title: "Cardiogram",
    url: "https://www.crunchbase.com/organization/cardiogram",
  },
];

export const contactLinks: ContactLink[] = [
  { label: "Website", url: "https://kyh.io", value: "kyh.io" },
  { label: "GitHub", url: "https://github.com/kyh", value: "github.com/kyh" },
  { label: "X", url: "https://x.com/kaiyuhsu", value: "x.com/kaiyuhsu" },
  {
    label: "LinkedIn",
    url: "https://linkedin.com/in/kyh",
    value: "linkedin.com/in/kyh",
  },
  { label: "Email", url: "mailto:hello@kyh.io", value: "hello@kyh.io" },
];
