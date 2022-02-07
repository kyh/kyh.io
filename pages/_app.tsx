import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Dock } from "@components/Dock";
import { Scene } from "@components/Scene";
import "styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Scene />
      <Dock />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;
