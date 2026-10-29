import { social } from "@/lib/social";
import { getPublicFaviconUrl } from "@/lib/public-assets";

export interface ProjectType {
  slug: string;
  title: string;
  description: string;
  url: string;
  favicon: string;
  /** The colors its icon is known by, the main one first; a grey alone for a black and white icon. */
  colors?: readonly string[];
  type: "venture" | "project" | "mini-app" | "template";
}

export const projects: ProjectType[] = [
  {
    colors: ["#c1272d", "#8e1b20", "#e2474c", "#5c1014"],
    description: "A game studio for your agent",
    favicon: getPublicFaviconUrl("vibedgames-c.png"),
    slug: "vibedgames",
    title: "Vibedgames",
    type: "project",
    url: "https://www.vibedgames.com",
  },
  {
    colors: ["#5e6286"],
    description: "Anonymous love letters 💌 written in disappearing ink",
    favicon: getPublicFaviconUrl("yourssincerely-c.png"),
    slug: "yourssincerely",
    title: "Yours Sincerely",
    type: "project",
    url: "https://www.yourssincerely.org",
  },
  {
    colors: ["#fe5c28"],
    description: "A curated collection of components that spark joy",
    favicon: getPublicFaviconUrl("uicapsule-c.png"),
    slug: "uicapsule",
    title: "UICapsule",
    type: "project",
    url: "https://www.uicapsule.com",
  },
  {
    colors: ["#13778f"],
    description: "Initialize your technical team",
    favicon: getPublicFaviconUrl("founding-c.png"),
    slug: "founding",
    title: "Founding",
    type: "venture",
    url: "https://www.founding.so",
  },
  {
    colors: ["#2b2d2e"],
    description: "An artificially intelligent operating system",
    favicon: getPublicFaviconUrl("inteligir-c.png"),
    slug: "inteligir",
    title: "Inteligir",
    type: "project",
    url: "https://www.inteligir.com",
  },
  {
    colors: ["#4b2e6b", "#6a3d9a", "#8e6bbf", "#b59ad8", "#5a3a7e", "#7d4fb0", "#3d2459"],
    description:
      "Search the web like a database. Query and transform scattered web information into structured datasets",
    favicon: getPublicFaviconUrl("dataembed-1-c.png"),
    slug: "dataembed",
    title: "Dataembed",
    type: "project",
    url: "https://www.dataembed.com",
  },
  {
    colors: ["#58847b"],
    description: "Research into the data between people",
    favicon: getPublicFaviconUrl("edgestories-1-c.png"),
    slug: "edgestories",
    title: "Edgestories",
    type: "project",
    url: "https://www.edgestories.com",
  },
  // Mini Apps
  {
    colors: ["#207e56"],
    description:
      "A simple tool to help you navigate tech startup compensation. None of these rosy numbers HR loves to give. No estimation brainwork required. Just fill in the numbers and hit the bank",
    favicon: getPublicFaviconUrl("tc-2.png"),
    slug: "total-compensation-calculator",
    title: "Total Compensation Calculator",
    type: "mini-app",
    url: "https://tc.kyh.io",
  },
  {
    colors: ["#6875f4"],
    description: "A real-time dashboard visualizing global Covid-19 data and trends",
    favicon: getPublicFaviconUrl("covid-19-1.png"),
    slug: "covid-19-dashboard",
    title: "Covid-19 Dashboard",
    type: "mini-app",
    url: "https://covid-19.kyh.io",
  },
  {
    colors: ["#e8559a", "#f4a6c8"],
    description: "Cute sticker pack",
    favicon: getPublicFaviconUrl("keiko.png"),
    slug: "keiko-and-friends",
    title: "Keiko and Friends",
    type: "mini-app",
    url: "https://apps.apple.com/us/app/id1209391711",
  },
  {
    colors: ["#f8e778"],
    description: "Documenting incidents of ICE overreach through crowdsourced video evidence",
    favicon: getPublicFaviconUrl("policing-ice-1.png"),
    slug: "policing-ice",
    title: "Policing Ice",
    type: "mini-app",
    url: "https://www.policingice.com",
  },
  {
    colors: ["#000000"],
    description: "Mock responses for LLMs",
    favicon: getPublicFaviconUrl("loremllm.png"),
    slug: "loremllm",
    title: "LoremLLM",
    type: "mini-app",
    url: "https://www.loremllm.com",
  },
  {
    colors: ["#6dc354"],
    description:
      "Minute trading. Realtime trading game where you tap to bet on price up to 90 seconds ahead",
    favicon: getPublicFaviconUrl("stonksville.png"),
    slug: "stonksville",
    title: "Stonksville",
    type: "mini-app",
    url: "https://www.stonksville.com",
  },
  {
    colors: ["#1a2b50", "#fdebb2"],
    description: "Everything lives in a 2x2 matrix",
    favicon: getPublicFaviconUrl("kwadrants-1.png"),
    slug: "kwadrants",
    title: "Kwadrants",
    type: "mini-app",
    url: "https://www.kwadrants.com",
  },
  {
    colors: ["#de35df"],
    description: "Your feeds as live TV channels of AI-generated video",
    favicon: getPublicFaviconUrl("autoplay.png"),
    slug: "autoplay",
    title: "Autoplay",
    type: "mini-app",
    url: "https://autoplay.kyh.io",
  },
  {
    colors: ["#d97757"],
    description: "Keep Clawd running. An endless runner that plays while Claude Code works",
    favicon: getPublicFaviconUrl("clawders.png"),
    slug: "clawders",
    title: "Commuting Clawders",
    type: "mini-app",
    url: "https://clawders.kyh.io",
  },
  {
    colors: ["#466cb0"],
    description:
      "An idle business sim where your employees are real AI agents. They write real code and ship real products",
    favicon: getPublicFaviconUrl("idlebiz-2.png"),
    slug: "idlebiz",
    title: "IdleBiz",
    type: "mini-app",
    url: "https://idlebiz.com",
  },
  // Templates
  {
    colors: ["#000000"],
    description: "An AI native starter kit to build, launch, and scale your next project",
    favicon: getPublicFaviconUrl("init.png"),
    slug: "init",
    title: "Init",
    type: "template",
    url: "https://init.kyh.io",
  },
  {
    colors: ["#000000"],
    description: "Forkable Next.js template featuring a design canvas UI with AI integration",
    favicon: getPublicFaviconUrl("ai-design-canvas.png"),
    slug: "ai-canvas",
    title: "AI Canvas",
    type: "template",
    url: "https://canvas.kyh.io",
  },
  {
    colors: ["#000000"],
    description: "Forkable Next.js template featuring an Excel-like UI with AI integration",
    favicon: getPublicFaviconUrl("ai-datagrid.png"),
    slug: "ai-datagrid",
    title: "AI Datagrid",
    type: "template",
    url: "https://datagrid.kyh.io",
  },
  {
    colors: ["#000000"],
    description: "Forkable Next.js template featuring an AI-powered notes app",
    favicon: getPublicFaviconUrl("ai-notes.png"),
    slug: "ai-notes",
    title: "AI Notes",
    type: "template",
    url: "https://notes.kyh.io",
  },
  {
    colors: ["#000000"],
    description: "Forkable Next.js template featuring an AI-powered calendar app",
    favicon: getPublicFaviconUrl("ai-schedule.png"),
    slug: "ai-schedule",
    title: "AI Calendar",
    type: "template",
    url: "https://calendar.kyh.io",
  },
  {
    colors: ["#000000"],
    description: "Forkable Next.js template featuring an AI-powered communications app",
    favicon: getPublicFaviconUrl("ai-coms.png"),
    slug: "ai-coms",
    title: "AI Messages",
    type: "template",
    url: "https://coms.kyh.io",
  },
] as const;

