// app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

type Stats = {
  totalCustomers: number;
  totalDevices: number;
  totalVehicles: number;
  totalKids: number;
  totalSubscriptions: number;
  totalJobs: number;
  totalAlerts: number;
};

type AnyObj = Record<string, any>;

const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Extract totals from common list responses:
 * - { total: 10 }
 * - { count: 10 }
 * - { totalCount: 10 }
 * - { data: [...], total: 10 }
 * - { items: [...], totalItems: 10 }
 * - fallback: array length
 */
function readTotal(res: any): number {
  if (res == null) return 0;

  // direct totals
  const directKeys = ["total", "count", "totalCount", "totalItems", "totalRecords"];
  for (const k of directKeys) if (res?.[k] != null) return toNumber(res[k]);

  // nested totals
  const containers = [res?.meta, res?.pagination, res?.data, res?.summary, res?.stats];
  for (const c of containers) {
    if (!c) continue;
    for (const k of directKeys) if (c?.[k] != null) return toNumber(c[k]);
  }

  // list fallback
  if (Array.isArray(res)) return res.length;
  if (Array.isArray(res?.data)) return res.data.length;
  if (Array.isArray(res?.items)) return res.items.length;

  return 0;
}

/**
 * Dashboard summary normalizer (whatever it returns).
 * We’ll still override with list endpoints totals if they exist.
 */
function normalizeSummary(res: AnyObj): Partial<Stats> {
  const pick = (keys: string[]) => {
    for (const k of keys) if (res?.[k] != null) return toNumber(res[k]);
    const containers = [res?.data, res?.totals, res?.summary, res?.stats];
    for (const c of containers) {
      if (!c) continue;
      for (const k of keys) if (c?.[k] != null) return toNumber(c[k]);
    }
    return undefined;
  };

  return {
    totalCustomers: pick(["totalCustomers", "customers", "customerCount"]),
    totalDevices: pick(["totalDevices", "devices", "deviceCount"]),
    totalVehicles: pick(["totalVehicles", "vehicles", "vehicleCount"]),
    totalKids: pick(["totalKids", "kids", "kidCount"]),
    totalSubscriptions: pick(["totalSubscriptions", "subscriptions", "subscriptionCount"]),
    totalJobs: pick(["totalJobs", "jobs", "jobCount"]),
    totalAlerts: pick(["totalAlerts", "alerts", "alertCount"]),
  };
}

/**
 * Fetch totals from the real endpoints.
 * Uses perPage=1 to minimize payload but still get "total".
 */
async function fetchTotalsFromEndpoints(): Promise<Partial<Stats>> {
  const [
    customersRes,
    devicesRes,
    vehiclesRes,
    kidsRes,
    subscriptionsRes,
    jobsRes,
    alertsRes,
  ] = await Promise.all([
    apiGet("/api/customers", { page: 1, perPage: 1 }),
    apiGet("/api/devices", { page: 1, perPage: 1 }),
    apiGet("/api/vehicles", { page: 1, perPage: 1 }),
    apiGet("/api/kids", { page: 1, perPage: 1 }),
    apiGet("/api/subscriptions", { page: 1, perPage: 1 }),
    apiGet("/api/jobs", { page: 1, perPage: 1 }),
    apiGet("/api/alerts", { page: 1, perPage: 1 }),
  ]);

  return {
    totalCustomers: readTotal(customersRes),
    totalDevices: readTotal(devicesRes),
    totalVehicles: readTotal(vehiclesRes),
    totalKids: readTotal(kidsRes),
    totalSubscriptions: readTotal(subscriptionsRes),
    totalJobs: readTotal(jobsRes),
    totalAlerts: readTotal(alertsRes),
  };
}

function CountCard({
  title,
  count,
  icon,
  onClick,
}: {
  title: string;
  count: number;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border bg-white p-5 shadow-sm",
        "transition hover:shadow-md hover:-translate-y-[1px]",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-3xl">{icon}</div>
        <div className="text-2xl font-bold tabular-nums text-gray-900">{count}</div>
      </div>
      <div className="mt-3 text-sm font-medium text-gray-700">{title}</div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalDevices: 0,
    totalVehicles: 0,
    totalKids: 0,
    totalSubscriptions: 0,
    totalJobs: 0,
    totalAlerts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      setError(null);
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);

      try {
        // 1) try summary (if it exists)
        let summaryPart: Partial<Stats> = {};
        try {
          const summaryRes = await apiGet("/api/dashboard/summary");
          summaryPart = normalizeSummary(summaryRes);
        } catch {
          // summary missing or incomplete — ignore
          summaryPart = {};
        }

        // 2) always compute from real endpoints (source of truth)
        const endpointTotals = await fetchTotalsFromEndpoints();

        // 3) merge — endpoint totals override summary if they’re non-zero
        const merged: Stats = {
          totalCustomers:
            (endpointTotals.totalCustomers ?? 0) || (summaryPart.totalCustomers ?? 0),
          totalDevices:
            (endpointTotals.totalDevices ?? 0) || (summaryPart.totalDevices ?? 0),
          totalVehicles:
            (endpointTotals.totalVehicles ?? 0) || (summaryPart.totalVehicles ?? 0),
          totalKids: (endpointTotals.totalKids ?? 0) || (summaryPart.totalKids ?? 0),
          totalSubscriptions:
            (endpointTotals.totalSubscriptions ?? 0) || (summaryPart.totalSubscriptions ?? 0),
          totalJobs: (endpointTotals.totalJobs ?? 0) || (summaryPart.totalJobs ?? 0),
          totalAlerts: (endpointTotals.totalAlerts ?? 0) || (summaryPart.totalAlerts ?? 0),
        };

        setStats(merged);
      } catch (err: any) {
        const status = err?.status;
        const msg = String(err?.message || "").toLowerCase();
        if (status === 401 || status === 403 || msg.includes("unauthorized")) {
          router.replace("/login");
          return;
        }
        setError(err?.message || "Failed to fetch dashboard counts");
      } finally {
        if (mode === "initial") setLoading(false);
        if (mode === "refresh") setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  const cards = useMemo(
    () => [
      { title: "Customers", count: stats.totalCustomers, icon: "👥", href: "/customers" },
      { title: "Devices", count: stats.totalDevices, icon: "📱", href: "/devices" },
      { title: "Vehicles", count: stats.totalVehicles, icon: "🚗", href: "/vehicles" },
      { title: "Kids", count: stats.totalKids, icon: "🧒", href: "/kids" },
      { title: "Subscriptions", count: stats.totalSubscriptions, icon: "🔄", href: "/subscriptions" },
      { title: "Jobs", count: stats.totalJobs, icon: "🛠️", href: "/jobs" },
      { title: "Alerts", count: stats.totalAlerts, icon: "⚠️", href: "/alerts" },
    ],
    [stats]
  );

  if (loading) return <div className="py-10 text-center text-gray-600">Loading…</div>;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Live totals from your backend endpoints.
          </p>
        </div>

        <button
          type="button"
          onClick={() => load("refresh")}
          disabled={refreshing}
          className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="font-semibold">Could not load dashboard</div>
          <div className="text-sm mt-1">{error}</div>
          <button
            type="button"
            onClick={() => load("refresh")}
            className="mt-3 rounded-lg bg-red-600 text-white px-3 py-2 text-sm hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <CountCard key={c.title} title={c.title} count={c.count} icon={c.icon} onClick={() => router.push(c.href)} />
        ))}
      </div>
    </div>
  );
}
