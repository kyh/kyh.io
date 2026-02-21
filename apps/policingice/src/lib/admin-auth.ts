import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function getAdminUser() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user || session.user.isAnonymous) {
    return null;
  }

  return session.user;
}
