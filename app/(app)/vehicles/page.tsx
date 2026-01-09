"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "../../../src/components/TableControls";
import { api } from "../../../src/lib/api";
import Protected from "../../../src/components/Protected";

type Vehicle = {
  id: number;
  registrationNo: string;
  model: string;
  make: string;
  year: number;
  color: string;
  vin: string;
  customerId: number;
};

const safeString = (value: any) => value ?? "-";

export default function VehiclesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({
    registrationNo: "",
    model: "",
    make: "",
    year: 0,
    color: "",
    vin: "",
    customerId: 0,
  });

  /* ================= FETCH VEHICLES ================= */
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/vehicles", {
        params: { q: query || undefined, page, perPage },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setVehicles(data);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch (err) {
      console.error("Error loading vehicles:", err);
      setVehicles([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [page, query]);

  /* ================= FORM HANDLERS ================= */
  const handleAdd = () => {
    setEditing(null);
    setForm({
      registrationNo: "",
      model: "",
      make: "",
      year: 0,
      color: "",
      vin: "",
      customerId: 0,
    });
    setShowForm(true);
  };

  const handleEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({ ...v });
    setShowForm(true);
  };

  const handleDelete = async (v: Vehicle) => {
    if (!confirm(`Delete ${v.registrationNo}?`)) return;
    try {
      await api.delete(`/api/vehicles/${v.id}`);
      fetchVehicles();
    } catch {
      alert("Delete failed");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/api/vehicles/${editing.id}`, form);
      else await api.post("/api/vehicles", form);
      setShowForm(false);
      fetchVehicles();
    } catch {
      alert("Save failed");
    }
  };

  /* ================= FILTER VEHICLES ================= */
  const visible = useMemo(() => {
    if (!query) return vehicles;
    const q = query.toLowerCase();
    return vehicles.filter(
      (v) =>
        `${v.registrationNo} ${v.model} ${v.make} ${v.color} ${v.vin}`
          .toLowerCase()
          .includes(q)
    );
  }, [vehicles, query]);

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    { label: "ID", accessor: (v: Vehicle) => v.id },
    { label: "Registration", accessor: (v: Vehicle) => safeString(v.registrationNo) },
    { label: "Model", accessor: (v: Vehicle) => safeString(v.model) },
    { label: "Make", accessor: (v: Vehicle) => safeString(v.make) },
    { label: "Year", accessor: (v: Vehicle) => safeString(v.year) },
    { label: "Color", accessor: (v: Vehicle) => safeString(v.color) },
    { label: "VIN", accessor: (v: Vehicle) => safeString(v.vin) },
    { label: "Customer", accessor: (v: Vehicle) => safeString(v.customerId) },
    {
      label: "Actions",
      accessor: (v: Vehicle) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(v)}
            className="px-2 py-1 bg-yellow-400 rounded hover:bg-yellow-500"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(v)}
            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={() => alert(JSON.stringify(v, null, 2))}
            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <Protected>
      <div className="space-y-4 p-4">
        <TableControls
          title="Vehicles"
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

        {/* ================= FORM ================= */}
        {showForm && (
          <form
            onSubmit={submit}
            className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {Object.keys(form).map((key) => (
              <input
                key={key}
                required
                type={key === "year" || key === "customerId" ? "number" : "text"}
                value={(form as any)[key]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [key]: key === "year" || key === "customerId" ? Number(e.target.value) : e.target.value,
                  }))
                }
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                className="px-3 py-2 border rounded"
              />
            ))}

            <div className="md:col-span-3 flex gap-2">
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

        {/* ================= TABLE ================= */}
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
                visible.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    {columns.map((col) => (
                      <td key={col.label} className="px-4 py-3 border-b dark:border-gray-700">
                        {col.accessor(v)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No vehicles found.
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
