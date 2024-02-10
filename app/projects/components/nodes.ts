import { type Node } from "reactflow";
import { type CardNodeData } from "./card-node";
import { type TextNodeData } from "./text-node";

export const initialNodes: Node<CardNodeData | TextNodeData>[] = [
  {
    id: "title",
    type: "text",
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
      link: {
        url: "https://amazon.com/",
      },
      backgroundImage: "/screenshots/amazon-ds.webp",
    },
  },
  {
    width: 400,
    height: 300,
    id: "arc",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 600,
      y: 0,
    },
    data: {
      link: {
        url: "https://arc.sequoiacap.com/",
      },
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
      link: {
        url: "https://www.ycombinator.com/companies/atrium",
      },
      backgroundImage: "/screenshots/atrium.webp",
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
      link: {
        url: "https://www.theverge.com/2017/5/15/15640942/apple-watch-cardiogram-heart-health-artificial-intelligence-monitoring",
      },
      backgroundImage: "/screenshots/cardiogram.webp",
    },
    selected: true,
    dragging: false,
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
      link: {
        url: "https://covid-19.kyh.io",
      },
      backgroundImage: "/screenshots/covid19.webp",
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
      link: {
        url: "https://founding.so/",
      },
      backgroundVideo: "/screenshots/founding.webm",
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
      link: {
        url: "https://grow.google/",
      },
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
      link: {
        url: "https://inteligir.com/",
      },
      title: "Inteligir",
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
      link: {
        url: "https://apps.apple.com/us/app/id1209391711/",
      },
      backgroundImage: "/screenshots/keiko.webp",
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
      link: {
        url: "https://codepen.io/kyhio/",
      },
      title: "Codepen",
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
      link: {
        url: "https://www.crunchbase.com/organization/slyce",
      },
      backgroundImage: "/screenshots/slyce.webp",
    },
  },
  {
    width: 400,
    height: 300,
    id: "stonksville",
    type: "card",
    dragHandle: ".handle",
    position: {
      x: 1872.0000000000014,
      y: 829,
    },
    data: {
      link: {
        url: "https://stonksville.com/",
      },
      backgroundImage: "/screenshots/stonks.webp",
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
      link: {
        url: "https://tc.kyh.io/",
      },
      backgroundImage: "/screenshots/tc.webp",
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
      link: {
        url: "https://2uphq.com/",
      },
      backgroundImage: "/screenshots/truffles.webp",
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
      link: {
        url: "https://uicapsule.com/",
      },
      backgroundImage: "/screenshots/uicapsule.webp",
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
      link: {
        url: "https://yourssincerely.org/",
      },
      backgroundImage: "/screenshots/ys.webp",
    },
  },
];
