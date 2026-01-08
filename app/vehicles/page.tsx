"use client";
import { useEffect, useMemo, useState } from "react";
import TableControls from "../../src/components/TableControls";
import { api } from "../../src/lib/api";
import Protected from "../../src/components/Protected";

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

// Backend response format
type VehicleResponse = Vehicle[] | { data: Vehicle[]; totalPages: number };

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

  const fetchVehicles = async () => {
    setLoading(true);

    try {
      const res = await api.get("/api/vehicles", {
        params: { q: query || undefined, page, perPage },
      });

      const data: VehicleResponse = res.data;

      if (Array.isArray(data)) {
        setVehicles(data);
        setTotalPages(1);
      } else {
        setVehicles(data.data ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      setVehicles([]);
      setTotalPages(1);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, [page, query]);

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
    setForm({
      registrationNo: v.registrationNo,
      model: v.model,
      make: v.make,
      year: v.year,
      color: v.color,
      vin: v.vin,
      customerId: v.customerId,
    });
    setShowForm(true);
  };

  const handleDelete = async (v: Vehicle) => {
    if (!confirm(`Delete ${v.registrationNo}?`)) return;

    await api.delete(`/api/vehicles/${v.id}`);
    fetchVehicles();
  };

  const submit = async (e: any) => {
    e.preventDefault();

    try {
      if (editing) {
        await api.put(`/api/vehicles/${editing.id}`, form);
      } else {
        await api.post("/api/vehicles", form);
      }

      setShowForm(false);
      fetchVehicles();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const visible = useMemo(() => {
    if (!query) return vehicles;

    const q = query.toLowerCase();

    return vehicles.filter((v) =>
      (
        v.registrationNo +
        " " +
        v.model +
        " " +
        v.make +
        " " +
        v.color +
        " " +
        v.vin
      )
        .toLowerCase()
        .includes(q)
    );
  }, [vehicles, query]);

  return (
    <Protected>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Vehicles</h1>
        </div>

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

        {/* Form */}
        {showForm && (
          <form
            onSubmit={submit}
            className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <input
              required
              value={form.registrationNo}
              onChange={(e) =>
                setForm((f) => ({ ...f, registrationNo: e.target.value }))
              }
              placeholder="Registration Number"
              className="px-3 py-2 border rounded"
            />

            <input
              required
              value={form.model}
              onChange={(e) =>
                setForm((f) => ({ ...f, model: e.target.value }))
              }
              placeholder="Model"
              className="px-3 py-2 border rounded"
            />

            <input
              required
              value={form.make}
              onChange={(e) =>
                setForm((f) => ({ ...f, make: e.target.value }))
              }
              placeholder="Make"
              className="px-3 py-2 border rounded"
            />

            <input
              required
              type="number"
              value={form.year}
              onChange={(e) =>
                setForm((f) => ({ ...f, year: Number(e.target.value) }))
              }
              placeholder="Year"
              className="px-3 py-2 border rounded"
            />

            <input
              required
              value={form.color}
              onChange={(e) =>
                setForm((f) => ({ ...f, color: e.target.value }))
              }
              placeholder="Color"
              className="px-3 py-2 border rounded"
            />

            <input
              required
              value={form.vin}
              onChange={(e) =>
                setForm((f) => ({ ...f, vin: e.target.value }))
              }
              placeholder="VIN"
              className="px-3 py-2 border rounded"
            />

            <input
              required
              type="number"
              value={form.customerId}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerId: Number(e.target.value) }))
              }
              placeholder="Customer ID"
              className="px-3 py-2 border rounded"
            />

            <div className="md:col-span-3 flex gap-2">
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

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Registration</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-left">Make</th>
                <th className="px-4 py-3 text-left">Year</th>
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-left">VIN</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3">{v.id}</td>
                    <td className="px-4 py-3">{v.registrationNo}</td>
                    <td className="px-4 py-3">{v.model}</td>
                    <td className="px-4 py-3">{v.make}</td>
                    <td className="px-4 py-3">{v.year}</td>
                    <td className="px-4 py-3">{v.color}</td>
                    <td className="px-4 py-3">{v.vin}</td>
                    <td className="px-4 py-3">{v.customerId}</td>

                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(v)}
                        className="px-2 py-1 bg-yellow-400 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v)}
                        className="px-2 py-1 bg-red-500 text-white rounded"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() =>
                          alert(JSON.stringify(v, null, 2))
                        }
                        className="px-2 py-1 bg-gray-200 rounded"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="p-6 text-center text-gray-500"
                  >
                    No vehicles
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
