import {
  DribbbleIcon,
  GitHubIcon,
  LinkedInIcon,
  TwitterIcon,
} from "@/components/icons";
import { social } from "@/components/social";

const connectLinks = [
  {
    label: "Twitter",
    value: "@kaiyuhsu",
    href: social.twitter,
    icon: TwitterIcon,
    social: "twitter",
  },
  {
    label: "GitHub",
    value: "@kyh",
    href: social.github,
    icon: GitHubIcon,
    social: "github",
  },
  {
    label: "Dribbble",
    value: "@kaiyuhsu",
    href: social.dribbble,
    icon: DribbbleIcon,
    social: "dribbble",
  },
  {
    label: "LinkedIn",
    value: "@kyh",
    href: social.linkedin,
    icon: LinkedInIcon,
    social: "linkedin",
  },
];

export const ConnectList = () => {
  return (
    <div className="-mx-2 mt-1 flex flex-col">
      {connectLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`list-row grid-cols-[20px_72px_1fr] social-${link.social}`}
        >
          <link.icon />
          <span>{link.label}</span>
          <span>{link.value}</span>
        </a>
      ))}
    </div>
  );
};
