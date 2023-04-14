import { social } from "./social";

export type Stat = {
  id: string;
  spawn: number;
  value?: string;
  label?: string;
  href?: string;
};

export type StatMap = Record<Stat["id"], Stat>;

export const statMap: StatMap = {
  home: {
    id: "home",
    spawn: 25,
  },
  build: {
    id: "build",
    value: "16,000",
    label: "+ code contributions",
    href: social.github,
    spawn: 50,
  },
  invest: {
    id: "invest",
    value: "20",
    label: "+ held investments",
    spawn: 20,
  },
  advise: {
    id: "advise",
    value: "3",
    label: "startup exits",
    href: social.linkedin,
    spawn: 10,
  },
  product: {
    id: "product",
    value: "15",
    label: "+ products launched",
    href: social.dribbble,
    spawn: 15,
  },
};
