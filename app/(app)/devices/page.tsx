"use client";

import { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
import { getToken } from "@/lib/auth";

/* =======================
   TYPES
======================= */

interface Vehicle {
  id: number;
  registrationNo: string;
  model: string;
  make: string;
  year: number;
  color: string;
  vin?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Job {
  id: number;
  jobType: string;
  scheduledAt: string;
}

interface Subscription {
  id: number;
  planName: string;
  amount: number;
  paymentStatus: string;
}

interface Device {
  id: number;
  imei: string;
  simNumber: string;
  installationDate: string;
  firmwareVersion: string;
  serialNumber: string | null;
  type: string | null;
  assignedTo: string | null;
  vehicleId: number;
  installedById: number;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
  installedBy?: User;
  jobs?: Job[];
  subscriptions?: Subscription[];
}

/* =======================
   UTILS
======================= */

const safeAlert = (msg: string) => typeof window !== "undefined" && alert(msg);
const safeConfirm = (msg: string) =>
  typeof window !== "undefined" ? confirm(msg) : false;

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

const toNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const asString = (v: any, fallback = "") =>
  v === null || v === undefined ? fallback : String(v);

/* =======================
   CONFIG
======================= */

// ✅ Backend still expects installedById, but you don't want it in the UI.
// Set a safe default ID that exists in DB.
// If your DB user/technician default is a different id, change this value.
const DEFAULT_INSTALLED_BY_ID = 1;

/* =======================
   COMPONENT
======================= */

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);

  // ✅ Search field to filter dropdown options (same pattern as your Vehicles page)
  const [vehicleSearch, setVehicleSearch] = useState("");

  // ✅ Only fields you want to edit in UI (installedById is NOT here)
  const [form, setForm] = useState({
    imei: "",
    simNumber: "",
    installationDate: "", // date input: YYYY-MM-DD
    firmwareVersion: "",
    vehicleId: "", // select value (string)
  });

  /* =======================
     AUTH
  ======================= */

  useEffect(() => {
    setToken(getToken());
  }, []);

  /* =======================
     API HELPERS
  ======================= */

  const apiRequest = async (url: string, method = "GET", body?: any) => {
    if (!token) throw new Error("No token");

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      // capture backend error text if any
      let details = "";
      try {
        const t = await res.text();
        details = t ? ` - ${t}` : "";
      } catch {}
      throw new Error(`Request failed: ${res.status}${details}`);
    }

    return res.json();
  };

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Device[] = await apiRequest(
        "https://trackmykid-crm-production.up.railway.app/api/devices"
      );
      setDevices(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Vehicles endpoint: { data: [...], meta: {...} }
  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const res: any = await apiRequest(
        "https://trackmykid-crm-production.up.railway.app/api/vehicles"
      );

      const list = Array.isArray(res) ? res : res?.data ?? res?.items ?? [];
      const normalized: Vehicle[] = (list || [])
        .map((v: any) => ({
          id: toNumber(v.id ?? v._id),
          registrationNo: asString(v.registrationNo),
          model: asString(v.model),
          make: asString(v.make),
          year: toNumber(v.year, 0),
          color: asString(v.color),
          vin: v.vin ? asString(v.vin) : undefined,
        }))
        .filter((v: Vehicle) => !!v.id);

      normalized.sort((a, b) =>
        (a.registrationNo || "").localeCompare(b.registrationNo || "")
      );
      setVehicles(normalized);
    } catch (err: any) {
      console.error("Failed to fetch vehicles:", err);
      setVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  };

  /* =======================
     EFFECTS
  ======================= */

  useEffect(() => {
    if (token) {
      fetchDevices();
      fetchVehicles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicles;

    return vehicles.filter((v) => {
      const hay = `${v.registrationNo} ${v.make} ${v.model} ${v.id} ${v.year} ${v.color} ${
        v.vin ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [vehicles, vehicleSearch]);

  const vehicleById = useMemo(() => {
    const map = new Map<number, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Auto-pick first vehicle when adding new (prevents empty vehicleId)
  useEffect(() => {
    if (!showForm) return;
    if (editing) return;
    if (!vehicles.length) return;

    setForm((f) => ({
      ...f,
      vehicleId: f.vehicleId ? f.vehicleId : String(vehicles[0].id),
    }));
  }, [showForm, editing, vehicles]);

  /* =======================
     CRUD HANDLERS
  ======================= */

  const openAddForm = async () => {
    setEditing(null);
    setVehicleSearch("");
    await fetchVehicles();

    setForm({
      imei: "",
      simNumber: "",
      installationDate: "",
      firmwareVersion: "",
      vehicleId: "",
    });

    setShowForm(true);
  };

  const handleEdit = async (device: Device) => {
    setEditing(device);
    setVehicleSearch("");
    await fetchVehicles();

    setForm({
      imei: device.imei,
      simNumber: device.simNumber,
      installationDate: device.installationDate?.includes("T")
        ? device.installationDate.split("T")[0]
        : device.installationDate || "",
      firmwareVersion: device.firmwareVersion,
      vehicleId: String(device.vehicleId ?? ""),
    });

    setShowForm(true);
  };

  const handleDelete = async (device: Device) => {
    if (!safeConfirm(`Delete device ${device.imei}?`)) return;
    try {
      await apiRequest(
        `https://trackmykid-crm-production.up.railway.app/api/devices/${device.id}`,
        "DELETE"
      );
      fetchDevices();
    } catch (err: any) {
      safeAlert(err.message || "Delete failed");
    }
  };

  // ✅ Payload matches your sample body EXACTLY (installedById included, but not in UI)
  const submitForm = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        imei: form.imei.trim(),
        simNumber: form.simNumber.trim(),
        installationDate: form.installationDate
          ? new Date(`${form.installationDate}T00:00:00.000Z`).toISOString()
          : "",
        firmwareVersion: form.firmwareVersion.trim(),
        vehicleId: Number(form.vehicleId),
        installedById: DEFAULT_INSTALLED_BY_ID,
      };

      if (!payload.imei) return safeAlert("IMEI is required.");
      if (!payload.simNumber) return safeAlert("SIM Number is required.");
      if (!payload.installationDate) return safeAlert("Installation date is required.");
      if (!payload.firmwareVersion) return safeAlert("Firmware version is required.");
      if (!payload.vehicleId) return safeAlert("Please select a vehicle.");

      const url = editing
        ? `https://trackmykid-crm-production.up.railway.app/api/devices/${editing.id}`
        : "https://trackmykid-crm-production.up.railway.app/api/devices";

      await apiRequest(url, editing ? "PUT" : "POST", payload);

      setShowForm(false);
      setEditing(null);
      setVehicleSearch("");

      setForm({
        imei: "",
        simNumber: "",
        installationDate: "",
        firmwareVersion: "",
        vehicleId: "",
      });

      fetchDevices();
    } catch (err: any) {
      safeAlert(err.message || "Save failed");
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* =======================
     RENDER
  ======================= */

  if (!token) return <p className="p-6 text-gray-500">Loading authentication...</p>;

  return (
    <div className="p-6 space-y-6 bg-white text-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold">Devices</h1>

      <button
        onClick={openAddForm}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Add Device
      </button>

      {/* FORM */}
      {showForm && (
        <form
          onSubmit={submitForm}
          className="p-6 bg-white rounded shadow space-y-4 border"
        >
          <h2 className="text-xl font-semibold">
            {editing ? "Edit Device" : "Add Device"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">IMEI</label>
              <input
                name="imei"
                placeholder="123456789012345"
                value={form.imei}
                onChange={handleChange}
                className="px-3 py-2 border rounded"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">SIM Number</label>
              <input
                name="simNumber"
                placeholder="0712345678"
                value={form.simNumber}
                onChange={handleChange}
                className="px-3 py-2 border rounded"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Firmware Version</label>
              <input
                name="firmwareVersion"
                placeholder="v1.0"
                value={form.firmwareVersion}
                onChange={handleChange}
                className="px-3 py-2 border rounded"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Installation Date</label>
              <input
                type="date"
                name="installationDate"
                value={form.installationDate}
                onChange={handleChange}
                className="px-3 py-2 border rounded"
                required
              />
            </div>

            {/* ✅ Search triggers dropdown filtering (same behavior you used before) */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Vehicle</label>

              <input
                type="text"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Search vehicle by reg no, make, model..."
                className="px-3 py-2 border rounded"
              />

              <select
                name="vehicleId"
                value={form.vehicleId}
                onChange={handleChange}
                className="px-3 py-2 border rounded"
                required
              >
                <option value="" disabled>
                  {vehiclesLoading
                    ? "Loading vehicles..."
                    : vehicles.length
                    ? "Select vehicle"
                    : "No vehicles found"}
                </option>

                {filteredVehicles.length ? (
                  filteredVehicles.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.registrationNo || `Vehicle #${v.id}`}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No matches for “{vehicleSearch}”
                  </option>
                )}
              </select>

              {form.vehicleId && vehicleById.get(Number(form.vehicleId)) ? (
                <p className="text-xs text-gray-600">
                  Selected:{" "}
                  {(() => {
                    const v = vehicleById.get(Number(form.vehicleId))!;
                    return `${v.registrationNo} — ${v.make} ${v.model}`;
                  })()}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
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
      <div className="overflow-x-auto bg-white rounded shadow border">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              {[
                "ID",
                "IMEI",
                "Vehicle",
                "Installed By",
                "Jobs",
                "Subscriptions",
                "Created",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left border-b">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {devices.length ? (
              devices.map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3">{d.id}</td>
                  <td className="px-4 py-3">{d.imei}</td>
                  <td className="px-4 py-3">
                    {d.vehicle
                      ? `${d.vehicle.registrationNo} (${d.vehicle.make})`
                      : vehicleById.get(d.vehicleId)?.registrationNo || d.vehicleId}
                  </td>
                  <td className="px-4 py-3">
                    {d.installedBy?.name || d.installedById}
                  </td>
                  <td className="px-4 py-3">
                    {d.jobs?.map((j) => j.jobType).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">{d.subscriptions?.length || 0}</td>
                  <td className="px-4 py-3">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(d)}
                      className="px-3 py-1 bg-yellow-400 rounded hover:bg-yellow-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  {loading ? "Loading..." : "No devices found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
