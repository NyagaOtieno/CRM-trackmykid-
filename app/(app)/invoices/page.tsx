"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

/* =======================
   TYPES
======================= */
interface Invoice {
  id: number;
  number?: string;
  customer?: string;
  amount?: number;
  status?: string;
}

/* =======================
   COMPONENT
======================= */
export default function InvoicesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    number: "",
    customer: "",
    amount: 0,
    status: "unpaid",
  });

  /* =======================
     FETCH INVOICES
  ======================== */
  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ data?: Invoice[]; totalPages?: number }>(
        `/api/invoices?q=${query || ""}&page=${page}&perPage=${perPage}`
      );
      setInvoices(data.data ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      console.error(err);
      setInvoices([]);
      setTotalPages(1);
      setError(err.message || "Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, query]);

  /* =======================
     FILTER INVOICES
  ======================== */
  const visibleInvoices = useMemo(() => {
    if (!query) return invoices;
    const q = query.toLowerCase();
    return invoices.filter(
      (i) => (i.number + " " + (i.customer ?? "")).toLowerCase().includes(q)
    );
  }, [invoices, query]);

  /* =======================
     CRUD HANDLERS
  ======================== */
  const handleAdd = () => {
    setEditing(null);
    setForm({ number: "", customer: "", amount: 0, status: "unpaid" });
    setShowForm(true);
  };

  const handleEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      number: inv.number ?? "",
      customer: inv.customer ?? "",
      amount: inv.amount ?? 0,
      status: inv.status ?? "unpaid",
    });
    setShowForm(true);
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete invoice #${inv.number}?`)) return;
    try {
      await api.delete(`/api/invoices/${inv.id}`);
      fetchInvoices();
    } catch {
      alert("Delete failed");
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/api/invoices/${editing.id}`, form);
      else await api.post("/api/invoices", form);

      setShowForm(false);
      fetchInvoices();
    } catch {
      alert("Save failed");
    }
  };

  /* =======================
     RENDER
  ======================== */
  return (
    <Protected>
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold dark:text-gray-200">Invoices</h1>
        </div>

        {/* Table Controls */}
        <TableControls
          title="Invoices"
          query={query}
          setQuery={(v) => {
            setQuery(v);
            setPage(1);
          }}
          onAdd={handleAdd}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />

        {/* Form */}
        {showForm && (
          <form
            onSubmit={submitForm}
            className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            {[
              { label: "Invoice#", key: "number", type: "text" },
              { label: "Customer", key: "customer", type: "text" },
              { label: "Amount", key: "amount", type: "number" },
            ].map(({ label, key, type }) => (
              <input
                key={key}
                type={type}
                placeholder={label}
                value={(form as any)[key]}
                onChange={(e) =>
                  setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })
                }
                className="px-3 py-2 border rounded w-full"
                required
              />
            ))}

            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-3 py-2 border rounded w-full"
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>

            <div className="md:col-span-4 flex justify-end gap-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded">
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {["#", "Invoice#", "Customer", "Amount", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left border-b dark:border-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : visibleInvoices.length ? (
                visibleInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b"
                  >
                    <td className="px-4 py-3">{inv.id}</td>
                    <td className="px-4 py-3">{inv.number}</td>
                    <td className="px-4 py-3">{inv.customer}</td>
                    <td className="px-4 py-3">{inv.amount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status ?? "unpaid"} />
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(inv)}
                        className="px-2 py-1 bg-yellow-400 rounded hover:bg-yellow-500"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(inv)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => alert(JSON.stringify(inv, null, 2))}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">
                    {error ? error : "No invoices found"}
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
