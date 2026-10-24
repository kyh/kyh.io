import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/page-metadata";
import { RSVPReader } from "./_components/rsvp-reader";

export const metadata: Metadata = buildPageMetadata({
  description: "Speed read through my bio",
  path: "/rsvp",
  title: "RSVP",
});

const Page = () => <RSVPReader />;

export default Page;
