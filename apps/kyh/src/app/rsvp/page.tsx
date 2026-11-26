import { todaysPageMetadata } from "@/lib/todays-video";
import { RSVPReader } from "./_components/rsvp-reader";

export const generateMetadata = async () =>
  await todaysPageMetadata({
    description: "Speed read through my bio",
    path: "/rsvp",
    title: "RSVP",
  });

const Page = () => <RSVPReader />;

export default Page;
