import Head from "next/head";

export const APP_NAME = "Kaiyu Hsu";
export const APP_DESCRIPTION =
  "I enjoy building things for the interwebs. By day, I get to do that through investing, advising, and working on products you may not have heard of (yet)";
export const APP_URL = "https://kyh.io";
const OG_IMAGE_URL = `${APP_URL}/preview.png`;

export const SEO = ({
  title = "",
  siteTitle = APP_NAME,
  description = APP_DESCRIPTION,
}) => {
  const finalTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  return (
    <Head>
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={description} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:url" content={APP_URL} />
      <meta property="og:image" content={OG_IMAGE_URL} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="628" />
      <meta property="og:locale" content="en_US" />

      <meta property="twitter:card" content="summary" />
      <meta property="twitter:creator" content="@kaiyuhsu" />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta name="twitter:site" content={siteTitle} />
      <meta name="twitter:url" content={APP_URL} />
      <meta name="twitter:image" content={OG_IMAGE_URL} />
    </Head>
  );
};
