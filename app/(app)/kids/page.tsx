"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

/* ================= TYPES ================= */
interface Kid {
  id: number;
  name: string;
  parentId: number;
  age?: number;
}

/* ================= PAGE ================= */
export default function KidsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Kid | null>(null);
  const [form, setForm] = useState({ name: "", parentId: 0, age: 0 });
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH ================= */
  const fetchKids = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<Kid[]>(
        `/api/kids?q=${query || ""}&page=${page}&perPage=${perPage}`
      );
      const array = Array.isArray(list) ? list : [];
      setKids(array);
      setTotalPages(Math.max(Math.ceil(array.length / perPage), 1));
    } catch (err: any) {
      console.error(err);
      setKids([]);
      setTotalPages(1);
      setError(err.message || "Failed to fetch kids");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKids();
  }, [page, query]);

  /* ================= FORM HANDLERS ================= */
  const handleAdd = () => {
    setEditing(null);
    setForm({ name: "", parentId: 0, age: 0 });
    setShowForm(true);
  };

  const handleEdit = (k: Kid) => {
    setEditing(k);
    setForm({ name: k.name, parentId: k.parentId, age: k.age ?? 0 });
    setShowForm(true);
  };

  const handleDelete = async (k: Kid) => {
    if (!confirm(`Delete ${k.name}?`)) return;
    try {
      await api.delete(`/api/kids/${k.id}`);
      fetchKids();
    } catch {
      alert("Delete failed");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/api/kids/${editing.id}`, form);
      else await api.post("/api/kids", form);
      setShowForm(false);
      fetchKids();
    } catch {
      alert("Save failed");
    }
  };

  /* ================= FILTER ================= */
  const visible = useMemo(() => {
    if (!query) return kids;
    const q = query.toLowerCase();
    return kids.filter((k) =>
      (k.name + " " + k.parentId).toLowerCase().includes(q)
    );
  }, [kids, query]);

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    { label: "ID", accessor: (k: Kid) => k.id },
    { label: "Name", accessor: (k: Kid) => k.name },
    { label: "Parent ID", accessor: (k: Kid) => k.parentId },
    { label: "Age", accessor: (k: Kid) => k.age ?? "-" },
    {
      label: "Actions",
      accessor: (k: Kid) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(k)}
            className="px-2 py-1 bg-yellow-400 rounded hover:bg-yellow-500"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(k)}
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold dark:text-gray-200">Kids</h1>
        </div>

        <TableControls
          title="Kids"
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
            className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Name"
              className="px-3 py-2 border rounded w-full"
            />
            <input
              required
              type="number"
              value={form.parentId}
              onChange={(e) =>
                setForm((f) => ({ ...f, parentId: Number(e.target.value) }))
              }
              placeholder="Parent ID"
              className="px-3 py-2 border rounded w-full"
            />
            <input
              type="number"
              value={form.age}
              onChange={(e) =>
                setForm((f) => ({ ...f, age: Number(e.target.value) }))
              }
              placeholder="Age"
              className="px-3 py-2 border rounded w-full"
            />
            <div className="md:col-span-3 flex gap-2 justify-end">
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* TABLE */}
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
                  <td
                    colSpan={columns.length}
                    className="p-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((k) => (
                  <tr
                    key={k.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.label}
                        className="px-4 py-3 border-b dark:border-gray-700"
                      >
                        {col.accessor(k)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    {error ?? "No kids found."}
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
