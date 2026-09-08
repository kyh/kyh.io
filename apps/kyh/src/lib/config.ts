export const siteConfig = {
  creator: "@kaiyuhsu",
  description:
    "Building things for the interwebs. By day, I get to do that through investing, advising, and working on products you may not have heard of (yet)",
  name: "Kaiyu Hsu",
  routes: ["", "/showcase"],
  shortName: "kyh",
  url: process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.kyh.io",
};
