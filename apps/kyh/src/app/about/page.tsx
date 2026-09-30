import type { Metadata } from "next";

import { MarkdownPage } from "@/components/markdown-page";
import { aboutContent } from "@/lib/page-content";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = buildPageMetadata(aboutContent);

const Page = () => <MarkdownPage content={aboutContent} />;

export default Page;
