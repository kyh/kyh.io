import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Dock } from "@components/Dock";
import "styles/globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Dock />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;
