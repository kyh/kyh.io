import type { Metadata } from "next";

import { ProsePage } from "@/components/prose-page";
import { aboutContent } from "@/lib/page-content";
import { todaysPageMetadata } from "@/lib/todays-video";

export const generateMetadata = () => todaysPageMetadata(aboutContent);

const Page = () => <ProsePage content={aboutContent} />;

export default Page;
