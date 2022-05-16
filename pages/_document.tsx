import NextDocument, { Html, Head, Main, NextScript } from "next/document";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME;

const criticalStyles = `
@font-face {
  font-family: gilroy;
  src: url(/fonts/Gilroy-Medium.woff2) format("woff2"),
    url(/fonts/Gilroy-Medium.woff) format("woff");
  font-weight: 500;
  font-style: normal;
  font-display: fallback;
}

@font-face {
  font-family: gilroy;
  src: url(/fonts/Gilroy-Regular.woff2) format("woff2"),
    url(/fonts/Gilroy-Regular.woff) format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: fallback;
}
`;

export default class Document extends NextDocument {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta name="referrer" content="origin" />
          <meta name="application-name" content={APP_NAME} />
          <meta name="robots" content="index, follow" />
          <meta property="fb:app_id" content="{FB_ID}" />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/favicon/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon/favicon-16x16.png"
          />
          <link rel="manifest" href="/favicon/site.webmanifest" />
          <link
            rel="mask-icon"
            href="/favicon/safari-pinned-tab.svg"
            color="#111827"
          />
          <link rel="shortcut icon" href="/favicon/favicon.ico" />
          <meta name="msapplication-TileColor" content="#111827" />
          <meta
            name="msapplication-config"
            content="/favicon/browserconfig.xml"
          />
          <meta name="theme-color" content="#111827" />
          <style dangerouslySetInnerHTML={{ __html: criticalStyles }} />
        </Head>
        <body>
          <Main />
          <NextScript />
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "0e42005637254ecab41ca2bdd010d5b9"}'
          />
        </body>
      </Html>
    );
  }
}
