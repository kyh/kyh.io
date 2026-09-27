import { DribbbleIcon, GitHubIcon, LinkedInIcon, TwitterIcon } from "@/components/icons";
import type { SocialKind } from "@/lib/data";
import { connectLinks } from "@/lib/data";

const icons = {
  dribbble: DribbbleIcon,
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  twitter: TwitterIcon,
} satisfies Record<SocialKind, typeof TwitterIcon>;

export const ConnectList = () => (
  <div className="-mx-2 mt-1 flex flex-col">
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
