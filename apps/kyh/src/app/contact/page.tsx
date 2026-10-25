import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { contactContent } from "@/lib/page-content";
import { todaysPageMetadata } from "@/lib/todays-video";

export const generateMetadata = (): Promise<Metadata> => todaysPageMetadata(contactContent);

const Page = () => <ProsePage content={contactContent} />;

export default Page;
