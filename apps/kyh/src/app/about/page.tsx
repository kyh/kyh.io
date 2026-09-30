import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { aboutContent } from "@/lib/page-content";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = buildPageMetadata(aboutContent);

const Page = () => <ProsePage content={aboutContent} />;

export default Page;
