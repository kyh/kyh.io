/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://kyh.io",
  generateRobotsTxt: true,
};

export default config;
