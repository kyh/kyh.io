import styles from "@/styles/page.module.css";
import { Flow } from "./components/flow";

import "./components/flow.css";

export const metadata = {
  title: "Projects",
  description: "The ever growing list of things I'm working on.",
};

const ProjectsPage = () => (
  <main className={styles.projectsContainer} vaul-drawer-wrapper="">
    <Flow />
  </main>
);

export default ProjectsPage;
