export type Project = {
  title: string;
  description: string;
  url: string;
};

export type Work = {
  title: string;
  description: string;
  url: string;
};

export const name = "Kaiyu Hsu";

export const contact = {
  website: "kyh.io",
  github: "github.com/kyh",
  x: "x.com/kaiyuhsu",
  linkedin: "linkedin.com/in/kyh",
  email: "hello@kyh.io",
};

export const heroText = `Hello world. You can call me Kai since we're pretty much friends now. I enjoy creating things for the internet. By day, I get to do that through investing, advising, and building products you may not have heard of, yet. Welcome to my corner of the web.`;

export const projects: Project[] = [
  {
    title: "Vibedgames",
    description: "Games made with vibes 🎮",
    url: "https://vibedgames.com",
  },
  {
    title: "Yours Sincerely",
    description: "Anonymous love letters written in disappearing ink.",
    url: "https://yourssincerely.org",
  },
  {
    title: "UICapsule",
    description: "A curated collection of components that spark joy.",
    url: "https://uicapsule.com",
  },
  {
    title: "Inteligir",
    description: "Lifelong learning",
    url: "https://inteligir.com",
  },
  {
    title: "Dataembed",
    description: "Search the web like a database",
    url: "https://dataembed.com",
  },
  {
    title: "Founding",
    description: "Your proxy founding team.",
    url: "https://founding.so",
  },
  {
    title: "Total Compensation Calculator",
    description: "Navigate tech startup compensation",
    url: "https://tc.kyh.io",
  },
  {
    title: "Covid-19 Dashboard",
    description: "Visualize global Covid-19 data",
    url: "https://covid-19.kyh.io",
  },
  {
    title: "Keiko and Friends",
    description: "Cute sticker pack.",
    url: "https://apps.apple.com/us/app/id1209391711",
  },
  {
    title: "Init",
    description: "An AI native starter kit to build, launch, and scale your next project.",
    url: "https://init.kyh.io",
  },
];

export const work: Work[] = [
  {
    title: "Sequoia",
    description: "Helping the daring build legendary companies.",
    url: "https://sequoiacap.com",
  },
  {
    title: "Vercel",
    description: "Build and publish wonderful things.",
    url: "https://vercel.com",
  },
  {
    title: "Google",
    description: "Looking for something?",
    url: "https://grow.google",
  },
  {
    title: "Amazon",
    description: "Earth's biggest bookstore.",
    url: "https://amazon.design",
  },
  {
    title: "Cardiogram",
    description: "Your personal healthcare assistant.",
    url: "https://apps.apple.com/us/app/cardiogram/id1000017994",
  },
];
