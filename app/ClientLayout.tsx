// app/ClientLayout.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Navigation from "@/components/Navigation";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [token, setToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  // Load token and theme on client
  useEffect(() => {
    setToken(getToken());
    const theme = localStorage.getItem("theme");
    const isDark = theme === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Auth protection
  useEffect(() => {
    if (token === null) return; // wait until token is loaded
    const publicPages = ["/login"];
    if (!token && !publicPages.includes(pathname)) router.push("/login");
    if (token && pathname === "/login") router.push("/dashboard");
  }, [token, pathname, router]);

  // Theme toggle
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  const handleRefresh = () => window.location.reload();

  return (
    <div
      className={`flex h-screen ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Sidebar with proper props */}
      <Sidebar pathname={pathname} darkMode={darkMode} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Marquee */}
        <div className="border-b p-0 bg-blue-600 text-white">
          <div className="overflow-hidden whitespace-nowrap py-2 px-4 text-sm animate-marquee">
            🚀 Welcome to TrackMyKid CRM — Manage devices, users, subscriptions & telemetry in real-time.
          </div>
        </div>

        {/* Search + Theme Toggle + Refresh */}
        <div className="border-b p-3 flex items-center gap-3 bg-gray-100 dark:bg-gray-800">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-700 dark:text-white outline-none"
          />
          <button
            onClick={toggleTheme}
            className="px-3 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500"
          >
            {darkMode ? "🌙 Dark" : "☀️ Light"}
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Hidden Navigation for Tabs */}
        <div className="hidden">
          <Navigation />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4">{children}</main>

        {/* Footer Marquee */}
        <div className="border-t p-2 bg-blue-600 text-white text-center animate-marquee">
          📢 TrackMyKid CRM — Stay on top of your devices, users, subscriptions & telemetry!
        </div>
      </div>
    </div>
  );
}
