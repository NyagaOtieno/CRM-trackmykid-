"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "../../../src/components/TableControls";
import Protected from "../../../src/components/Protected";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

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

type Customer = {
  id: number;
  name: string;
  email?: string;
};

const safeString = (value: any) =>
  value === null || value === undefined ? "-" : String(value);

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function VehiclesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  // ✅ NEW: search inside customer dropdown
  const [customerSearch, setCustomerSearch] = useState("");

  const [form, setForm] = useState({
    registrationNo: "",
    model: "",
    make: "",
    year: 2020,
    color: "",
    vin: "",
    customerId: 0,
  });

  /* ================= FETCH VEHICLES ================= */
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res: any = await apiGet("/api/vehicles", {
        q: query || undefined,
        page,
        perPage,
      });

      // Supports either array or wrapped responses
      const list = Array.isArray(res) ? res : res?.data ?? res?.items ?? [];
      setVehicles(list as Vehicle[]);
      setTotalPages(res?.totalPages ?? 1);
    } catch (err) {
      console.error("Error loading vehicles:", err);
      setVehicles([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH CUSTOMERS ================= */
  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      // Your endpoint returns a plain array: [ {id, name, ...}, ... ]
      const res: any = await apiGet("/api/customers", { page: 1, perPage: 500 });

      const list = Array.isArray(res) ? res : res?.data ?? res?.items ?? [];
      const normalized: Customer[] = (list || []).map((c: any) => ({
        id: toNumber(c.id ?? c._id),
        name: String(c.name ?? "Unnamed Customer"),
        email: c.email ? String(c.email) : undefined,
      }));

      normalized.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(normalized);
    } catch (err) {
      console.error("Error loading customers:", err);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Map for quick customer lookups
  const customerById = useMemo(() => {
    const map = new Map<number, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // ✅ NEW: Filtered customers for dropdown search
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers;

    return customers.filter((c) => {
      const hay = `${c.name ?? ""} ${c.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [customers, customerSearch]);

  // Auto-pick a customer when opening add form (prevents customerId=0)
  useEffect(() => {
    if (!showForm) return;
    if (editing) return;
    if (!customers.length) return;

    setForm((f) => ({
      ...f,
      customerId: f.customerId && f.customerId !== 0 ? f.customerId : customers[0].id,
    }));
  }, [showForm, editing, customers]);

  /* ================= FORM HANDLERS ================= */
  const handleAdd = async () => {
    setEditing(null);
    await fetchCustomers(); // refresh list before opening form
    setCustomerSearch(""); // ✅ reset dropdown search
    setForm({
      registrationNo: "",
      model: "",
      make: "",
      year: 2020,
      color: "",
      vin: "",
      customerId: 0,
    });
    setShowForm(true);
  };

  const handleEdit = async (v: Vehicle) => {
    setEditing(v);
    await fetchCustomers();
    setCustomerSearch(""); // ✅ reset dropdown search
    setForm({ ...v });
    setShowForm(true);
  };

  const handleDelete = async (v: Vehicle) => {
    if (!confirm(`Delete ${v.registrationNo}?`)) return;
    try {
      await apiDelete(`/api/vehicles/${v.id}`);
      fetchVehicles();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Exact payload your backend expects
    const payload = {
      registrationNo: form.registrationNo,
      model: form.model,
      make: form.make,
      year: Number(form.year),
      color: form.color,
      vin: form.vin,
      customerId: Number(form.customerId),
    };

    if (!payload.customerId) {
      alert("Please select a customer.");
      return;
    }

    try {
      if (editing) await apiPut(`/api/vehicles/${editing.id}`, payload);
      else await apiPost("/api/vehicles", payload);

      setShowForm(false);
      fetchVehicles();
    } catch (err: any) {
      console.error("Save failed:", err);
      alert(err?.message || "Save failed");
    }
  };

  /* ================= SEARCH BY ANY DETAIL =================
     Includes customer name/email + all vehicle fields
  */
  const visible = useMemo(() => {
    if (!query) return vehicles;

    const q = query.toLowerCase().trim();

    return vehicles.filter((v) => {
      const cust = customerById.get(v.customerId);

      const haystack = [
        v.id,
        v.registrationNo,
        v.model,
        v.make,
        v.year,
        v.color,
        v.vin,
        v.customerId,
        cust?.name,
        cust?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [vehicles, query, customerById]);

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    { label: "ID", accessor: (v: Vehicle) => v.id },
    { label: "Registration", accessor: (v: Vehicle) => safeString(v.registrationNo) },
    { label: "Model", accessor: (v: Vehicle) => safeString(v.model) },
    { label: "Make", accessor: (v: Vehicle) => safeString(v.make) },
    { label: "Year", accessor: (v: Vehicle) => safeString(v.year) },
    { label: "Color", accessor: (v: Vehicle) => safeString(v.color) },
    { label: "VIN", accessor: (v: Vehicle) => safeString(v.vin) },
    {
      label: "Customer",
      accessor: (v: Vehicle) => {
        const c = customerById.get(v.customerId);
        return c ? `${c.name}${c.email ? ` (${c.email})` : ""}` : `ID: ${v.customerId}`;
      },
    },
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
      {/* ✅ Light-only UI (dark background removed) */}
      <div className="space-y-4 p-4 bg-white text-gray-900 min-h-screen">
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
            className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 border"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Registration No</label>
              <input
                required
                type="text"
                value={form.registrationNo}
                onChange={(e) => setForm((f) => ({ ...f, registrationNo: e.target.value }))}
                placeholder="KAA123A"
                className="px-3 py-2 border rounded"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Model</label>
              <input
                required
                type="text"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="Corolla"
                className="px-3 py-2 border rounded"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Make</label>
              <input
                required
                type="text"
                value={form.make}
                onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                placeholder="Toyota"
                className="px-3 py-2 border rounded"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Year</label>
              <input
                required
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                placeholder="2020"
                className="px-3 py-2 border rounded"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Color</label>
              <input
                required
                type="text"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="White"
                className="px-3 py-2 border rounded"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">VIN</label>
              <input
                required
                type="text"
                value={form.vin}
                onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))}
                placeholder="1HGCM82633A004352"
                className="px-3 py-2 border rounded"
              />
            </div>

            {/* ✅ SEARCHABLE CUSTOMER DROPDOWN */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Customer</label>

              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customer by name or email..."
                className="px-3 py-2 border rounded"
              />

              <select
                required
                value={form.customerId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customerId: Number(e.target.value) }))
                }
                className="px-3 py-2 border rounded"
              >
                <option value={0} disabled>
                  {customersLoading
                    ? "Loading customers..."
                    : customers.length
                    ? "Select customer"
                    : "No customers found"}
                </option>

                {filteredCustomers.length ? (
                  filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.email ? ` (${c.email})` : ""}
                    </option>
                  ))
                ) : (
                  <option value={-1} disabled>
                    No matches for “{customerSearch}”
                  </option>
                )}
              </select>
            </div>

            <div className="md:col-span-3 flex gap-2 pt-2">
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
                visible.map((v) => (
                  <tr key={v.id} className="border-t hover:bg-gray-50 transition">
                    {columns.map((col) => (
                      <td key={col.label} className="px-4 py-3 border-b">
                        {col.accessor(v)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500">
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
