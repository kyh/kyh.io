import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { agentsContent } from "@/lib/page-content";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = buildPageMetadata(agentsContent);

const Page = () => <ProsePage content={agentsContent} />;

export default Page;
