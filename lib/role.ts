import { social } from "./social";

export const data = {
  "/": {
    link: { href: "/", label: "UX Engineer" },
    stat: {
      id: "ux",
      value: 10,
      label: "Years of eperience",
      href: social.linkedin,
      spawn: 30,
    },
  },
  "/#eng": {
    link: { href: "/#eng", label: "Software Engineer" },
    stat: {
      id: "eng",
      value: 15215,
      label: "Github contributions",
      href: social.github,
      spawn: 50,
    },
  },
  "/#design": {
    link: { href: "/#design", label: "Designer" },
    stat: {
      id: "design",
      value: 9,
      label: "Dribbble shots",
      href: social.dribbble,
      spawn: 5,
    },
  },
  "/#ppl": {
    link: { href: "/#ppl", label: "Manager" },
    stat: {
      id: "ppl",
      value: 107,
      label: "Interviews conducted",
      href: "",
      spawn: 10,
    },
  },
  "/#ring": {
    link: { href: "/#ring", label: "Ring Bearer" },
    stat: { id: "ring", value: 1, label: "Ring borne", href: "", spawn: 1 },
  },
};
