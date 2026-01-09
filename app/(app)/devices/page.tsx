"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

/* =======================
   TYPES (MATCH BACKEND)
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

  /* relations */
  vehicle?: Vehicle;
  installedBy?: User;
  jobs?: Job[];
  subscriptions?: Subscription[];
}

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

  useEffect(() => {
    if (token) fetchDevices();
  }, [token]);

  /* =======================
     FETCH
  ======================= */

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://trackmykid-crm-production.up.railway.app/api/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch devices");
      const data: Device[] = await res.json();
      setDevices(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     CRUD
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
    if (!confirm(`Delete device ${device.imei}?`)) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/devices/${device.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to delete device");
      fetchDevices();
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  };

  const submitForm = async (e: any) => {
    e.preventDefault();

    const payload = {
      ...form,
      vehicleId: Number(form.vehicleId),
      installedById: Number(form.installedById),
    };

    try {
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `http://localhost:5000/api/devices/${editing.id}`
        : "http://localhost:5000/api/devices";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");

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
      alert(err.message || "Save failed");
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString();

  if (token === null) {
    return <p className="p-6 text-gray-500">Loading authentication...</p>;
  }

  /* =======================
     UI
  ======================= */

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
          className="p-6 bg-white dark:bg-gray-800 rounded shadow"
        >
          <h2 className="text-xl font-semibold mb-4">
            {editing ? "Edit Device" : "Add Device"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ["IMEI", "imei"],
              ["SIM Number", "simNumber"],
              ["Firmware Version", "firmwareVersion"],
              ["Serial Number", "serialNumber"],
              ["Type", "type"],
              ["Assigned To", "assignedTo"],
            ].map(([label, key]) => (
              <input
                key={key}
                placeholder={label}
                value={(form as any)[key]}
                onChange={(e) =>
                  setForm({ ...form, [key]: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
            ))}

            <input
              type="date"
              value={form.installationDate}
              onChange={(e) =>
                setForm({ ...form, installationDate: e.target.value })
              }
              className="px-3 py-2 border rounded"
            />

            <input
              type="number"
              placeholder="Vehicle ID"
              value={form.vehicleId}
              onChange={(e) =>
                setForm({ ...form, vehicleId: e.target.value })
              }
              className="px-3 py-2 border rounded"
            />

            <input
              type="number"
              placeholder="Installed By ID"
              value={form.installedById}
              onChange={(e) =>
                setForm({ ...form, installedById: e.target.value })
              }
              className="px-3 py-2 border rounded"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">
              Save
            </button>
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
                  <td className="px-4 py-3">
                    {d.installedBy?.name || d.installedById}
                  </td>
                  <td className="px-4 py-3">
                    {d.jobs?.map((j) => j.jobType).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {d.subscriptions?.length || 0}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(d.createdAt)}
                  </td>
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
                  No devices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
