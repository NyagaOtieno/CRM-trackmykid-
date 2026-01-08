// app/users/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api"; // fixed import
import Protected from "@/components/Protected";

type User = { id: number; name: string; email: string; role?: string; status?: string };

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user", status: "active" });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/users", { params: { q: query || undefined, page, perPage } });
      const responseData = res.data;

      if (Array.isArray(responseData)) {
        setItems(responseData);
        setTotalPages(1);
      } else {
        setItems(responseData.data ?? []);
        setTotalPages(responseData.totalPages ?? 1);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setTotalPages(1);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [page, query]);

  const handleAdd = () => {
    setEditing(null);
    setForm({ name: "", email: "", role: "user", status: "active" });
    setShowForm(true);
  };

  const handleEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, role: u.role ?? "user", status: u.status ?? "active" });
    setShowForm(true);
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Delete user ${u.email}?`)) return;
    await api.delete(`/api/users/${u.id}`);
    fetchUsers();
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

  const visible = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(x => (x.name + " " + x.email).toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Protected>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>
        </div>

        <TableControls
          query={query}
          setQuery={v => { setQuery(v); setPage(1); }}
          onAdd={handleAdd}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          title="Users"
        />

        {showForm && (
          <form onSubmit={submit} className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              className="px-3 py-2 border rounded"
            />
            <input
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email"
              className="px-3 py-2 border rounded"
            />
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="px-3 py-2 border rounded"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 border rounded"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="md:col-span-3 flex gap-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            </div>
          </form>
        )}

        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center">Loading...</td></tr>
              ) : visible.length ? (
                visible.map(u => (
                  <tr key={u.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">{u.id}</td>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.role ?? "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status ?? "active"} /></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleEdit(u)} className="px-2 py-1 bg-yellow-400 rounded">Edit</button>
                      <button onClick={() => handleDelete(u)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                      <button onClick={() => alert(JSON.stringify(u, null, 2))} className="px-2 py-1 bg-gray-200 rounded">View</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No users</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Protected>
  );
}
