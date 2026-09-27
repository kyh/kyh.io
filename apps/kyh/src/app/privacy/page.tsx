import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { privacyContent } from "@/lib/page-content";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = buildPageMetadata(privacyContent);

const Page = () => <ProsePage content={privacyContent} />;

export default Page;
