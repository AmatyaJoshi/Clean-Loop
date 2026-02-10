"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

const PORTAL_ROLES = ["owner", "admin", "outlet_manager", "staff", "super_admin"];

export default function AdminPortalLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isRegisterPage = pathname?.endsWith("/register");

  useEffect(() => {
    if (status === "loading") return;

    if (isRegisterPage) {
      return;
    }

    if (!session?.user) {
      router.replace("/staff/login?callbackUrl=" + encodeURIComponent(pathname || "/admin-portal/dashboard"));
      return;
    }

    const role = (session.user as { role?: string }).role;
    if (!role || !PORTAL_ROLES.includes(role)) {
      router.replace("/?error=portal-access-denied");
    }
  }, [session, status, isRegisterPage, pathname, router]);

  if (isRegisterPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const role = (session.user as { role?: string }).role;
  if (!role || !PORTAL_ROLES.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