export interface WorkType {
  role: string;
  company: string;
  year: string;
  favicon: string;
  link: string;
}

export type SocialKind = "twitter" | "github" | "dribbble" | "linkedin";

export interface ConnectLink {
  label: string;
  value: string;
  href: string;
  social: SocialKind;
}

// Single source of truth for social links, consumed by the homepage
// ConnectList and the /markdown agent view so they can't drift.
export const connectLinks: ConnectLink[] = [
  { href: social.twitter, label: "Twitter", social: "twitter", value: "@kaiyuhsu" },
  { href: social.github, label: "GitHub", social: "github", value: "@kyh" },
  { href: social.dribbble, label: "Dribbble", social: "dribbble", value: "@kaiyuhsu" },
  { href: social.linkedin, label: "LinkedIn", social: "linkedin", value: "@kyh" },
];

export const workHistory: WorkType[] = [
  {
    company: "Sequoia Capital",
    favicon: getPublicFaviconUrl("sequoia.png"),
    link: "https://sequoiacap.com",
    role: "Technical Staff",
    year: "Now",
  },
  {
    company: "Vercel",
    favicon: getPublicFaviconUrl("vercel.png"),
    link: "https://vercel.com",
    role: "Software Engineer",
    year: "2022",
  },
  {
    company: "Google",
    favicon: getPublicFaviconUrl("google.png"),
    link: "https://grow.google",
    role: "Design Engineer",
    year: "2022",
  },
  {
    company: "Amazon",
    favicon: getPublicFaviconUrl("amazon.jpeg"),
    link: "https://amazon.design",
    role: "Software Engineer",
    year: "2020",
  },
  {
    company: "Atrium",
    favicon: getPublicFaviconUrl("atrium-1.png"),
    link: "https://www.crunchbase.com/organization/atrium-lts",
    role: "Software Engineer",
    year: "2019",
  },
  {
    company: "Cardiogram",
    favicon: getPublicFaviconUrl("cardiogram.jpeg"),
    link: "https://www.crunchbase.com/organization/cardiogram",
    role: "Design Engineer",
    year: "2015",
  },
] as const;
