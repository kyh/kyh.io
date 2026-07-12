import { useEffect, useRef } from "react";
import { Link, Outlet, ScrollRestoration, useLocation, type RouteObject } from "react-router-dom";

import { PageMetadata } from "./components/page-metadata";
import { availableLessons, defaultLesson, lessonPath, type AvailableLesson } from "./curriculum";
import { lessonPages } from "./lesson-registry";

function LessonRoute({
  lesson,
  canonicalPath,
}: {
  lesson: AvailableLesson;
  canonicalPath: string;
}) {
  const Lesson = lessonPages[lesson.slug];

  return (
    <>
      <PageMetadata
        title={lesson.page.title}
        description={lesson.page.description}
        path={canonicalPath}
      />
      <Lesson />
    </>
  );
}

function NotFoundPage() {
  const location = useLocation();

  return (
    <>
      <PageMetadata
        title="Page not found | Visual ML"
        description="The requested Visual ML lesson could not be found."
        path={location.pathname}
      />
      <main className="not-found" tabIndex={-1}>
        <h1>Page not found</h1>
        <Link to="/">Return to Visual ML</Link>
      </main>
    </>
  );
}

function RouteLayout() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    const pathChanged = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    if (!pathChanged) return;

    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

const lessonRoutes: RouteObject[] = availableLessons.map((lesson) => ({
  path: lessonPath(lesson.slug),
  element: <LessonRoute lesson={lesson} canonicalPath={lessonPath(lesson.slug)} />,
}));

export const routes: RouteObject[] = [
  {
    element: <RouteLayout />,
    children: [
      { path: "/", element: <LessonRoute lesson={defaultLesson} canonicalPath="/" /> },
      ...lessonRoutes,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
