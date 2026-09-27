import type { Metadata } from "next";
import { RSVPReader } from "./_components/rsvp-reader";

export const metadata: Metadata = {
  alternates: { canonical: "/rsvp" },
  description: "Speed read through my bio",
  title: "RSVP",
};

const Page = () => <RSVPReader />;

export default Page;
