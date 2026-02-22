export const siteConfig = {
  name: "Stonksville",
  shortName: "Stonksville",
  description: "Guess the public company from its revenue breakdown. A daily business puzzle game.",
  url:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://stonksville.com",
  twitter: "@kaiyuhsu",
};
