import { getPublicAssetUrl, getPublicFaviconUrl } from "@/lib/public-assets";

export type ProjectType = {
  slug: string;
  title: string;
  description: string;
  url: string;
  favicon: string;
  projectAssets: ProjectAssetType[];
  type: "venture" | "project" | "mini-app" | "template";
};

type ProjectAssetType = {
  src: string;
  type: "image" | "video";
  aspectRatio?: "16:9" | "4:3";
  description?: string;
  dataBlur?: string;
};

export const projects: ProjectType[] = [
  {
    slug: "vibedgames",
    title: "Vibedgames",
    description:
      "Design, publish, and play personalized multiplayer minigames with your friends",
    url: "https://vibedgames.com",
    favicon: getPublicFaviconUrl("vibedgames.png"),
    type: "project",
    projectAssets: [
      {
        type: "video",
        src: getPublicAssetUrl("vibedgames.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("pacman.mp4"),
        aspectRatio: "16:9",
      },
      {
        type: "video",
        src: getPublicAssetUrl("flappy.mp4"),
        aspectRatio: "16:9",
      },
      {
        type: "video",
        src: getPublicAssetUrl("pong.mp4"),
        aspectRatio: "16:9",
      },
    ],
  },
  {
    slug: "yourssincerely",
    title: "Yours Sincerely",
    description: "Anonymous love letters 💌 written in disappearing ink",
    url: "https://yourssincerely.org",
    favicon: getPublicFaviconUrl("yourssincerely.png"),
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("ys.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAAAwAgCdASoQAAwAAUAmJaACdAEXubBHzPstwAD0ZOFZFDNEv1GcgJuIQsF7FKkObWMZEvmAVVcg3CNWlmjn0hWF/u44eMQUJn943B+usgCfjK3H1zS4K+5UzhR64AAA",
      },
      {
        type: "video",
        src: getPublicAssetUrl("ys.mp4"),
        aspectRatio: "16:9",
      },
      {
        type: "video",
        src: getPublicAssetUrl("ys-2.mp4"),
        aspectRatio: "16:9",
      },
    ],
  },
  {
    slug: "uicapsule",
    title: "UICapsule",
    description: "A curated collection of components that spark joy",
    url: "https://uicapsule.com",
    favicon: getPublicFaviconUrl("uicapsule.png"),
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("uicapsule.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAwAgCdASoQAAwAAUAmJZwCdIExGBjScIj3AAD+/sYZZecDsl3PR5dQ/ZmFfvxk7Ws/2VYmsUfxLG0pnynnuvVYrpjy3UXYSKw/3INfiTyGZTrNcAA=",
      },
      {
        type: "video",
        src: getPublicAssetUrl("globe.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("parallax.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("infinite-grid.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("astroids.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("ascii.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("ios-volume.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("ios-header-menu.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("reading-progress.mp4"),
      },
      {
        type: "video",
        src: getPublicAssetUrl("radial-slider.mp4"),
      },
    ],
  },
  {
    slug: "inteligir",
    title: "Inteligir",
    description:
      "Make lifelong learning as natural as checking your phone. Turn your social feed into your personal university. Inteligir transforms trending topics from your world into engaging, bite-sized lessons delivered right to your phone",
    url: "https://inteligir.com",
    favicon: getPublicFaviconUrl("inteligir-1.png"),
    type: "project",
    projectAssets: [],
  },
  {
    slug: "dataembed",
    title: "Dataembed",
    description:
      "Search the web like a database. Query and transform scattered web information into structured datasets",
    url: "https://dataembed.com",
    favicon: getPublicFaviconUrl("dataembed.png"),
    type: "project",
    projectAssets: [
      {
        type: "video",
        src: getPublicAssetUrl("dataembed.mp4"),
      },
      {
        type: "image",
        src: getPublicAssetUrl("dataembed-1.webp"),
      },
    ],
  },
  {
    slug: "loremllm",
    title: "LoremLLM",
    description: "Mock responses for LLMs",
    url: "https://loremllm.com",
    favicon: getPublicFaviconUrl("loremllm.png"),
    type: "project",
    projectAssets: [],
  },
  // {
  //   slug: "edgestories",
  //   title: "Edge Stories",
  //   description:
  //     "",
  //   url: "https://edgestories.com",
  //   favicon: getPublicFaviconUrl("edgestories.png"),
  //   type: "project",
  //   projectAssets: [],
  // },
  // Ventures
  {
    slug: "founding",
    title: "Founding",
    description: "Your proxy founding team",
    url: "https://founding.so",
    favicon: getPublicFaviconUrl("founding.png"),
    type: "venture",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("founding.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACQAQCdASoQAAgAAUAmJZwC7H8AHIAA/vyn53W6rmzbDsOD67FpggQRemJVpupEpwAAAA==",
      },
      {
        type: "image",
        src: getPublicAssetUrl("founding-1.webp"),
      },
    ],
  },
  // Mini Apps
  {
    slug: "total-compensation-calculator",
    title: "Total Compensation Calculator",
    description:
      "A simple tool to help you navigate tech startup compensation. None of these rosy numbers HR loves to give. No estimation brainwork required. Just fill in the numbers and hit the bank",
    url: "https://tc.kyh.io",
    favicon: getPublicFaviconUrl("total-compensation-calculator.png"),
    type: "mini-app",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("tc.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADwAQCdASoQAAwAAUAmJQBOgCP/2Rtk5AAA/v0X8ETwDumeYkE4wslUaJKeR8yv3Y80opDLuqTqk+tpiAA=",
      },
    ],
  },
  {
    slug: "covid-19-dashboard",
    title: "Covid-19 Dashboard",
    description:
      "A real-time dashboard visualizing global Covid-19 data and trends",
    url: "https://covid-19.kyh.io",
    favicon: getPublicFaviconUrl("covid-19-dashboard.png"),
    type: "mini-app",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("covid19.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoQAAwAAUAmJQBOgCHw3N8oAP79nRPM1rR6f3natj7PvZau2tOobhEqOtCAAA==",
      },
      {
        type: "image",
        src: getPublicAssetUrl("covid19-1.webp"),
      },
    ],
  },
  {
    slug: "keiko-and-friends",
    title: "Keiko and Friends",
    description: "Cute sticker pack",
    url: "https://apps.apple.com/us/app/id1209391711",
    favicon: getPublicFaviconUrl("keiko-and-friends.png"),
    type: "mini-app",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("keiko.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAgCdASoQAAwAAUAmJYwCdAD0ikApuuAAAP7+mkH3G+z+NDoe9ydN17TBCmONmSaqlqIXR6uLgpRujwewAV4bB8JzlHN4q5RygJTAtYILfs0AAAA=",
      },
    ],
  },
  // Templates
  {
    slug: "init",
    title: "Init",
    description:
      "An AI native starter kit to build, launch, and scale your next project",
    url: "https://init.kyh.io",
    favicon: getPublicFaviconUrl("init.png"),
    type: "template",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("init.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
      },
    ],
  },
  {
    slug: "ai-design-canvas",
    title: "AI Design Canvas",
    description: "A full-featured, hackable Next.js and AI sdk design canvas",
    url: "https://init.kyh.io",
    favicon: getPublicFaviconUrl("ai-.png"),
    type: "template",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("init.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
      },
    ],
  },
  {
    slug: "ai-datagrid",
    title: "AI Datagrid",
    description: "A full-featured, hackable Next.js AI datagrid",
    url: "https://init.kyh.io",
    favicon: getPublicFaviconUrl("init.png"),
    type: "template",
    projectAssets: [
      {
        type: "image",
        src: getPublicAssetUrl("init.webp"),
        dataBlur:
          "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
      },
    ],
  },
] as const;

