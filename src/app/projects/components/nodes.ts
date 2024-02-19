import type { Node } from "reactflow";

import type { CardNodeData } from "./card-node";
import type { TextNodeData } from "./text-node";

export const initialNodes: Node<CardNodeData | TextNodeData>[] = [
  {
    id: "title",
    type: "text",
    draggable: false,
    position: {
      x: 871.5525456287683,
      y: 390.69596873013745,
    },
    data: {
      title: "Projects",
    },
  },
  {
    width: 400,
    height: 300,
    id: "amazon",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 0,
      y: 0,
    },
    data: {
      title: "Amazon UI",
      description: `The Amazon UI team designs and builds the global shopping experience.

My work involved Rio (our design system), Mix (the frontend framework, think React), and Kata (the templating language, think JSX)`,
      links: [
        {
          text: "Amazon Design Portal",
          url: "https://design.amazon.com",
        },
        {
          text: "Explore Opportunities",
          url: "https://amazon.design",
        },
      ],
      backgroundImage: "/screenshots/amazon-ds.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoQAAwAAUAmJagCdLoAAwkBvegA/v29UctAdfkdHg29PWJSqGyVt/+nGP/JS/00j6U93+LYrgyoAA==",
    },
  },
  {
    width: 400,
    height: 300,
    id: "sequoia",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 600,
      y: 0,
    },
    data: {
      title: "Sequoia",
      description: `Sequoia helps daring founders build legendary companies from idea to IPO and beyond.

We aim to be the first true believers in tomorrow’s most valuable and enduring businesses. We partner with a few outliers each year and go all-in, providing them with the hands-on help required at every stage of the company building journey.

Our expertise comes from 50 years of working with legendary founders like Steve Jobs, Larry Page, Jan Koum, Adi Tatarko, Brian Chesky, Jensen Huang, Anne Wojcicki, Eric Yuan, Patrick Collison, Julia Hartz, and Sebastian Siemiatkowski.

In aggregate, Sequoia-backed companies account for more than 25% of NASDAQ's total value.`,
      links: [
        {
          text: "Visit Site",
          url: "https://sequoiacap.com",
        },
        {
          text: "Founder Portal",
          url: "https://ampersand.sequoiacap.com",
        },
        {
          text: "Accelerator Program",
          url: "https://arc.sequoiacap.com",
        },
      ],
      backgroundVideo: "/screenshots/arc.webm",
    },
  },
  {
    width: 400,
    height: 300,
    id: "atrium",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: -108,
      y: 456,
    },
    data: {
      title: "Atrium",
      description: `Atrium helps accelerate the growth of startups by advising them in the areas where they most need help, such as legal, fundraising, HR & culture, and hiring.`,
      links: [
        {
          text: "About Atrium",
          url: "https://www.crunchbase.com/organization/atrium-lts",
        },
      ],
      backgroundImage: "/screenshots/atrium.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADQAQCdASoQAAwAAUAmJaQAAuafBgmYAAD+9fljiQX0uQIXlcAKRTrP/H++I3FnboNY2MVVCDSkZJ/yTu+kEwJ9ADg17RGQAAA=",
    },
  },
  {
    width: 400,
    height: 300,
    id: "cardiogram",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 928,
      y: 562,
    },
    data: {
      title: "Cardiogram",
      description: `Cardiogram was one of the first startups to detect heart conditions — such as atrial fibrillation, hypertension — using deep neural networks and the optical heart rate sensor on consumer wearables like Apple Watch, Google's WearOS, and Fitbit.

5+ million people used the Cardiogram app, and we published research on deep learning for health sensor timeseries in JAMA Cardiology, AAAI-2018, and the American Heart Association's Scientific Sessions.

I was the first employee hire. Helped build out the brand, product, and technical foundations of the company.

Acquired in 2020.`,
      links: [
        {
          text: "App Store",
          url: "https://apps.apple.com/us/app/cardiogram/id1000017994",
        },
        {
          text: "Press",
          url: "https://techcrunch.com/tag/cardiogram",
        },
      ],
      backgroundImage: "/screenshots/cardiogram.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAwAgCdASoQAAwAAUAmJZwCw7D0uKmpGNtDAAD+/gJZSH6K4fTPLnMe0LDP31p+YC8Z3gV54kQfHCvUM7NKrfCnpgUeAAAA",
    },
  },
  {
    width: 400,
    height: 300,
    id: "covid-19",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 1392,
      y: 797,
    },
    data: {
      title: "COVID-19 Dashboard",
      description:
        "A dashboard to track the spread of COVID-19 in the United States.",
      links: [
        {
          text: "Visit Site",
          url: "https://covid-19.kyh.io",
        },
      ],
      backgroundImage: "/screenshots/covid19.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoQAAwAAUAmJQBOgCHw3N8oAP79nRPM1rR6f3natj7PvZau2tOobhEqOtCAAA==",
    },
  },
  {
    width: 400,
    height: 300,
    id: "founding",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 1502,
      y: 1235,
    },
    data: {
      title: "Founding",
      description:
        "I helped co-found Founding where we help startups initialize their product and scale their technical team.",
      links: [
        {
          text: "Visit Site",
          url: "https://founding.so",
        },
      ],
      backgroundImage: "/screenshots/founding.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACQAQCdASoQAAgAAUAmJZwC7H8AHIAA/vyn53W6rmzbDsOD67FpggQRemJVpupEpwAAAA==",
    },
  },
  {
    width: 400,
    height: 300,
    id: "google",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 1606,
      y: 413,
    },
    data: {
      title: "Google Grow",
      description:
        "Grow with Google offers free training and tools to help you grow your skills, career, or business.",
      links: [
        {
          text: "Visit Site",
          url: "https://grow.google",
        },
      ],
      backgroundVideo: "/screenshots/google-grow.webm",
    },
  },
  {
    width: 400,
    height: 300,
    id: "inteligir",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 430,
      y: 755,
    },
    data: {
      title: "Inteligir",
      description: "IN PROGRESS",
      links: [
        {
          text: "Visit Site",
          url: "https://inteligir.com",
        },
      ],
      backgroundVideo: "/screenshots/inteligir.mp4",
    },
  },
  {
    width: 400,
    height: 300,
    id: "keiko",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 914,
      y: 1025,
    },
    data: {
      title: "Keiko and Friends",
      description: "I drew my friends. I hope you like them. Wanna be friends?",
      links: [
        {
          text: "App Store",
          url: "https://apps.apple.com/us/app/id1209391711",
        },
      ],
      backgroundImage: "/screenshots/keiko.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAgCdASoQAAwAAUAmJYwCdAD0ikApuuAAAP7+mkH3G+z+NDoe9ydN17TBCmONmSaqlqIXR6uLgpRujwewAV4bB8JzlHN4q5RygJTAtYILfs0AAAA=",
    },
  },
  {
    width: 400,
    height: 300,
    id: "playground",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: -46,
      y: 843,
    },
    data: {
      title: "Playground",
      description: "Random experiments and ideas.",
      links: [
        {
          text: "Visit Site",
          url: "https://codepen.io/kyhio",
        },
      ],
      backgroundVideo: "/screenshots/codepen.mp4",
    },
  },
  {
    width: 400,
    height: 300,
    id: "slyce",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 346,
      y: 1151,
    },
    data: {
      title: "Slyce",
      description:
        "Slyce is a visual search company that uses image recognition to identify and find products.",
      links: [
        {
          text: "About Slyce",
          url: "https://www.crunchbase.com/organization/slyce",
        },
      ],
      backgroundImage: "/screenshots/slyce.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAADQAQCdASoQAAwAAUAmJZwAAudljfFYAAD+/pmxYSp4yOONaQeF5/fWRam8ThOk9MqRSC7AHjEfrm4h9atrfO8kfY4GxG9TlyLNd6rv9NZD392rAAA=",
    },
  },
  // {
  //   width: 400,
  //   height: 300,
  //   id: "stonksville",
  //   type: "card",
  //   dragHandle: ".handle",
  //   position: {
  //     x: 1872.0000000000014,
  //     y: 829,
  //   },
  //   data: {
  //     title: "Stonksville",
  //     links: [
  //       {
  //         text: "Visit Site",
  //         url: "https://stonksville.com",
  //       },
  //     ],
  //     backgroundImage: "/screenshots/stonks.webp",
  //     backgroundBlurData:
  //       "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
  //   },
  // },
  {
    width: 400,
    height: 300,
    id: "init",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 1872.0000000000014,
      y: 829,
    },
    data: {
      title: "Init",
      description:
        "A comprehensive boilerplate to build, launch, and scale your next project",
      links: [
        {
          text: "Visit Site",
          url: "https://init.kyh.io",
        },
      ],
      backgroundImage: "/screenshots/init.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
    },
  },
  {
    width: 400,
    height: 300,
    id: "tc",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 1676.4,
      y: -13,
    },
    data: {
      title: "Total Compensation Calculator",
      description:
        "A simple tool to help you navigate tech startup compensation.",
      links: [
        {
          text: "Visit Site",
          url: "https://tc.kyh.io",
        },
      ],
      backgroundImage: "/screenshots/tc.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADwAQCdASoQAAwAAUAmJQBOgCP/2Rtk5AAA/v0X8ETwDumeYkE4wslUaJKeR8yv3Y80opDLuqTqk+tpiAA=",
    },
  },
  {
    width: 400,
    height: 300,
    id: "2up",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 1138,
      y: -225,
    },
    data: {
      title: "2UP",
      description: "A platform for real-time multiplayer party games.",
      links: [
        {
          text: "Visit Site",
          url: "https://2uphq.com",
        },
      ],
      backgroundImage: "/screenshots/truffles.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAACwAQCdASoQAAwAAUAmJaQAAuQXRR4AAP7+7XQ2ry8a0MfqHJH0uHS/5LOWen07Pkad4dWCZkLtS+UKAAA=",
    },
  },
  {
    width: 400,
    height: 300,
    id: "uicapsule",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 1123.6,
      y: 193,
    },
    data: {
      title: "UI Capsule",
      description:
        "A museum of your favorite UI pieces. Devoted to showcasing the visual history of popular websites, games, apps, and operating systems that have shaped our lives.",
      links: [
        {
          text: "Visit Site",
          url: "https://uicapsule.com",
        },
      ],
      backgroundImage: "/screenshots/uicapsule.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAwAgCdASoQAAwAAUAmJZwCdIExGBjScIj3AAD+/sYZZecDsl3PR5dQ/ZmFfvxk7Ws/2VYmsUfxLG0pnynnuvVYrpjy3UXYSKw/3INfiTyGZTrNcAA=",
    },
  },
  {
    width: 400,
    height: 300,
    id: "yourssincerely",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 374,
      y: 357,
    },
    data: {
      title: "Yours Sincerely",
      description:
        "An ephemeral anonymous blog to send each other tiny beautiful letters.",
      links: [
        {
          text: "Visit Site",
          url: "https://yourssincerely.org",
        },
      ],
      backgroundImage: "/screenshots/ys.webp",
      backgroundBlurData:
        "data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAAAwAgCdASoQAAwAAUAmJaACdAEXubBHzPstwAD0ZOFZFDNEv1GcgJuIQsF7FKkObWMZEvmAVVcg3CNWlmjn0hWF/u44eMQUJn943B+usgCfjK3H1zS4K+5UzhR64AAA",
    },
  },
];
