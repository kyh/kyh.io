import { PredictionLesson } from "./lessons/prediction/lesson";

function NotFoundPage() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <a href="/">Return to Visual ML</a>
    </main>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/" || path === "/lessons/prediction") return <PredictionLesson />;
  return <NotFoundPage />;
}
