"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import Protected from "@/components/Protected";

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
  status?: string;
};

const safeString = (value?: string) => value ?? "-";

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user", status: "active" });

  /* ================= FETCH USERS ================= */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/users", { params: { q: query || undefined, page, perPage } });
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUsers(data);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, query]);

  /* ================= FORM HANDLERS ================= */
  const handleAdd = () => {
    setEditing(null);
    setForm({ name: "", email: "", role: "user", status: "active" });
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role ?? "user",
      status: user.status ?? "active",
    });
    setShowForm(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user ${user.email}?`)) return;
    try {
      await api.delete(`/api/users/${user.id}`);
      fetchUsers();
    } catch {
      alert("Delete failed");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/api/users/${editing.id}`, form);
      else await api.post("/api/users", form);
      setShowForm(false);
      fetchUsers();
    } catch {
      alert("Save failed");
    }
  };

  /* ================= FILTER USERS ================= */
  const visible = useMemo(() => {
    if (!query) return users;
    const q = query.toLowerCase();
    return users.filter((u) => (u.name + " " + u.email).toLowerCase().includes(q));
  }, [users, query]);

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    { label: "ID", accessor: (u: User) => u.id },
    { label: "Name", accessor: (u: User) => safeString(u.name) },
    { label: "Email", accessor: (u: User) => safeString(u.email) },
    { label: "Role", accessor: (u: User) => safeString(u.role) },
    { label: "Status", accessor: (u: User) => <StatusBadge status={safeString(u.status)} /> },
    {
      label: "Actions",
      accessor: (u: User) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(u)} className="px-2 py-1 bg-yellow-400 rounded hover:bg-yellow-500">Edit</button>
          <button onClick={() => handleDelete(u)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-700">Delete</button>
          <button onClick={() => alert(JSON.stringify(u, null, 2))} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">View</button>
        </div>
      ),
    },
  ];

  return (
    <Protected>
      <div className="space-y-4 p-4">
        <TableControls
          title="Users"
          query={query}
          setQuery={(v) => { setQuery(v); setPage(1); }}
          onAdd={handleAdd}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />

        {showForm && (
          <form onSubmit={submit} className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              required
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              className="px-3 py-2 border rounded"
            />
            <input
              required
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email"
              className="px-3 py-2 border rounded"
            />
            <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} className="px-3 py-2 border rounded">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 border rounded">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="md:col-span-3 flex gap-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        )}

        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map(col => (
                  <th key={col.label} className="px-4 py-3 text-left border-b dark:border-gray-600">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
              ) : visible.length ? (
                visible.map(u => (
                  <tr key={u.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    {columns.map(col => <td key={col.label} className="px-4 py-3 border-b dark:border-gray-700">{col.accessor(u)}</td>)}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={columns.length} className="p-6 text-center text-gray-500 dark:text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Protected>
  );
}
