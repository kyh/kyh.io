import { social } from "./social";

export type Link = {
  href: string;
  label: string;
};

export type Stat = {
  id: string;
  value: number;
  label: string;
  href: string;
  spawn: number;
};

export const roleData: Record<
  string,
  {
    link: Link;
    stat: Stat;
  }
> = {
  "/": {
    link: { href: "/", label: "UX Engineer" },
    stat: {
      id: "ux",
      value: 9,
      label: "years of experience",
      href: social.linkedin,
      spawn: 30,
    },
  },
  eng: {
    link: { href: "/?role=eng", label: "Software Engineer" },
    stat: {
      id: "eng",
      value: 15215,
      label: "+ code contributions",
      href: social.github,
      spawn: 50,
    },
  },
  design: {
    link: { href: "/?role=design", label: "Designer" },
    stat: {
      id: "design",
      value: 30,
      label: "+ products launched",
      href: social.dribbble,
      spawn: 10,
    },
  },
  manager: {
    link: { href: "/?role=manager", label: "Manager" },
    stat: {
      id: "manager",
      value: 100,
      label: "+ interviews conducted",
      href: "",
      spawn: 10,
    },
  },
  "ring-bearer": {
    link: { href: "/?role=ring-bearer", label: "Ring Bearer" },
    stat: {
      id: "ring",
      value: 1,
      label: "ring borne",
      href: "",
      spawn: 1,
    },
  },
};

export const getCurrentPageRole = (searchParams: {
  [key: string]: string | string[] | undefined;
}) => {
  const role = searchParams["role"] as keyof typeof roleData;
  if (role && roleData[role]) return roleData[role];
  return roleData["/"];
};
