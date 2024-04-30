export const siteConfig = {
  name: "Kaiyu Hsu",
  shortName: "kyh",
  description:
    "Building things for the interwebs. By day, I get to do that through investing, advising, and working on products you may not have heard of (yet)",
  url:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://kyh.io",
  links: { github: "https://github.com/kyh" },
  twitter: "@kaiyuhsu",
  routes: ["", "/about", "/projects"],
};
