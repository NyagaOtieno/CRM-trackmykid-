"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

type Inv = {
  id: number;
  number?: string;
  customer?: string;
  amount?: number;
  status?: string;
};

export default function InvoicesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Inv | null>(null);
  const [form, setForm] = useState({
    number: "",
    customer: "",
    amount: 0,
    status: "unpaid",
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ data?: Inv[]; totalPages?: number }>(
        `/api/invoices?q=${query || ""}&page=${page}&perPage=${perPage}`
      );

      const invoices = data.data ?? (data as Inv[]);
      setItems(invoices);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      console.error(err);
      setItems([]);
      setTotalPages(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, query]);

  const handleAdd = () => {
    setEditing(null);
    setForm({ number: "", customer: "", amount: 0, status: "unpaid" });
    setShowForm(true);
  };

  const handleEdit = (inv: Inv) => {
    setEditing(inv);
    setForm({
      number: inv.number ?? "",
      customer: inv.customer ?? "",
      amount: inv.amount ?? 0,
      status: inv.status ?? "unpaid",
    });
    setShowForm(true);
  };

  const handleDelete = async (inv: Inv) => {
    if (!confirm(`Delete invoice #${inv.number}?`)) return;
    await api.delete(`/api/invoices/${inv.id}`);
    fetchInvoices();
  };

  const submit = async (e: any) => {
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

  const visible = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) => (i.number + " " + (i.customer ?? "")).toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <Protected>
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Invoices</h1>
        </div>

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

        {/* FORM */}
        {showForm && (
          <form
            onSubmit={submit}
            className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <input
              value={form.number}
              onChange={(e) =>
                setForm((f) => ({ ...f, number: e.target.value }))
              }
              placeholder="Invoice#"
              className="px-3 py-2 border rounded w-full"
            />
            <input
              value={form.customer}
              onChange={(e) =>
                setForm((f) => ({ ...f, customer: e.target.value }))
              }
              placeholder="Customer"
              className="px-3 py-2 border rounded w-full"
            />
            <input
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: Number(e.target.value) }))
              }
              placeholder="Amount"
              type="number"
              className="px-3 py-2 border rounded w-full"
            />
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
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
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* TABLE */}
        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {["#", "Invoice#", "Customer", "Amount", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left border-b dark:border-gray-600"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((i) => (
                  <tr
                    key={i.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b"
                  >
                    <td className="px-4 py-3">{i.id}</td>
                    <td className="px-4 py-3">{i.number}</td>
                    <td className="px-4 py-3">{i.customer}</td>
                    <td className="px-4 py-3">{i.amount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={i.status ?? "unpaid"} />
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(i)}
                        className="px-2 py-1 bg-yellow-400 rounded hover:bg-yellow-500"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => alert(JSON.stringify(i, null, 2))}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    No invoices
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
