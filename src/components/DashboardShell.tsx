"use client";

import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname(); // Get current path

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Pass pathname to Sidebar */}
      <Sidebar pathname={pathname} />

      <main className="flex-1 p-4 overflow-auto">{children}</main>
    </div>
  );
}
