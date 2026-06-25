"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  const pathname = usePathname();
  const router = useRouter();

  // Not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Force password change
  useEffect(() => {
    if (
      !loading &&
      user &&
      user.must_change_password &&
      pathname !== "/settings"
    ) {
      router.replace("/settings");
    }
  }, [loading, user, pathname, router]);

  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="label-mono">authenticating...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Prevent protected pages from flashing while redirecting
  if (
    user.must_change_password &&
    pathname !== "/settings"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="label-mono">
          Redirecting to password setup...
        </div>
      </div>
    );
  }

  return children;
}