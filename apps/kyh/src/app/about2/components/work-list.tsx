import Image from "next/image";

import { getPublicFaviconUrl } from "@/lib/public-assets";

type WorkItemData = {
  role: string;
  company: string;
  year: string;
  logo: string;
  link: string;
};

const workHistory: WorkItemData[] = [
  {
    role: "Investor",
    company: "Sequoia Capital",
    year: "Now",
    logo: "sequoia.png",
    link: "https://sequoiacap.com",
  },
  {
    role: "Engineering",
    company: "Vercel",
    year: "2022",
    logo: "vercel.png",
    link: "https://vercel.com",
  },
  {
    role: "Engineering",
    company: "Google",
    year: "2020",
    logo: "google.png",
    link: "https://grow.google",
  },
  {
    role: "Engineering",
    company: "Amazon",
    year: "2018",
    logo: "amazon.png",
    link: "https://amazon.design",
  },
  {
    role: "Engineering",
    company: "Atrium",
    year: "2024",
    logo: "atrium.png",
    link: "https://atrium.com",
  },
  {
    role: "Engineering",
    company: "Cardiogram",
    year: "2017",
    logo: "cardiogram.png",
    link: "https://cardiogram.com",
  },
];

const WorkItem = ({ item }: { item: WorkItemData }) => {
  const content = (
    <>
      <span className="flex h-5 w-5 items-center justify-center">
        <Image
          alt={`${item.company} icon`}
          width={20}
          height={20}
          src={getPublicFaviconUrl(item.logo)}
        />
      </span>
      <span>{item.role}</span>
      <span>{item.company}</span>
      <span className="text-right font-mono text-xs tracking-tight">
        {item.year}
      </span>
    </>
  );

  const className = "list-row grid-cols-[20px_72px_1fr_auto]";

  if (item.link) {
    return (
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
};

export const WorkList = () => (
  <div className="-mx-2 mt-1">
    {workHistory.map((item) => (
      <WorkItem key={`${item.company}-${item.year}`} item={item} />
    ))}
  </div>
);
