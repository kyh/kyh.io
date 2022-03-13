import type { AppProps } from "next/app";
import Router from "next/router";
import nprogress from "nprogress";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { Dock } from "@components/Dock";
import "styles/globals.css";

Router.events.on("routeChangeStart", nprogress.start);
Router.events.on("routeChangeError", nprogress.done);
Router.events.on("routeChangeComplete", nprogress.done);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Script
        strategy="afterInteractive"
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "0e42005637254ecab41ca2bdd010d5b9"}'
      />
      <Component {...pageProps} />
      <Dock />
    </ThemeProvider>
  );
}

export default MyApp;
