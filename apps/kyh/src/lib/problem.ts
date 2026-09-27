/** RFC 9457 problem details, so an API client gets JSON it can parse instead of a page. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

export const buildNotFoundProblem = (pathname: string): Problem => ({
  detail: `No API endpoint exists at ${pathname}. This site has no /api surface; see /openapi.json for what it does serve.`,
  instance: pathname,
  status: 404,
  title: "Not Found",
  type: "about:blank",
});
