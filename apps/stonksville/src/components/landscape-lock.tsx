/** Wrapper for the .landscape-shell class defined in globals.css. */
export function LandscapeShell({ children }: { children: React.ReactNode }) {
  return <div className="landscape-shell h-full w-full">{children}</div>;
}
