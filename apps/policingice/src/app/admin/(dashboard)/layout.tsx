import { leading } from "@repo/tailwind-compat/leading.stylex";
import { theme } from "../../styles/tokens.stylex";
import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";
import { containers, fontSizes, fontWeights, spacing } from "@repo/tailwind-compat/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { getSession } from "@/lib/auth";

const styles = stylex.create({
  page: {
    minHeight: "100vh",
    backgroundColor: theme.background,
    paddingInline: { default: spacing[4], [mediaUp.sm]: spacing[6] },
    paddingBlock: spacing[8],
  },
  wrap: { maxWidth: containers["6xl"] },
  header: {
    marginBottom: spacing[8],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: fontSizes.base,
    lineHeight: leading.base,
    fontWeight: fontWeights.normal,
  },
  nav: {
    display: "flex",
    gap: spacing[4],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
  },
  link: {
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  center: { display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" },
  muted: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: theme.mutedForeground,
  },
});

const AdminContent = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();
  if (!session?.user || session.user.isAnonymous) {
    redirect("/admin/login");
  }

  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.wrap)}>
        <header {...stylex.props(styles.header)}>
          <h1 {...stylex.props(styles.title)}>Admin</h1>
          <nav {...stylex.props(styles.nav)}>
            <Link href="/admin/incidents" {...stylex.props(styles.link)}>
              Incidents
            </Link>
            <Link href="/admin/create" {...stylex.props(styles.link)}>
              Create
            </Link>
            <Link href="/admin/reddit-feed" {...stylex.props(styles.link)}>
              Reddit
            </Link>
            <Link href="/" {...stylex.props(styles.link)}>
              Exit
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense
      fallback={
        <div {...stylex.props(styles.center)}>
          <span {...stylex.props(styles.muted)}>Loading...</span>
        </div>
      }
    >
      <AdminContent>{children}</AdminContent>
    </Suspense>
  );
};

export default AdminLayout;
