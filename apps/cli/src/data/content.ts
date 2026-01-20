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

export const heroText = `Hello world. You can call me Kai since we're pretty much friends now. I enjoy creating things for the internet. By day, I get to do that through investing, advising, and building products you may not have heard of, yet. Welcome to my corner of the web.`;

export const projects: Item[] = [
  {
    title: "Vibedgames",
    description:
      "Design, publish, and play personalized multiplayer minigames with your friends",
    url: "https://vibedgames.com",
  },
  {
    title: "Yours Sincerely",
    description: "Anonymous love letters written in disappearing ink",
    url: "https://yourssincerely.org",
  },
  {
    title: "UICapsule",
    description: "A curated collection of components that spark joy",
    url: "https://uicapsule.com",
  },
  {
    title: "Inteligir",
    description:
      "Turn your social feed into your personal university with bite-sized lessons",
    url: "https://inteligir.com",
  },
  {
    title: "Dataembed",
    description:
      "Search the web like a database. Query and transform scattered web information",
    url: "https://dataembed.com",
  },
  {
    title: "LoremLLM",
    description: "Mock responses for LLMs",
    url: "https://loremllm.com",
  },
  {
    title: "Founding",
    description: "Your proxy founding team",
    url: "https://founding.so",
  },
  {
    title: "Total Compensation Calculator",
    description: "Navigate tech startup compensation",
    url: "https://tc.kyh.io",
  },
  {
    title: "Covid-19 Dashboard",
    description: "Visualize global Covid-19 data and trends",
    url: "https://covid-19.kyh.io",
  },
  {
    title: "Keiko and Friends",
    description: "Cute sticker pack",
    url: "https://apps.apple.com/us/app/id1209391711",
  },
  {
    title: "Policing Ice",
    description:
      "Documenting incidents of ICE overreach through crowdsourced video evidence",
    url: "https://policingice.com",
  },
  {
    title: "Kwadrants",
    description: "Everything lives in a 2x2 matrix",
    url: "https://kwadrants.com",
  },
  {
    title: "Init",
    description:
      "An AI native starter kit to build, launch, and scale your next project",
    url: "https://init.kyh.io",
  },
  {
    title: "AI Design Canvas",
    description: "A full-featured, hackable Next.js and AI sdk design canvas",
    url: "https://init.kyh.io",
  },
  {
    title: "AI Datagrid",
    description: "A full-featured, hackable Next.js AI datagrid",
    url: "https://init.kyh.io",
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
    url: "https://crunchbase.com/organization/atrium-lts",
  },
  {
    title: "Cardiogram",
    description: "Design Engineer",
    url: "https://crunchbase.com/organization/cardiogram",
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
