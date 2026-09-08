import { social } from "@/components/social";
import { getPublicAssetUrl, getPublicFaviconUrl } from "@/lib/public-assets";

export interface ProjectType {
  slug: string;
  title: string;
  description: string;
  url: string;
  favicon: string;
  projectAssets: ProjectAssetType[];
  type: "venture" | "project" | "mini-app" | "template";
}

interface ProjectAssetType {
  src: string;
  type: "image" | "video";
  aspectRatio?: "16:9" | "4:3";
  description?: string;
  dataBlur?: string;
}

export const projects: ProjectType[] = [
  {
    description: "A game studio for your agent",
    favicon: getPublicFaviconUrl("vibedgames-c.png"),
    projectAssets: [
      {
        src: getPublicAssetUrl("vibedgames.mp4"),
        type: "video",
      },
      {
        aspectRatio: "16:9",
        src: getPublicAssetUrl("pacman.mp4"),
        type: "video",
      },
      {
        aspectRatio: "16:9",
        src: getPublicAssetUrl("flappy.mp4"),
        type: "video",
      },
      {
        aspectRatio: "16:9",
        src: getPublicAssetUrl("pong.mp4"),
        type: "video",
      },
    ],
    slug: "vibedgames",
    title: "Vibedgames",
    type: "project",
    url: "https://www.vibedgames.com",
  },
  {
    description: "Anonymous love letters 💌 written in disappearing ink",
    favicon: getPublicFaviconUrl("yourssincerely-c.png"),
    projectAssets: [
      {
        dataBlur:
          "data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAAAwAgCdASoQAAwAAUAmJaACdAEXubBHzPstwAD0ZOFZFDNEv1GcgJuIQsF7FKkObWMZEvmAVVcg3CNWlmjn0hWF/u44eMQUJn943B+usgCfjK3H1zS4K+5UzhR64AAA",
        src: getPublicAssetUrl("ys.webp"),
        type: "image",
      },
      {
        aspectRatio: "16:9",
        src: getPublicAssetUrl("ys.mp4"),
        type: "video",
      },
      {
        aspectRatio: "16:9",
        src: getPublicAssetUrl("ys-2.mp4"),
        type: "video",
      },
    ],
    slug: "yourssincerely",
    title: "Yours Sincerely",
    type: "project",
    url: "https://www.yourssincerely.org",
  },
  {
    description: "A curated collection of components that spark joy",
    favicon: getPublicFaviconUrl("uicapsule-c.png"),
    projectAssets: [
      {
        dataBlur:
          "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAwAgCdASoQAAwAAUAmJZwCdIExGBjScIj3AAD+/sYZZecDsl3PR5dQ/ZmFfvxk7Ws/2VYmsUfxLG0pnynnuvVYrpjy3UXYSKw/3INfiTyGZTrNcAA=",
        src: getPublicAssetUrl("uicapsule.webp"),
        type: "image",
      },
      {
        src: getPublicAssetUrl("globe.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("parallax.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("infinite-grid.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("astroids.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("ascii.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("ios-volume.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("ios-header-menu.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("reading-progress.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("radial-slider.mp4"),
        type: "video",
      },
    ],
    slug: "uicapsule",
    title: "UICapsule",
    type: "project",
    url: "https://www.uicapsule.com",
  },
  {
    description: "Initialize your technical team",
    favicon: getPublicFaviconUrl("founding-c.png"),
    projectAssets: [
      {
        dataBlur:
          "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACQAQCdASoQAAgAAUAmJZwC7H8AHIAA/vyn53W6rmzbDsOD67FpggQRemJVpupEpwAAAA==",
        src: getPublicAssetUrl("founding.webp"),
        type: "image",
      },
      {
        src: getPublicAssetUrl("founding-1.webp"),
        type: "image",
      },
    ],
    slug: "founding",
    title: "Founding",
    type: "venture",
    url: "https://www.founding.so",
  },
  {
    description: "An artificially intelligent operating system",
    favicon: getPublicFaviconUrl("inteligir-c.png"),
    projectAssets: [],
    slug: "inteligir",
    title: "Inteligir",
    type: "project",
    url: "https://www.inteligir.com",
  },
  {
    description:
      "Search the web like a database. Query and transform scattered web information into structured datasets",
    favicon: getPublicFaviconUrl("dataembed-1-c.png"),
    projectAssets: [
      {
        src: getPublicAssetUrl("dataembed.mp4"),
        type: "video",
      },
      {
        src: getPublicAssetUrl("dataembed-1.webp"),
        type: "image",
      },
    ],
    slug: "dataembed",
    title: "Dataembed",
    type: "project",
    url: "https://www.dataembed.com",
  },
  {
    description: "Research into the data between people",
    favicon: getPublicFaviconUrl("edgestories-1-c.png"),
    projectAssets: [],
    slug: "edgestories",
    title: "Edgestories",
    type: "project",
    url: "https://www.edgestories.com",
  },
  // Mini Apps
  {
    description:
      "A simple tool to help you navigate tech startup compensation. None of these rosy numbers HR loves to give. No estimation brainwork required. Just fill in the numbers and hit the bank",
    favicon: getPublicFaviconUrl("tc-2.png"),
    projectAssets: [
      {
        dataBlur:
          "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADwAQCdASoQAAwAAUAmJQBOgCP/2Rtk5AAA/v0X8ETwDumeYkE4wslUaJKeR8yv3Y80opDLuqTqk+tpiAA=",
        src: getPublicAssetUrl("tc.webp"),
        type: "image",
      },
    ],
    slug: "total-compensation-calculator",
    title: "Total Compensation Calculator",
    type: "mini-app",
    url: "https://tc.kyh.io",
  },
  {
    description: "A real-time dashboard visualizing global Covid-19 data and trends",
    favicon: getPublicFaviconUrl("covid-19-1.png"),
    projectAssets: [
      {
        dataBlur:
          "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoQAAwAAUAmJQBOgCHw3N8oAP79nRPM1rR6f3natj7PvZau2tOobhEqOtCAAA==",
        src: getPublicAssetUrl("covid19.webp"),
        type: "image",
      },
      {
        src: getPublicAssetUrl("covid19-1.webp"),
        type: "image",
      },
    ],
    slug: "covid-19-dashboard",
    title: "Covid-19 Dashboard",
    type: "mini-app",
    url: "https://covid-19.kyh.io",
  },
  {
    description: "Cute sticker pack",
    favicon: getPublicFaviconUrl("keiko.png"),
    projectAssets: [
      {
        dataBlur:
          "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAgCdASoQAAwAAUAmJYwCdAD0ikApuuAAAP7+mkH3G+z+NDoe9ydN17TBCmONmSaqlqIXR6uLgpRujwewAV4bB8JzlHN4q5RygJTAtYILfs0AAAA=",
        src: getPublicAssetUrl("keiko.webp"),
        type: "image",
      },
    ],
    slug: "keiko-and-friends",
    title: "Keiko and Friends",
    type: "mini-app",
    url: "https://apps.apple.com/us/app/id1209391711",
  },
  {
    description: "Documenting incidents of ICE overreach through crowdsourced video evidence",
    favicon: getPublicFaviconUrl("policing-ice-1.png"),
    projectAssets: [],
    slug: "policing-ice",
    title: "Policing Ice",
    type: "mini-app",
    url: "https://www.policingice.com",
  },
  {
    description: "Mock responses for LLMs",
    favicon: getPublicFaviconUrl("loremllm.png"),
    projectAssets: [],
    slug: "loremllm",
    title: "LoremLLM",
    type: "mini-app",
    url: "https://www.loremllm.com",
  },
  {
    description:
      "Minute trading. Realtime trading game where you tap to bet on price up to 90 seconds ahead",
    favicon: getPublicFaviconUrl("stonksville.png"),
    projectAssets: [],
    slug: "stonksville",
    title: "Stonksville",
    type: "mini-app",
    url: "https://www.stonksville.com",
  },
  {
    description: "Everything lives in a 2x2 matrix",
    favicon: getPublicFaviconUrl("kwadrants-1.png"),
    projectAssets: [],
    slug: "kwadrants",
    title: "Kwadrants",
    type: "mini-app",
    url: "https://www.kwadrants.com",
  },
  {
    description: "Your feeds as live TV channels of AI-generated video",
    favicon: getPublicFaviconUrl("autoplay.png"),
    projectAssets: [],
    slug: "autoplay",
    title: "Autoplay",
    type: "mini-app",
    url: "https://autoplay.kyh.io",
  },
  // Templates
  {
    description: "An AI native starter kit to build, launch, and scale your next project",
    favicon: getPublicFaviconUrl("init.png"),
    projectAssets: [
      {
        dataBlur:
          "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
        src: getPublicAssetUrl("init.webp"),
        type: "image",
      },
    ],
    slug: "init",
    title: "Init",
    type: "template",
    url: "https://init.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring a design canvas UI with AI integration",
    favicon: getPublicFaviconUrl("ai-design-canvas.png"),
    projectAssets: [],
    slug: "ai-canvas",
    title: "AI Canvas",
    type: "template",
    url: "https://canvas.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring an Excel-like UI with AI integration",
    favicon: getPublicFaviconUrl("ai-datagrid.png"),
    projectAssets: [],
    slug: "ai-datagrid",
    title: "AI Datagrid",
    type: "template",
    url: "https://datagrid.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring an AI-powered notes app",
    favicon: getPublicFaviconUrl("ai-notes.png"),
    projectAssets: [],
    slug: "ai-notes",
    title: "AI Notes",
    type: "template",
    url: "https://notes.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring an AI-powered calendar app",
    favicon: getPublicFaviconUrl("ai-schedule.png"),
    projectAssets: [],
    slug: "ai-schedule",
    title: "AI Calendar",
    type: "template",
    url: "https://calendar.kyh.io",
  },
  {
    description: "Forkable Next.js template featuring an AI-powered communications app",
    favicon: getPublicFaviconUrl("ai-coms.png"),
    projectAssets: [],
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
