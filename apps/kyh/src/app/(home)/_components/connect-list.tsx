import { spacing } from "@repo/tailwind-compat/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { DribbbleIcon, GitHubIcon, LinkedInIcon, TwitterIcon } from "@/components/icons";
import type { SocialKind } from "@/lib/data";
import { connectLinks } from "@/lib/data";

const styles = stylex.create({
  list: {
    marginInline: `calc(-1 * ${spacing[2]})`,
    marginTop: spacing[1],
    display: "flex",
    flexDirection: "column",
  },
});

const icons = {
  twitter: TwitterIcon,
  github: GitHubIcon,
  dribbble: DribbbleIcon,
  linkedin: LinkedInIcon,
} satisfies Record<SocialKind, typeof TwitterIcon>;

export const ConnectList = () => {
  return (
    <div {...stylex.props(styles.list)}>
      {connectLinks.map((link) => {
        const Icon = icons[link.social];
        return (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`list-row social-${link.social}`}
          >
            <Icon />
            <span>{link.label}</span>
            <span>{link.value}</span>
          </a>
        );
      })}
    </div>
  );
};
