import { social } from "./social";

export const data = {
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
  "/#eng": {
    link: { href: "/#eng", label: "Software Engineer" },
    stat: {
      id: "eng",
      value: 15215,
      label: "+ code contributions",
      href: social.github,
      spawn: 50,
    },
  },
  "/#design": {
    link: { href: "/#design", label: "Designer" },
    stat: {
      id: "design",
      value: 30,
      label: "+ portfolio pieces",
      href: social.dribbble,
      spawn: 10,
    },
  },
  "/#ppl": {
    link: { href: "/#ppl", label: "Manager" },
    stat: {
      id: "ppl",
      value: 107,
      label: "+ interviews conducted",
      href: "",
      spawn: 10,
    },
  },
  "/#ring": {
    link: { href: "/#ring", label: "Ring Bearer" },
    stat: {
      id: "ring",
      value: 1,
      label: "ring borne",
      href: "",
      spawn: 1,
    },
  },
};