export type WorkType = {
  role: string;
  company: string;
  year: string;
  favicon: string;
  link: string;
};

export const workHistory: WorkType[] = [
  {
    role: "Technical Staff",
    company: "Sequoia Capital",
    year: "Now",
    favicon: getPublicFaviconUrl("sequoia.png"),
    link: "https://sequoiacap.com",
  },
  {
    role: "Software Engineer",
    company: "Vercel",
    year: "2022",
    favicon: getPublicFaviconUrl("vercel.png"),
    link: "https://vercel.com",
  },
  {
    role: "Design Engineer",
    company: "Google",
    year: "2022",
    favicon: getPublicFaviconUrl("google.png"),
    link: "https://grow.google",
  },
  {
    role: "Software Engineer",
    company: "Amazon",
    year: "2020",
    favicon: getPublicFaviconUrl("amazon.jpeg"),
    link: "https://amazon.design",
  },
  {
    role: "Software Engineer",
    company: "Atrium",
    year: "2019",
    favicon: getPublicFaviconUrl("atrium-1.png"),
    link: "https://www.crunchbase.com/organization/atrium-lts",
  },
  {
    role: "Design Engineer",
    company: "Cardiogram",
    year: "2015",
    favicon: getPublicFaviconUrl("cardiogram.jpeg"),
    link: "https://www.crunchbase.com/organization/cardiogram",
  },
] as const;
