// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

type Stats = {
  totalCustomers?: number;
  totalDevices?: number;
  totalVehicles?: number;
  totalKids?: number;
  totalSubscriptions?: number;
  totalJobs?: number;
  totalAlerts?: number;
  customers?: number;
  devices?: number;
  vehicles?: number;
  kids?: number;
  subscriptions?: number;
  jobs?: number;
  alerts?: number;
};

interface CardProps {
  title: string;
  count: number | string;
  icon: string;
  color: string;
  onClick?: () => void;
}

function CountCard({ title, count, icon, color, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg shadow-lg p-6 flex flex-col items-center justify-center ${color} text-white hover:scale-105 transform transition-all duration-300`}
    >
      <div className="text-4xl mb-2">{icon}</div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-2xl font-bold mt-2">{count}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet("/api/dashboard/summary");
        const normalized: Stats = {
          totalCustomers: res.totalCustomers ?? res.customers ?? 0,
          totalDevices: res.totalDevices ?? res.devices ?? 0,
          totalVehicles: res.totalVehicles ?? res.vehicles ?? 0,
          totalKids: res.totalKids ?? res.kids ?? 0,
          totalSubscriptions: res.totalSubscriptions ?? res.subscriptions ?? 0,
          totalJobs: res.totalJobs ?? res.jobs ?? 0,
          totalAlerts: res.totalAlerts ?? res.alerts ?? 0,
        };
        setStats(normalized);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        // Redirect on unauthorized
        if ((err as any)?.status === 401 || String(err.message).toLowerCase().includes("unauthorized")) {
          router.replace("/login");
          return;
        }
        setError(err.message || "Failed to fetch dashboard");
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) return <div className="py-10 text-center">Loading...</div>;
  if (error) return <div className="py-10 text-center text-red-500">{error}</div>;

  const cards: CardProps[] = [
    { title: "Total Customers", count: stats?.totalCustomers ?? "-", icon: "👥", color: "bg-blue-500", onClick: () => router.push("/customers") },
    { title: "Total Devices", count: stats?.totalDevices ?? "-", icon: "📱", color: "bg-purple-500", onClick: () => router.push("/devices") },
    { title: "Total Vehicles", count: stats?.totalVehicles ?? "-", icon: "🚗", color: "bg-indigo-500", onClick: () => router.push("/vehicles") },
    { title: "Total Kids", count: stats?.totalKids ?? "-", icon: "🧒", color: "bg-pink-500", onClick: () => router.push("/kids") },
    { title: "Total Subscriptions", count: stats?.totalSubscriptions ?? "-", icon: "🔄", color: "bg-teal-500", onClick: () => router.push("/subscriptions") },
    { title: "Total Jobs", count: stats?.totalJobs ?? "-", icon: "🛠️", color: "bg-orange-500", onClick: () => router.push("/jobs") },
    { title: "Total Alerts", count: stats?.totalAlerts ?? "-", icon: "⚠️", color: "bg-red-700", onClick: () => router.push("/alerts") },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <CountCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
