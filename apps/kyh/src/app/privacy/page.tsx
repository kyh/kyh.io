import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { privacyContent } from "@/lib/page-content";
import { todaysPageMetadata } from "@/lib/todays-video";

export const generateMetadata = (): Promise<Metadata> => todaysPageMetadata(privacyContent);

const Page = () => <ProsePage content={privacyContent} />;

export default Page;
