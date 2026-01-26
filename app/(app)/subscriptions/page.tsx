"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { apiGet, apiDelete } from "@/lib/api";
import AddSubscriptionModal from "./subscription-add-modal";

/* ================= TYPES ================= */
interface SubscriptionRow {
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
const safeString = (value: any) => (value == null || value === "" ? "-" : String(value));

const normalizeSubscription = (s: any): SubscriptionRow => ({
  id: s.id,
  customerName: s.customerName ?? s.customer?.name ?? "-",
  planName: s.planName ?? s.plan?.name ?? "-",
  status: typeof s.status === "string" ? s.status : "UNKNOWN",
  startDate: s.startDate ?? "-",
  endDate: s.endDate ?? "-",
  createdAt: s.createdAt ?? "-",
  updatedAt: s.updatedAt ?? "-",
});

export default function SubscriptionsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openAdd, setOpenAdd] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/api/subscriptions", {
        q: query || undefined,
        page,
        perPage,
      });

      const list: SubscriptionRow[] = Array.isArray(res)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, query]);

  // NOTE: backend already filters with q; this is just a safe fallback
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

  const handleDelete = async (s: SubscriptionRow) => {
    if (!confirm(`Delete subscription #${s.id}?`)) return;
    try {
      await apiDelete(`/api/subscriptions/${s.id}`);
      fetchSubscriptions();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  const columns = [
    { label: "ID", accessor: (s: SubscriptionRow) => s.id },
    { label: "Customer", accessor: (s: SubscriptionRow) => safeString(s.customerName) },
    { label: "Plan", accessor: (s: SubscriptionRow) => safeString(s.planName) },
    { label: "Status", accessor: (s: SubscriptionRow) => <StatusBadge status={safeString(s.status)} /> },
    { label: "Start Date", accessor: (s: SubscriptionRow) => safeString(s.startDate) },
    { label: "End Date", accessor: (s: SubscriptionRow) => safeString(s.endDate) },
    {
      label: "Actions",
      accessor: (s: SubscriptionRow) => (
        <div className="flex gap-2">
          <button
            onClick={() => alert(JSON.stringify(s, null, 2))}
            className="px-3 py-1 rounded border bg-white hover:bg-gray-50"
          >
            View
          </button>
          <button
            onClick={() => handleDelete(s)}
            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <Protected>
      <div className="space-y-4 p-4 bg-white min-h-screen">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TableControls
            title="Subscriptions"
            query={query}
            setQuery={(v) => {
              setQuery(v);
              setPage(1);
            }}
            onAdd={() => setOpenAdd(true)}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
          />

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Per page</label>
            <select
              className="border rounded px-2 py-2 bg-white"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button
              onClick={fetchSubscriptions}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded shadow overflow-auto border">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th key={col.label} className="px-4 py-3 text-left border-b">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                    {columns.map((col) => (
                      <td key={col.label} className="px-4 py-3 border-b">
                        {col.accessor(s)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500">
                    {error ?? "No subscriptions found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {openAdd && (
          <AddSubscriptionModal
            onClose={() => setOpenAdd(false)}
            onCreated={() => {
              setOpenAdd(false);
              fetchSubscriptions();
            }}
          />
        )}
      </div>
    </Protected>
  );
}
