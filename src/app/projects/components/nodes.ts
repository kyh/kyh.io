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
      title: "Amazon",
      description:
        "As part of the Amazon UI team, we are responsible for the global Amazon shopping experience.",
      links: [
        {
          text: "Amazon Design Portal",
          url: "https://design.amazon.com/",
        },
        {
          text: "Explore Opportunities",
          url: "https://amazon.design",
        },
      ],
      assets: [
        {
          type: "img",
          url: "/screenshots/amazon-ds.webp",
          alt: "Amazon Design Portal",
        },
        {
          type: "img",
          url: "/screenshots/amazon-redesign.webp",
          alt: "Amazon Redesign",
        },
        {
          type: "img",
          url: "/screenshots/amazon.webp",
          alt: "Amazon",
        },
        {
          type: "img",
          url: "/screenshots/art.webp",
          alt: "Amazon Design Portal",
        },
        {
          type: "img",
          url: "/screenshots/atrium.webp",
          alt: "Amazon Design Portal",
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
      description: "We help the daring build legendary companies",
      links: [
        {
          text: "Visit Site",
          url: "https://arc.sequoiacap.com/",
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
      links: [
        {
          text: "Press Article",
          url: "https://www.theverge.com/2017/5/15/15640942/apple-watch-cardiogram-heart-health-artificial-intelligence-monitoring",
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
      links: [
        {
          text: "Visit Site",
          url: "https://founding.so",
        },
      ],
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
      links: [
        {
          text: "Visit Site",
          url: "https://inteligir.com",
        },
      ],
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
      links: [
        {
          text: "App Store",
          url: "https://apps.apple.com/us/app/id1209391711/",
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
      links: [
        {
          text: "Visit Site",
          url: "https://codepen.io/kyhio",
        },
      ],
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
      links: [
        {
          text: "Visit Site",
          url: "https://stonksville.com",
        },
      ],
      backgroundImage: "/screenshots/stonks.webp",
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
