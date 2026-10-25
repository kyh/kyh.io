import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { agentsContent } from "@/lib/page-content";
import { todaysPageMetadata } from "@/lib/todays-video";

export const generateMetadata = (): Promise<Metadata> => todaysPageMetadata(agentsContent);

const Page = () => <ProsePage content={agentsContent} />;

export default Page;
