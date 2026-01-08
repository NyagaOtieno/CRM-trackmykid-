"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const tabs = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Device Trackings", href: "/device-trackings" },
    { name: "Devices", href: "/devices" },
    { name: "Invoices", href: "/invoices" },
    { name: "Jobs", href: "/jobs" },
    { name: "Kids", href: "/kids" },
    { name: "Subscriptions", href: "/subscriptions" },
    { name: "Telemetry", href: "/telemetry" },
    { name: "Users", href: "/users" },
    { name: "Vehicles", href: "/vehicles" },
    { name: "Customers", href: "/customers" },
  ];

  return (
    <nav className="flex space-x-4 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-md whitespace-nowrap transition ${
              active
                ? "bg-blue-600 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
