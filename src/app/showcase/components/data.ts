export type ProjectType = {
  slug: string;
  title: string;
  description: string;
  url: string;
  projectAssets: ProjectAssetType[];
  type: "project" | "work";
};

type ProjectAssetType = {
  src: string;
  type: "image" | "video";
  aspectRatio?: "16:9" | "4:3";
  description?: string;
  dataBlur?: string;
};

const supabaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/`;

export const projects: ProjectType[] = [
  {
    slug: "vibedgames",
    title: "Vibedgames",
    description:
      "Design, publish, and play personalized multiplayer minigames with your friends.",
    url: "https://vibedgames.com",
    type: "project",
    projectAssets: [
      {
        type: "video",
        src: `${supabaseUrl}/vibedgames.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/pacman.mp4`,
        aspectRatio: "16:9",
      },
      {
        type: "video",
        src: `${supabaseUrl}/flappy.mp4`,
        aspectRatio: "16:9",
      },
      {
        type: "video",
        src: `${supabaseUrl}/pong.mp4`,
        aspectRatio: "16:9",
      },
    ],
  },
  {
    slug: "yourssincerely",
    title: "Yours Sincerely",
    description: "Anonymous love letters 💌 written in disappearing ink.",
    url: "https://yourssincerely.org",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/ys.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRmoAAABXRUJQVlA4IF4AAAAwAgCdASoQAAwAAUAmJaACdAEXubBHzPstwAD0ZOFZFDNEv1GcgJuIQsF7FKkObWMZEvmAVVcg3CNWlmjn0hWF/u44eMQUJn943B+usgCfjK3H1zS4K+5UzhR64AAA",
      },
      {
        type: "video",
        src: `${supabaseUrl}/ys.mp4`,
        aspectRatio: "16:9",
      },
      {
        type: "video",
        src: `${supabaseUrl}/ys-2.mp4`,
        aspectRatio: "16:9",
      },
    ],
  },
  {
    slug: "uicapsule",
    title: "UICapsule",
    description: "A curated collection of components that spark joy.",
    url: "https://uicapsule.com",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/uicapsule.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAwAgCdASoQAAwAAUAmJZwCdIExGBjScIj3AAD+/sYZZecDsl3PR5dQ/ZmFfvxk7Ws/2VYmsUfxLG0pnynnuvVYrpjy3UXYSKw/3INfiTyGZTrNcAA=",
      },
      {
        type: "video",
        src: `${supabaseUrl}/globe.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/parallax.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/infinite-grid.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/astroids.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/ascii.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/ios-volume.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/ios-header-menu.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/reading-progress.mp4`,
      },
      {
        type: "video",
        src: `${supabaseUrl}/radial-slider.mp4`,
      },
    ],
  },
  {
    slug: "inteligir",
    title: "Inteligir",
    description:
      "The next gen of docs. An adaptive and intelligent block-based editor that connects with your proprietary data and helps you generate content, visualizations, and custom interfaces.",
    url: "https://inteligir.com",
    type: "project",
    projectAssets: [],
  },
  {
    slug: "dataembed",
    title: "Dataembed",
    description:
      "Generate software products using your organization data. Everyone on your team should be building software to automate their personal day to day workflows",
    url: "https://dataembed.com",
    type: "project",
    projectAssets: [
      {
        type: "video",
        src: `${supabaseUrl}/dataembed.mp4`,
      },
      {
        type: "image",
        src: `${supabaseUrl}/dataembed-1.webp`,
      },
    ],
  },
  {
    slug: "founding",
    title: "Founding",
    description: "Your proxy founding team.",
    url: "https://founding.so",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/founding.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACQAQCdASoQAAgAAUAmJZwC7H8AHIAA/vyn53W6rmzbDsOD67FpggQRemJVpupEpwAAAA==",
      },
      {
        type: "image",
        src: `${supabaseUrl}/founding-1.webp`,
      },
    ],
  },
  {
    slug: "total-compensation-calculator",
    title: "Total Compensation Calculator",
    description:
      "A simple tool to help you navigate tech startup compensation. None of these rosy numbers HR loves to give. No estimation brainwork required. Just fill in the numbers and hit the bank.",
    url: "https://tc.kyh.io",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/tc.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADwAQCdASoQAAwAAUAmJQBOgCP/2Rtk5AAA/v0X8ETwDumeYkE4wslUaJKeR8yv3Y80opDLuqTqk+tpiAA=",
      },
    ],
  },
  {
    slug: "covid-19-dashboard",
    title: "Covid-19 Dashboard",
    description:
      "A real-time dashboard visualizing global Covid-19 data and trends.",
    url: "https://covid-19.kyh.io",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/covid19.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoQAAwAAUAmJQBOgCHw3N8oAP79nRPM1rR6f3natj7PvZau2tOobhEqOtCAAA==",
      },
      {
        type: "image",
        src: `${supabaseUrl}/covid19-1.webp`,
      },
    ],
  },
  {
    slug: "keiko-and-friends",
    title: "Keiko and Friends",
    description: "Cute sticker pack.",
    url: "https://apps.apple.com/us/app/id1209391711",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/keiko.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAAAQAgCdASoQAAwAAUAmJYwCdAD0ikApuuAAAP7+mkH3G+z+NDoe9ydN17TBCmONmSaqlqIXR6uLgpRujwewAV4bB8JzlHN4q5RygJTAtYILfs0AAAA=",
      },
    ],
  },
  {
    slug: "init",
    title: "Init",
    description:
      "An AI native starter kit to build, launch, and scale your next project.",
    url: "https://init.kyh.io",
    type: "project",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/init.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADQAQCdASoQAAwAAUAmJZQAAudj19lgAAD+/nn2cDnMhddaGFhQ9NBAcjHOdvmihKb/DWxPnHRoAAAA",
      },
    ],
  },

  // Work
  {
    slug: "sequoia",
    title: "Sequoia",
    description: "",
    url: "https://sequoiacap.com",
    type: "work",
    projectAssets: [
      {
        type: "video",
        src: `${supabaseUrl}/arc.webm`,
      },
    ],
  },
  {
    slug: "google",
    title: "Google",
    description: "",
    url: "https://grow.google",
    type: "work",
    projectAssets: [
      {
        type: "video",
        src: `${supabaseUrl}/google-grow.webm`,
      },
    ],
  },
  {
    slug: "amazon",
    title: "Amazon",
    description: "",
    url: "https://amazon.design",
    type: "work",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/amazon-ds.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoQAAwAAUAmJagCdLoAAwkBvegA/v29UctAdfkdHg29PWJSqGyVt/+nGP/JS/00j6U93+LYrgyoAA==",
      },
    ],
  },
  {
    slug: "cardiogram",
    title: "Cardiogram",
    description: "",
    url: "https://apps.apple.com/us/app/cardiogram/id1000017994",
    type: "work",
    projectAssets: [
      {
        type: "image",
        src: `${supabaseUrl}/cardiogram.webp`,
        dataBlur:
          "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAwAgCdASoQAAwAAUAmJZwCw7D0uKmpGNtDAAD+/gJZSH6K4fTPLnMe0LDP31p+YC8Z3gV54kQfHCvUM7NKrfCnpgUeAAAA",
      },
    ],
  },
] as const;

export type RadialDataType = {
  project: ProjectType;
  degree: number;
  variant?: "small" | "medium" | "large";
};

export type LineType = {
  variant: RadialDataType["variant"];
  rotation: number;
  offsetX: number;
  offsetY: number;
  dataIndex: number | null;
};

export type LineTypes = LineType[];
export type RadialDataTypes = RadialDataType[];

export const radialData: RadialDataTypes = projects.map((project, index) => ({
  degree: index,
  variant: "large" as const,
  project,
}));
