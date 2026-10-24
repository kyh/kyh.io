import type { Metadata } from "next";

// The admin is signed-in tooling, not content: keep every page of it out of search.
export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Admin",
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => children;

export default AdminLayout;
