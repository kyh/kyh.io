export type Project = {
  title: string;
  description: string;
  url: string;
  type: "project" | "work";
};

export const projects: Project[] = [
  {
    title: "Vibedgames",
    description: "Design, publish, and play personalized multiplayer minigames with your friends.",
    url: "https://vibedgames.com",
    type: "project",
  },
  {
    title: "Yours Sincerely",
    description: "Anonymous love letters written in disappearing ink.",
    url: "https://yourssincerely.org",
    type: "project",
  },
  {
    title: "UICapsule",
    description: "A curated collection of components that spark joy.",
    url: "https://uicapsule.com",
    type: "project",
  },
  {
    title: "Inteligir",
    description: "Turn your social feed into your personal university with bite-sized lessons.",
    url: "https://inteligir.com",
    type: "project",
  },
  {
    title: "Dataembed",
    description: "Search the web like a database. Query and transform scattered web information into structured datasets.",
    url: "https://dataembed.com",
    type: "project",
  },
  {
    title: "Founding",
    description: "Your proxy founding team.",
    url: "https://founding.so",
    type: "project",
  },
  {
    title: "Total Compensation Calculator",
    description: "A simple tool to help you navigate tech startup compensation.",
    url: "https://tc.kyh.io",
    type: "project",
  },
  {
    title: "Covid-19 Dashboard",
    description: "A real-time dashboard visualizing global Covid-19 data and trends.",
    url: "https://covid-19.kyh.io",
    type: "project",
  },
  {
    title: "Keiko and Friends",
    description: "Cute sticker pack.",
    url: "https://apps.apple.com/us/app/id1209391711",
    type: "project",
  },
  {
    title: "Init",
    description: "An AI native starter kit to build, launch, and scale your next project.",
    url: "https://init.kyh.io",
    type: "project",
  },
  {
    title: "Sequoia",
    description: "Design engineering for the premier venture capital firm.",
    url: "https://sequoiacap.com",
    type: "work",
  },
  {
    title: "Google",
    description: "Growth initiatives for Google Career Certificates.",
    url: "https://grow.google",
    type: "work",
  },
  {
    title: "Amazon",
    description: "Design systems for Amazon's customer experience.",
    url: "https://amazon.design",
    type: "work",
  },
  {
    title: "Cardiogram",
    description: "Heart health monitoring with Apple Watch.",
    url: "https://apps.apple.com/us/app/cardiogram/id1000017994",
    type: "work",
  },
];

export const about = {
  name: "Kaiyu Hsu",
  tagline: "Builder • Investor • Advisor",
  bio: `I help companies build and scale people-centric products.
Historically, my roles have straddled the worlds of engineering,
product, and design — solving complex problems while pursuing
delight and craftsmanship.

Beyond work, I love to learn about economics, psychology, and
business. You'll occasionally find me dabbling in the open source
world, drawing things, building apps, and designing games.`,
  links: {
    website: "https://kyh.io",
    github: "https://github.com/kyh",
    twitter: "https://x.com/kaiyuhsu",
    linkedin: "https://www.linkedin.com/in/kyh",
    email: "hello@kyh.io",
  },
};
