import { MotionConfig } from "motion/react";

import Index from "./components/Index";

const App = () => (
  <MotionConfig reducedMotion="user">
    <Index />
  </MotionConfig>
);

export default App;
