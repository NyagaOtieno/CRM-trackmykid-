// app/customers/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type Customer = {
  id: number;
  name: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  address?: string;
  status?: string;
};

const safeString = (v: any) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return JSON.stringify(v);
};

const normalizeCustomer = (c: any): Customer => ({
  id: c.id,
  name: safeString(c.name),
  contactPerson: safeString(c.contactPerson),
  email: safeString(c.email),
  phone: safeString(c.phone),
  address: safeString(c.address),
  status: safeString(c.status) || "active",
});

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/api/customers", {
        q: query || undefined,
        page,
        perPage,
      });

      const list = Array.isArray(res)
        ? res.map(normalizeCustomer)
        : (res.data ?? res.items ?? []).map(normalizeCustomer);

      setCustomers(list);
      setTotalPages(res.totalPages ?? 1);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setCustomers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, query]);

  const handleAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      status: "active",
    });
    setShowForm(true);
  };

  const handleEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      contactPerson: c.contactPerson ?? "",
      email: c.email,
      phone: c.phone ?? "",
      address: c.address ?? "",
      status: c.status ?? "active",
    });
    setShowForm(true);
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    await apiDelete(`/api/customers/${c.id}`);
    fetchCustomers();
  };

  const submit = async (e: any) => {
    e.preventDefault();
    try {
      if (editing) await apiPut(`/api/customers/${editing.id}`, form);
      else await apiPost("/api/customers", form);
      setShowForm(false);
      fetchCustomers();
    } catch {
      alert("Save failed");
    }
  };

  const visible = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter((c) =>
      (c.name + " " + c.contactPerson + " " + c.email + " " + c.phone + " " + c.address)
        .toLowerCase()
        .includes(q)
    );
  }, [customers, query]);

  return (
    <Protected>
      <div className="space-y-6">

        {/* Top Controls */}
        <TableControls
          title="Customers"
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

        {/* Form Section */}
        {showForm && (
          <form
            onSubmit={submit}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-300 dark:border-gray-700"
          >
            <h2 className="text-lg font-semibold mb-4 dark:text-gray-200">
              {editing ? "Edit Customer" : "Add New Customer"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Customer Name"
                className="px-3 py-2 border rounded w-full dark:bg-gray-700 dark:text-white"
              />

              <input
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                placeholder="Contact Person"
                className="px-3 py-2 border rounded w-full dark:bg-gray-700 dark:text-white"
              />

              <input
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="px-3 py-2 border rounded w-full dark:bg-gray-700 dark:text-white"
              />

              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
                className="px-3 py-2 border rounded w-full dark:bg-gray-700 dark:text-white"
              />

              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Address"
                className="px-3 py-2 border rounded w-full dark:bg-gray-700 dark:text-white"
              />

              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 border rounded w-full dark:bg-gray-700 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex gap-3 mt-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 dark:text-white rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Table Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-300 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                {["ID", "Name", "Contact Person", "Email", "Phone", "Address", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500 dark:text-gray-300">
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`${
                      i % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-700"
                    } hover:bg-gray-100 dark:hover:bg-gray-600 transition`}
                  >
                    <td className="px-4 py-3 border-b dark:border-gray-700">{c.id}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{c.name}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{c.contactPerson || "-"}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{c.email}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{c.phone || "-"}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{c.address || "-"}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">
                      <StatusBadge status={c.status || "Unknown"} />
                    </td>
                    <td className="px-4 py-3 border-b dark:border-gray-700 flex gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="px-3 py-1 text-sm bg-yellow-400 hover:bg-yellow-500 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => alert(JSON.stringify(c, null, 2))}
                        className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-700 dark:text-white rounded"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500 dark:text-gray-300">
                    No customers found
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
