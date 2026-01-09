// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SidebarProps {
  darkMode?: boolean;
  pathname: string;
}

export default function Sidebar({ darkMode = false, pathname }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: "📊", color: "bg-blue-500" },
    { name: "Customers", href: "/customers", icon: "🧑‍💼", color: "bg-green-500" },
    { name: "Devices", href: "/devices", icon: "📱", color: "bg-purple-500" },
    { name: "Vehicles", href: "/vehicles", icon: "🚗", color: "bg-indigo-500" },
    { name: "Kids", href: "/kids", icon: "🧒", color: "bg-pink-500" },
    { name: "Alerts", href: "/alerts", icon: "⚠️", color: "bg-red-500" },
    { name: "Jobs", href: "/jobs", icon: "🛠️", color: "bg-indigo-700" },
    { name: "Subscriptions", href: "/subscriptions", icon: "🔄", color: "bg-teal-500" },
    { name: "Invoices", href: "/invoices", icon: "💳", color: "bg-orange-500" },
    { name: "Users", href: "/users", icon: "👥", color: "bg-cyan-500" },
    { name: "Telemetry", href: "/telemetry", icon: "📡", color: "bg-yellow-600" },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
    } catch {}
    router.replace("/login");
  };

  return (
    <aside
      className={`flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } ${darkMode ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-900"} h-screen shadow-lg border-r border-gray-200 dark:border-gray-700`}
    >
      <div className="flex items-center justify-between p-4 font-bold text-xl border-b border-gray-200 dark:border-gray-700">
        {!collapsed && "TrackMyKid CRM"}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "➡️" : "⬅️"}
        </button>
      </div>

      <nav className="flex-1 flex flex-col mt-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-lg transition-all duration-200 ${
                active
                  ? `shadow-lg ${link.color} text-white ring-2 ring-offset-1 ring-yellow-400`
                  : `hover:shadow-md hover:ring-1 hover:ring-blue-400 hover:bg-opacity-20`
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              {!collapsed && <span className="font-medium">{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          🔓 {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
