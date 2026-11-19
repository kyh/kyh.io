import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Admin",
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => children;

export default AdminLayout;
