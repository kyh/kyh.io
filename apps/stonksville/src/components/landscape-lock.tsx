/**
 * Wrapper that forces landscape layout on mobile portrait screens via CSS rotation.
 * The rotation is on this div (not body), so position:fixed, confetti, and
 * third-party DOM insertions remain in normal viewport space.
 */
export function LandscapeShell({ children }: { children: React.ReactNode }) {
  return <div className="landscape-shell h-full w-full">{children}</div>;
}
