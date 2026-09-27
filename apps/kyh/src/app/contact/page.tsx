import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { contactContent } from "@/lib/page-content";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = buildPageMetadata(contactContent);

const Page = () => <ProsePage content={contactContent} />;

export default Page;
