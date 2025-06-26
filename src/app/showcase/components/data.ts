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
  aspectRatio?: "16:9" | "4:3";
  description?: string;
  dataBlur?: string;
};

const supabaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/`;

export const featured: Project[] = [
  {
    title: "Vibed Games",
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
    title: "UICapsule",
    description:
      "A curated collection of components for builders who care about the details.",
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
    title: "Inteligir",
    description:
      "Never stop learning. Weekly deep dives to stay on top of everything that is happening in the world",
    url: "https://inteligir.com",
    type: "project",
    projectAssets: [],
  },
] as const;

export const others: Project[] = [
  {
    title: "Dataembed",
    description: "Data Analyst Copilot. Scheduled deep dives on your data.",
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
    title: "Total Compensation Calculator",
    description: "",
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
    title: "Covid-19 Dashboard",
    description: "",
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
    title: "Keiko and Friends",
    description: "",
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
    title: "Init",
    description: "",
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
    title: "Sequoia Capital",
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
