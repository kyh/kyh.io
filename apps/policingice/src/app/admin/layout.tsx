import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Admin",
};

const AdminLayout = async ({ children }: { children: React.ReactNode }) => await children;

export default AdminLayout;
