import { ProsePage } from "@/components/prose-page";
import { agentsContent } from "@/lib/page-content";
import { todaysPageMetadata } from "@/lib/todays-video";

export const generateMetadata = async () => await todaysPageMetadata(agentsContent);

const Page = () => <ProsePage content={agentsContent} />;

export default Page;
