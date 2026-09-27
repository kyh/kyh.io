import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { developersContent } from "@/lib/page-content";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = buildPageMetadata(developersContent);

const Page = () => <ProsePage content={developersContent} />;

export default Page;
