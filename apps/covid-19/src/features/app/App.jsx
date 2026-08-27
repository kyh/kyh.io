import * as stylex from "@stylexjs/stylex";
import { Footer } from "components/Footer";
import { Navigation } from "components/Navigation";
import { AboutPage } from "features/about/AboutPage";
import { ComparePage } from "features/compare/ComparePage";
import { DistributionPage } from "features/distribution/DistributionPage";
import { TrendPage } from "features/trend/TrendPage";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  Route,
  RouterProvider,
} from "react-router-dom";
import { SWRConfig } from "swr";

import { colors } from "../../styles/tokens.stylex";

const styles = stylex.create({
  shell: {
    display: "grid",
    minHeight: "100vh",
    backgroundColor: colors.gray900,
    color: colors.gray300,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    gridTemplateRows: "auto 1fr auto",
  },
});

const swrConfig = {
  refreshInterval: 300000, // 5 mins
  fetcher: (...args) => fetch(...args).then((res) => res.json()),
};

const AppLayout = () => (
  <SWRConfig value={swrConfig}>
    <section {...stylex.props(styles.shell)}>
      <Navigation />
      <Outlet />
      <Footer />
    </section>
  </SWRConfig>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />}>
      <Route path="/" element={<TrendPage />} />
      <Route path="/distribution" element={<DistributionPage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/about" element={<AboutPage />} />
    </Route>,
  ),
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
