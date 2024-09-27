import { gallery } from "./components/data";
import { InfiniteGrid } from "./components/infinite-grid";

export const metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
};

const ShowcasePage = () => (
  <main>
    <InfiniteGrid nodes={gallery} />
  </main>
);

export default ShowcasePage;
