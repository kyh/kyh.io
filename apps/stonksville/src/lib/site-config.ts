export const siteConfig = {
  description:
    "Minute trading. Realtime trading game where you tap to bet on price up to 90 seconds ahead",
  name: "Stonksville",
  shortName: "Stonksville",
  twitter: "@kaiyuhsu",
  url:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://www.stonksville.com",
};
