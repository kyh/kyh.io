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

const swrConfig = {
  refreshInterval: 300000, // 5 mins
  fetcher: (...args) => fetch(...args).then((res) => res.json()),
};

const AppLayout = () => (
  <SWRConfig value={swrConfig}>
    <section
      className="grid min-h-screen bg-gray-900 text-gray-300 antialiased"
      style={{ gridTemplateRows: "auto 1fr auto" }}
    >
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
