import styles from "@/styles/page.module.css";
import { gallery } from "./components/data";
import { InfiniteGrid } from "./components/infinite-grid";

export const metadata = {
  title: "Projects",
  description: "The ever growing list of things I'm working on.",
};

const ProjectsPage = () => (
  <main className={styles.projectsContainer} vaul-drawer-wrapper="">
    <InfiniteGrid nodes={gallery} />
  </main>
);

export default ProjectsPage;
