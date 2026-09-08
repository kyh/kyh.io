import { Footer } from "components/footer";
import { Navigation } from "components/navigation";
import { AboutPage } from "features/about/about-page";
import { ComparePage } from "features/compare/compare-page";
import { DistributionPage } from "features/distribution/distribution-page";
import { TrendPage } from "features/trend/trend-page";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  Route,
  RouterProvider,
} from "react-router-dom";
import { SWRConfig } from "swr";

const swrConfig = {
  fetcher: async (...args) => {
    const res = await fetch(...args);
    return res.json();
  },
  // 5 mins
  refreshInterval: 300_000,
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

const App = () => <RouterProvider router={router} />;

export default App;
