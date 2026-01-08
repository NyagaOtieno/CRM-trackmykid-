// app/clientpage.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

interface Counts {
  totalCustomers: number;
  totalDevices: number;
  totalVehicles: number;
  totalKids: number;
  totalSubscriptions: number;
  totalAlerts: number;
}

interface CountCardProps {
  title: string;
  count: number;
  color: string;
  onClick?: () => void;
}

function CountCard({ title, count, color, onClick }: CountCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex-1 cursor-pointer p-4 rounded-lg shadow-lg ${color} text-white hover:scale-105 transform transition-all duration-300`}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}

export default function ClientPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real counts from backend
  const fetchCounts = async () => {
    try {
      const res = await apiGet("/api/dashboard/summary");
      const data: Counts = {
        totalCustomers: res.totalCustomers ?? res.customers ?? 0,
        totalDevices: res.totalDevices ?? res.devices ?? 0,
        totalVehicles: res.totalVehicles ?? res.vehicles ?? 0,
        totalKids: res.totalKids ?? res.kids ?? 0,
        totalSubscriptions: res.totalSubscriptions ?? res.subscriptions ?? 0,
        totalAlerts: res.totalAlerts ?? res.alerts ?? 0,
      };
      setCounts(data);
    } catch (err: any) {
      // if unauthorized, redirect to login
      if ((err as any)?.status === 401 || String(err.message).toLowerCase().includes("unauthorized")) {
        router.replace("/login");
        return;
      }
      console.error("Error fetching dashboard counts:", err);
      setCounts({
        totalCustomers: 0,
        totalDevices: 0,
        totalVehicles: 0,
        totalKids: 0,
        totalSubscriptions: 0,
        totalAlerts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
    // optional: refresh every 60s
    // const id = setInterval(fetchCounts, 60000);
    // return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !counts) {
    return <p className="p-4 text-center dark:text-white">Loading...</p>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Marquee */}
      <div className="border-b p-0 bg-blue-600 text-white">
        <div className="overflow-hidden whitespace-nowrap py-2 px-4 text-sm animate-marquee">
          🚀 TrackMyKid CRM — Manage devices, users, subscriptions & telemetry in real-time.
        </div>
      </div>

      {/* Dashboard Count Cards */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <CountCard title="Total Customers" count={counts.totalCustomers} color="bg-blue-500" onClick={() => router.push("/customers")} />
        <CountCard title="Total Devices" count={counts.totalDevices} color="bg-purple-500" onClick={() => router.push("/devices")} />
        <CountCard title="Total Vehicles" count={counts.totalVehicles} color="bg-indigo-500" onClick={() => router.push("/vehicles")} />
        <CountCard title="Total Kids" count={counts.totalKids} color="bg-pink-500" onClick={() => router.push("/kids")} />
        <CountCard title="Total Subscriptions" count={counts.totalSubscriptions} color="bg-teal-500" onClick={() => router.push("/subscriptions")} />
        <CountCard title="Total Alerts" count={counts.totalAlerts} color="bg-orange-500" onClick={() => router.push("/alerts")} />
      </div>

      {/* Footer Marquee */}
      <div className="border-t p-2 bg-blue-600 text-white text-center animate-marquee">
        📢 Stay on top of your devices, users, subscriptions & alerts with TrackMyKid CRM!
      </div>
    </div>
  );
}
