import { DribbbleIcon, GitHubIcon, LinkedInIcon, TwitterIcon } from "@/components/icons";
import type { SocialKind } from "@/lib/data";
import { connectLinks } from "@/lib/data";

const icons: Record<SocialKind, typeof TwitterIcon> = {
  twitter: TwitterIcon,
  github: GitHubIcon,
  dribbble: DribbbleIcon,
  linkedin: LinkedInIcon,
};

export const ConnectList = () => {
  return (
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
};
