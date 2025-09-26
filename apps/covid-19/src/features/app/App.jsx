import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SWRConfig } from "swr";
import { Navigation } from "components/Navigation";
import { Footer } from "components/Footer";
import { TrendPage } from "features/trend/TrendPage";
import { DistributionPage } from "features/distribution/DistributionPage";
import { ComparePage } from "features/compare/ComparePage";
import { AboutPage } from "features/about/AboutPage";

const App = () => {
  return (
    <BrowserRouter>
      <SWRConfig
        value={{
          refreshInterval: 300000, // 5 mins
          fetcher: (...args) => fetch(...args).then((res) => res.json()),
        }}
      >
        <section
          className="text-gray-300 antialiased min-h-screen bg-gray-900 grid"
          style={{ gridTemplateRows: "auto 1fr auto" }}
        >
          <Navigation />
          <Routes>
            <Route path="/" element={<TrendPage />} />
            <Route path="/distribution" element={<DistributionPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
          <Footer />
        </section>
      </SWRConfig>
    </BrowserRouter>
  );
};

export default App;
