import type { Metadata } from "next";
import { RSVPReader } from "./_components/rsvp-reader";

export const metadata: Metadata = {
  title: "RSVP",
  description: "Speed read through my bio",
  alternates: { canonical: "/rsvp" },
};

const Page = () => {
  return <RSVPReader />;
};

export default Page;
