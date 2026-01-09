"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { apiGet, apiDelete } from "@/lib/api";

/* ================= TYPES ================= */
interface Subscription {
  id: number;
  customerName: string;
  planName: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* ================= HELPERS ================= */
const safeString = (value: any) => (value == null ? "-" : String(value));

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

/* ================= PAGE ================= */
export default function SubscriptionsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH ================= */
  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/api/subscriptions", {
        q: query || undefined,
        page,
        perPage,
      });

      const list: Subscription[] = Array.isArray(res)
        ? res.map(normalizeSubscription)
        : (res.data ?? res.items ?? []).map(normalizeSubscription);

      setSubscriptions(list);
      setTotalPages(res.totalPages ?? 1);
    } catch (err: any) {
      console.error(err);
      setSubscriptions([]);
      setTotalPages(1);
      setError(err.message || "Failed to fetch subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, query]);

  /* ================= FILTER ================= */
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

  /* ================= ACTIONS ================= */
  const handleDelete = async (s: Subscription) => {
    if (!confirm(`Delete subscription #${s.id}?`)) return;
    try {
      await apiDelete(`/api/subscriptions/${s.id}`);
      fetchSubscriptions();
    } catch {
      alert("Delete failed");
    }
  };

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    { label: "ID", accessor: (s: Subscription) => s.id },
    { label: "Customer", accessor: (s: Subscription) => safeString(s.customerName) },
    { label: "Plan", accessor: (s: Subscription) => safeString(s.planName) },
    { label: "Status", accessor: (s: Subscription) => <StatusBadge status={safeString(s.status)} /> },
    { label: "Start Date", accessor: (s: Subscription) => safeString(s.startDate) },
    { label: "End Date", accessor: (s: Subscription) => safeString(s.endDate) },
    {
      label: "Actions",
      accessor: (s: Subscription) => (
        <div className="flex gap-2">
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
        </div>
      ),
    },
  ];

  /* ================= UI ================= */
  return (
    <Protected>
      <div className="space-y-4 p-4">
        <TableControls
          title="Subscriptions"
          query={query}
          setQuery={(v) => {
            setQuery(v);
            setPage(1);
          }}
          onAdd={() => {}}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />

        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.label}
                    className="px-4 py-3 text-left border-b dark:border-gray-600"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    {columns.map((col) => (
                      <td key={col.label} className="px-4 py-3 border-b dark:border-gray-700">
                        {col.accessor(s)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500 dark:text-gray-400">
                    {error ?? "No subscriptions found."}
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
