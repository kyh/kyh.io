import * as stylex from "@stylexjs/stylex";
import { containers, spacing } from "@repo/tailwind-compat/tokens.stylex";
import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";

import { About, useAbout } from "@/components/About";
import { Logo } from "@/components/Logo";

const styles = stylex.create({
  nav: {
    position: "relative",
    marginInline: "auto",
    marginBottom: spacing[10],
    display: "flex",
    maxWidth: containers["7xl"],
    justifyContent: "space-between",
  },
  brand: { display: "inline-flex", paddingInline: spacing[3], paddingBlock: spacing[5] },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: { default: spacing[5], [mediaUp.md]: spacing[6] },
    paddingRight: spacing[2],
  },
  link: {
    textDecoration: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": "underline" },
    },
  },
});

export const Navigation = () => {
  const aboutProps = useAbout();

  return (
    <nav {...stylex.props(styles.nav)}>
      <a href="/" {...stylex.props(styles.brand)}>
        <span {...stylex.props(styles.srOnly)}>Logo</span>
        <Logo />
      </a>
      <div {...stylex.props(styles.links)}>
        <button
          type="button"
          {...stylex.props(styles.link)}
          onClick={() => aboutProps.setRun(true)}
        >
          About
        </button>
        <a
          {...stylex.props(styles.link)}
          href="https://docs.google.com/spreadsheets/d/1MorR4RBtiFMexFv91w9sKcqBRIkLyv7tb394j8BHlig/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
        >
          Spreadsheet
        </a>
        <a
          {...stylex.props(styles.link)}
          href="https://github.com/kyh/tc"
          target="_blank"
          rel="noopener noreferrer"
        >
          Github
        </a>
      </div>
      <About {...aboutProps} />
    </nav>
  );
};
