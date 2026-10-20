import Image from "next/image";

import type { WorkType } from "@/lib/data";
import { rowStyle } from "@/components/section";
import { workHistory } from "@/lib/data";

const Work = ({ work, row }: { work: WorkType; row: number }) => (
  <a
    href={work.link}
    target="_blank"
    rel="noopener noreferrer"
    className="list-row"
    style={rowStyle(row)}
  >
    <span className="flex h-5 w-5 items-center justify-center">
      <Image alt={`${work.company} icon`} width={20} height={20} src={work.favicon} />
    </span>
    <span>{work.role}</span>
    <span>{work.company}</span>
    <span className="text-right font-mono text-xs tracking-tight">{work.year}</span>
  </a>
);

export const WorkList = () => (
  <div className="-mx-2 mt-1">
    {workHistory.map((item, row) => (
      <Work key={`${item.company}-${item.year}`} work={item} row={row} />
    ))}
  </div>
);
