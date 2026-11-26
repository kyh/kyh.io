import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Admin",
};

// oxlint-disable-next-line typescript/promise-function-async -- React 19's ReactNode includes Promise; this returns synchronously
const AdminLayout = ({ children }: { children: React.ReactNode }) => children;

export default AdminLayout;
