export type Project = {
  title: string;
  description: string;
  url: string;
  projectAssets: ProjectAsset[];
  type: "project" | "work";
};

type ProjectAsset = {
  src: string;
  type: "image" | "video";
  description?: string;
  dataBlur?: string;
};

export const featured: Project[] = [
  {
    title: "Vibed Games",
    description:
      "Design, publish, and play personalized multiplayer minigames with your crew.",
    url: "https://vibedgames.com",
    type: "project",
    projectAssets: [
      {
        type: "video",
        src: "/screenshots/vibedgames.mp4",
      },
      {
        type: "video",
        src: "/screenshots/vibedgames.mp4",
      },
    ],
  },
  {
    title: "Yours Sincerely",
    description: "Anonymous love letters 💌 written in disappearing ink.",
    url: "https://yoursincerely.org",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/ys.webp",
        dataBlur:
          "data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAAAwAgCdASoQAAwAAUAmJaACdAEXubBHzPstwAD0ZOFZFDNEv1GcgJuIQsF7FKkObWMZEvmAVVcg3CNWlmjn0hWF/u44eMQUJn943B+usgCfjK3H1zS4K+5UzhR64AAA",
      },
    ],
  },
  {
    title: "UICapsule",
    description:
      "A curated collection of components for builders who care about the details.",
    url: "https://uicapsule.com",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/uicapsule.webp",
        dataBlur:
          "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAwAgCdASoQAAwAAUAmJZwCdIExGBjScIj3AAD+/sYZZecDsl3PR5dQ/ZmFfvxk7Ws/2VYmsUfxLG0pnynnuvVYrpjy3UXYSKw/3INfiTyGZTrNcAA=",
      },
      {
        type: "video",
        src: "/screenshots/globe.mp4",
      },
      {
        type: "video",
        src: "/screenshots/parallax.mp4",
      },
      {
        type: "video",
        src: "/screenshots/infinite-grid.mp4",
      },
      {
        type: "video",
        src: "/screenshots/astroids.mp4",
      },
      {
        type: "video",
        src: "/screenshots/ascii.mp4",
      },
      {
        type: "video",
        src: "/screenshots/ios-app-zoom.mp4",
      },
      {
        type: "video",
        src: "/screenshots/ios-volume.mp4",
      },
      {
        type: "video",
        src: "/screenshots/ios-header-menu.mp4",
      },
      {
        type: "video",
        src: "/screenshots/reading-progress.mp4",
      },
      {
        type: "video",
        src: "/screenshots/radial-slider.mp4",
      },
      {
        type: "video",
        src: "/screenshots/add-to-cart.mp4",
      },
    ],
  },
  {
    title: "Inteligir",
    description: "",
    url: "https://inteligir.com",
    type: "project",
    projectAssets: [
      {
        type: "video",
        src: "/screenshots/inteligir.mp4",
      },
    ],
  },
] as const;

export const others: Project[] = [
  {
    title: "Founding",
    description: "",
    url: "https://founding.so",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/founding.webp",
        dataBlur:
          "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACQAQCdASoQAAgAAUAmJZwC7H8AHIAA/vyn53W6rmzbDsOD67FpggQRemJVpupEpwAAAA==",
      },
    ],
  },
  {
    title: "Total Compensation Calculator",
    description: "",
    url: "https://tc.kyh.io",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/tc.webp",
        dataBlur:
          "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADwAQCdASoQAAwAAUAmJQBOgCP/2Rtk5AAA/v0X8ETwDumeYkE4wslUaJKeR8yv3Y80opDLuqTqk+tpiAA=",
      },
    ],
  },
  {
    title: "Covid-19 Dashboard",
    description: "",
    url: "https://covid-19.kyh.io",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/covid19.webp",
        dataBlur:
          "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoQAAwAAUAmJQBOgCHw3N8oAP79nRPM1rR6f3natj7PvZau2tOobhEqOtCAAA==",
      },
    ],
  },
  {
    title: "Keiko and Friends",
    description: "",
    url: "https://apps.apple.com/us/app/id1209391711",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/keiko.webp",
        dataBlur:
          "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAgCdASoQAAwAAUAmJYwCdAD0ikApuuAAAP7+mkH3G+z+NDoe9ydN17TBCmONmSaqlqIXR6uLgpRujwewAV4bB8JzlHN4q5RygJTAtYILfs0AAAA=",
      },
    ],
  },
  {
    title: "Init",
    description: "",
    url: "https://init.kyh.io",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/init.webp",
        dataBlur:
          "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
      },
    ],
  },

  // Work
  {
    title: "Sequoia Capital",
    description: "",
    url: "https://sequoiacap.com",
    type: "work",
    projectAssets: [
      {
        type: "video",
        src: "/screenshots/arc.webm",
      },
    ],
  },
  {
    title: "Google",
    description: "",
    url: "https://grow.google",
    type: "work",
    projectAssets: [
      {
        type: "video",
        src: "/screenshots/google-grow.webm",
      },
    ],
  },
  {
    title: "Amazon",
    description: "",
    url: "https://amazon.design",
    type: "work",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/amazon-ds.webp",
        dataBlur:
          "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoQAAwAAUAmJagCdLoAAwkBvegA/v29UctAdfkdHg29PWJSqGyVt/+nGP/JS/00j6U93+LYrgyoAA==",
      },
    ],
  },
  {
    title: "Cardiogram",
    description: "",
    url: "https://apps.apple.com/us/app/cardiogram/id1000017994",
    type: "work",
    projectAssets: [
      {
        type: "image",
        src: "/screenshots/cardiogram.webp",
        dataBlur:
          "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAwAgCdASoQAAwAAUAmJZwCw7D0uKmpGNtDAAD+/gJZSH6K4fTPLnMe0LDP31p+YC8Z3gV54kQfHCvUM7NKrfCnpgUeAAAA",
      },
    ],
  },
] as const;
