"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

type Customer = { id: number; name: string };
type Plan = { id: number; name: string; price: number; durationDays: number; isActive?: boolean };
type Device = { id: number; imei: string; vehicleId?: number; vehicle?: { registrationNo?: string } };
type Kid = { id: number; name: string; parentId?: number };

const STATUS = ["TRIAL", "ACTIVE", "GRACE", "EXPIRED", "SUSPENDED", "CANCELLED"] as const;

function clsx(...parts: (string | boolean | undefined | null)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function AddSubscriptionModal({ onClose, onCreated }: Props) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerId: "",
    planId: "",
    status: "ACTIVE",
    startDate: "", // optional
    autoRenew: false,
    graceDays: 3,
    amount: "", // optional override
    deviceIds: [] as number[],
    kidIds: [] as number[],
  });

  // Load plans/devices/kids once
  useEffect(() => {
    (async () => {
      try {
        // ⚠️ If /api/plans doesn't exist yet, you must add backend route (I can give it if needed)
        const [p, d, k] = await Promise.all([
          apiGet("/api/plans").catch(() => []),
          apiGet("/api/devices").catch(() => []),
          apiGet("/api/kids").catch(() => []),
        ]);

        setPlans(Array.isArray(p?.data) ? p.data : Array.isArray(p) ? p : []);
        setDevices(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
        setKids(Array.isArray(k?.data) ? k.data : Array.isArray(k) ? k : []);
      } catch (e: any) {
        setErr(e?.message || "Failed loading dropdowns");
      }
    })();
  }, []);

  // Customer search -> dropdown
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await apiGet("/api/customers", { q: customerQuery || undefined, perPage: 50, page: 1 });
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setCustomers(list.map((c: any) => ({ id: c.id, name: c.name })));
      } catch {
        setCustomers([]);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [customerQuery]);

  const selectedPlan = useMemo(
    () => plans.find((p) => String(p.id) === String(form.planId)),
    [plans, form.planId]
  );

  const submit = async () => {
    setLoading(true);
    setErr(null);
    try {
      if (!form.customerId) throw new Error("Please select a customer");
      if (!form.planId) throw new Error("Please select a plan");

      const payload: any = {
        customerId: Number(form.customerId),
        planId: Number(form.planId),
        status: form.status,
        autoRenew: Boolean(form.autoRenew),
        graceDays: Number(form.graceDays || 3),
        deviceIds: form.deviceIds,
        kidIds: form.kidIds,
      };

      if (form.startDate) payload.startDate = form.startDate;
      if (form.amount !== "") payload.amount = Number(form.amount);

      await apiPost("/api/subscriptions", payload);

      onCreated();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-3 z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Create Subscription</h2>
            <p className="text-sm text-gray-600">
              Select customer + plan, then link devices and kids for tracking.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            ✕
          </button>
        </div>

        {/* Scroll body */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          {err && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {err}
            </div>
          )}

          {/* Customer Search + Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer</label>
            <input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search customer by name..."
              className="w-full border rounded-lg px-3 py-2 bg-white"
            />

            <select
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Plan</label>
            <select
              value={form.planId}
              onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Select plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} — {p.name} (KES {p.price} / {p.durationDays} days)
                </option>
              ))}
            </select>

            {selectedPlan && (
              <div className="text-sm text-gray-700 p-3 rounded-lg bg-gray-50 border">
                <div className="font-medium">{selectedPlan.name}</div>
                <div className="text-gray-600">
                  Price: KES {selectedPlan.price} • Duration: {selectedPlan.durationDays} days
                </div>
              </div>
            )}
          </div>

          {/* Status + Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date (optional)</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Grace Days</label>
              <input
                type="number"
                min={0}
                value={form.graceDays}
                onChange={(e) => setForm((f) => ({ ...f, graceDays: Number(e.target.value) }))}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Override (optional)</label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder={selectedPlan ? `Default: ${selectedPlan.price}` : "Leave blank"}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="autoRenew"
                type="checkbox"
                checked={form.autoRenew}
                onChange={(e) => setForm((f) => ({ ...f, autoRenew: e.target.checked }))}
              />
              <label htmlFor="autoRenew" className="text-sm font-medium">
                Auto renew
              </label>
            </div>
          </div>

          {/* Devices */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link Devices (multi-select)</label>
            <select
              multiple
              value={form.deviceIds.map(String)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  deviceIds: Array.from(e.target.selectedOptions).map((o) => Number(o.value)),
                }))
              }
              className="w-full border rounded-lg px-3 py-2 bg-white min-h-[140px]"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id} — IMEI {d.imei} {d.vehicle?.registrationNo ? `(${d.vehicle.registrationNo})` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Tip: hold Ctrl/Command to select multiple.
            </p>
          </div>

          {/* Kids */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link Kids (multi-select)</label>
            <select
              multiple
              value={form.kidIds.map(String)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kidIds: Array.from(e.target.selectedOptions).map((o) => Number(o.value)),
                }))
              }
              className="w-full border rounded-lg px-3 py-2 bg-white min-h-[140px]"
            >
              {kids.map((k) => (
                <option key={k.id} value={k.id}>
                  #{k.id} — {k.name}
                </option>
              ))}
            </select>
          </div>

          {/* NOTE for “subscription journey” */}
          <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
            <div className="font-medium mb-1">Subscription journey checks</div>
            <ul className="list-disc ml-5 space-y-1">
              <li>Tracking works only when device is linked to an ACTIVE/GRACE subscription.</li>
              <li>Telemetry requires kid-device assignment (Assignments API).</li>
              <li>Use Assignments to attach a kid to a specific device/bus.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className={clsx(
              "px-4 py-2 rounded-lg text-white",
              loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            )}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}
