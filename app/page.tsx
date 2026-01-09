"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/dashboard"); // redirect logged-in users to dashboard
    } else {
      router.replace("/login"); // redirect unauthenticated users to login
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-700 dark:text-gray-200">Checking authentication...</p>
    </div>
  );
}
