"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { apiGet, apiDelete } from "@/lib/api";

type Subscription = {
  id: number;
  customerName: string;
  planName: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

const safeString = (value: any) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const normalizeSubscription = (s: any): Subscription => ({
  id: s.id,
  customerName: s.customerName ?? s.customer?.name ?? "-",
  planName: s.planName ?? s.plan?.name ?? "-",
  status: typeof s.status === "string" ? s.status : "unknown",
  startDate: s.startDate ?? "-",
  endDate: s.endDate ?? "-",
  createdAt: s.createdAt ?? "-",
  updatedAt: s.updatedAt ?? "-",
});

export default function SubscriptionsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/api/subscriptions", { q: query || undefined, page, perPage });
      const list = Array.isArray(res)
        ? res.map(normalizeSubscription)
        : (res.data ?? res.items ?? []).map(normalizeSubscription);

      setSubscriptions(list);
      setTotalPages(res.totalPages ?? 1);
    } catch (err) {
      console.error(err);
      setSubscriptions([]);
      setTotalPages(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, query]);

  const visible = useMemo(() => {
    if (!query) return subscriptions;
    const q = query.toLowerCase();
    return subscriptions.filter((s) =>
      (
        s.customerName +
        " " +
        s.planName +
        " " +
        s.status +
        " " +
        (s.startDate || "") +
        " " +
        (s.endDate || "")
      )
        .toLowerCase()
        .includes(q)
    );
  }, [subscriptions, query]);

  const handleDelete = async (s: Subscription) => {
    if (!confirm(`Delete subscription #${s.id}?`)) return;
    await apiDelete(`/api/subscriptions/${s.id}`);
    fetchSubscriptions();
  };

  return (
    <Protected>
      <div className="space-y-4 p-4">
        <TableControls
          title="Subscriptions"
          query={query}
          setQuery={(v) => { setQuery(v); setPage(1); }}
          onAdd={() => {}}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />

        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Start Date</th>
                <th className="px-4 py-3 text-left">End Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">{s.id}</td>
                    <td className="px-4 py-3">{safeString(s.customerName)}</td>
                    <td className="px-4 py-3">{safeString(s.planName)}</td>
                    <td className="px-4 py-3"><StatusBadge status={safeString(s.status)} /></td>
                    <td className="px-4 py-3">{safeString(s.startDate)}</td>
                    <td className="px-4 py-3">{safeString(s.endDate)}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => alert(JSON.stringify(s, null, 2))}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Protected>
  );
}
