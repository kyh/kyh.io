import type { AppProps } from "next/app";
import Router from "next/router";
import nprogress from "nprogress";
import { ThemeProvider } from "next-themes";
import { Dock } from "@components/Dock";
import "styles/globals.css";

Router.events.on("routeChangeStart", nprogress.start);
Router.events.on("routeChangeError", nprogress.done);
Router.events.on("routeChangeComplete", nprogress.done);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
      <Dock />
    </ThemeProvider>
  );
}

export default MyApp;
