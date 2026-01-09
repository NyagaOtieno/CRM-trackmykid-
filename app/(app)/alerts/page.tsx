"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { apiGet, apiDelete } from "@/lib/api";

type AlertItem = {
  id: number;
  message: string;
  level?: string; // this will be used as status
  createdAt?: string;
};

export default function AlertsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [tokenChecked, setTokenChecked] = useState(false);
  const [ready, setReady] = useState(false);

  // ✅ Client-only token check
  useEffect(() => {
    if (typeof window === "undefined") return; // server guard
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
    } else {
      setReady(true);
    }
    setTokenChecked(true);
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/alerts");

      if (Array.isArray(data)) {
        setItems(data);
        setTotalPages(1);
      } else {
        setItems(data.data ?? data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setTotalPages(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (ready) fetchAlerts();
  }, [page, query, ready]);

  const handleDelete = async (alertItem: AlertItem) => {
    if (typeof window === "undefined") return; // SSR guard
    if (!window.confirm(`Delete alert #${alertItem.id}?`)) return;

    await apiDelete(`/api/alerts/${alertItem.id}`);
    fetchAlerts();
  };

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((x) =>
      `${x.message} ${x.level || ""}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  if (!tokenChecked) return <div>Checking authentication...</div>;
  if (!ready) return <div>Redirecting to login...</div>;

  return (
    <Protected>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-3">Alerts</h1>

        <TableControls
          title="Alerts"
          onSearch={(v) => {
            setQuery(v);
            setPage(1);
          }}
          onRefresh={fetchAlerts}
        />

        <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Level</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3">{row.id}</td>
                    <td className="px-4 py-3">{row.message}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.level ?? "Unknown"} />
                    </td>
                    <td className="px-4 py-3">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() =>
                          typeof window !== "undefined" &&
                          window.alert(JSON.stringify(row, null, 2))
                        }
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleDelete(row)}
                        className="px-3 py-1 bg-red-600 text-white rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                  >
                    No alerts found
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
