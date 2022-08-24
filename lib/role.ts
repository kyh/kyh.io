import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
      label: "+ products launched",
      href: social.dribbble,
      spawn: 10,
    },
  },
  "/#ppl": {
    link: { href: "/#ppl", label: "Manager" },
    stat: {
      id: "ppl",
      value: 100,
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

export const useCurrentPageRole = () => {
  const router = useRouter();

  const [role, setRole] = useState(data["/"]);

  useEffect(() => {
    const role = data[router.asPath as keyof typeof data] || data["/"];
    setRole(role);
  }, [router.asPath]);

  return role;
};
