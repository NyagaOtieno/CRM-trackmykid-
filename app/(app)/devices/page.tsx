"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
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

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString();

/* =======================
   COMPONENT
======================= */

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);

  const [form, setForm] = useState({
    imei: "",
    simNumber: "",
    installationDate: "",
    firmwareVersion: "",
    serialNumber: "",
    type: "",
    assignedTo: "",
    vehicleId: "",
    installedById: "",
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
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
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

  /* =======================
     EFFECTS
  ======================= */

  useEffect(() => {
    if (token) fetchDevices();
  }, [token]);

  /* =======================
     CRUD HANDLERS
  ======================= */

  const handleEdit = (device: Device) => {
    setEditing(device);
    setForm({
      imei: device.imei,
      simNumber: device.simNumber,
      installationDate: device.installationDate.split("T")[0],
      firmwareVersion: device.firmwareVersion,
      serialNumber: device.serialNumber || "",
      type: device.type || "",
      assignedTo: device.assignedTo || "",
      vehicleId: device.vehicleId.toString(),
      installedById: device.installedById.toString(),
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

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        vehicleId: Number(form.vehicleId),
        installedById: Number(form.installedById),
      };

      const url = editing
        ? `https://trackmykid-crm-production.up.railway.app/api/devices/${editing.id}`
        : "https://trackmykid-crm-production.up.railway.app/api/devices";

      await apiRequest(url, editing ? "PUT" : "POST", payload);

      setShowForm(false);
      setEditing(null);
      setForm({
        imei: "",
        simNumber: "",
        installationDate: "",
        firmwareVersion: "",
        serialNumber: "",
        type: "",
        assignedTo: "",
        vehicleId: "",
        installedById: "",
      });

      fetchDevices();
    } catch (err: any) {
      safeAlert(err.message || "Save failed");
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* =======================
     RENDER
  ======================= */

  if (!token) return <p className="p-6 text-gray-500">Loading authentication...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Devices</h1>

      <button
        onClick={() => {
          setShowForm(true);
          setEditing(null);
        }}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Add Device
      </button>

      {/* FORM */}
      {showForm && (
        <form
          onSubmit={submitForm}
          className="p-6 bg-white dark:bg-gray-800 rounded shadow space-y-4"
        >
          <h2 className="text-xl font-semibold">
            {editing ? "Edit Device" : "Add Device"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "IMEI", name: "imei" },
              { label: "SIM Number", name: "simNumber" },
              { label: "Firmware Version", name: "firmwareVersion" },
              { label: "Serial Number", name: "serialNumber" },
              { label: "Type", name: "type" },
              { label: "Assigned To", name: "assignedTo" },
            ].map(({ label, name }) => (
              <input
                key={name}
                name={name}
                placeholder={label}
                value={(form as any)[name]}
                onChange={handleChange}
                className="px-3 py-2 border rounded"
              />
            ))}

            <input
              type="date"
              name="installationDate"
              value={form.installationDate}
              onChange={handleChange}
              className="px-3 py-2 border rounded"
            />

            <input
              type="number"
              name="vehicleId"
              placeholder="Vehicle ID"
              value={form.vehicleId}
              onChange={handleChange}
              className="px-3 py-2 border rounded"
            />

            <input
              type="number"
              name="installedById"
              placeholder="Installed By ID"
              value={form.installedById}
              onChange={handleChange}
              className="px-3 py-2 border rounded"
            />
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
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
                <th key={h} className="px-4 py-3 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {devices.length ? (
              devices.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="px-4 py-3">{d.id}</td>
                  <td className="px-4 py-3">{d.imei}</td>
                  <td className="px-4 py-3">
                    {d.vehicle
                      ? `${d.vehicle.registrationNo} (${d.vehicle.make})`
                      : d.vehicleId}
                  </td>
                  <td className="px-4 py-3">{d.installedBy?.name || d.installedById}</td>
                  <td className="px-4 py-3">{d.jobs?.map((j) => j.jobType).join(", ") || "-"}</td>
                  <td className="px-4 py-3">{d.subscriptions?.length || 0}</td>
                  <td className="px-4 py-3">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(d)}
                      className="px-3 py-1 bg-yellow-400 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d)}
                      className="px-3 py-1 bg-red-600 text-white rounded"
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
