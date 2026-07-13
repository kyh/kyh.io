import { MotionConfig } from "motion/react";

import Index from "./components/Index";

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Index />
    </MotionConfig>
  );
}

export default App;
