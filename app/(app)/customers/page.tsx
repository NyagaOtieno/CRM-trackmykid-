// app/customers/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type Customer = {
  id: number | string;
  name: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  address?: string;
  status?: string;
  userId?: number;
};

const safeString = (v: any) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return JSON.stringify(v);
};

const normalizeCustomer = (c: any): Customer => ({
  id: c.id ?? c._id,
  name: safeString(c.name),
  contactPerson: safeString(c.contactPerson),
  email: safeString(c.email),
  phone: safeString(c.phone),
  address: safeString(c.address),
  status: safeString(c.status) || "active",
  userId:
    typeof c.userId === "number"
      ? c.userId
      : c.userId
      ? Number(c.userId)
      : undefined,
});

const safeAlert = (msg: string) => {
  if (typeof window !== "undefined") alert(msg);
};

const safeConfirm = (msg: string) => {
  if (typeof window !== "undefined") return confirm(msg);
  return false;
};

function getStoredToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

// ✅ Decode JWT payload (base64url)
function decodeJwt(token: string) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ✅ Extract user id from token in a robust way
function getAuthUserId(): number | null {
  const token = getStoredToken();
  if (!token) return null;

  const payload: any = decodeJwt(token);
  if (!payload) return null;

  // common fields used by APIs
  const candidate = payload.id ?? payload.userId ?? payload.sub ?? payload.uid;
  const n = Number(candidate);
  return Number.isFinite(n) ? n : null;
}

export default function CustomersPage() {
  const [ready, setReady] = useState(false);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [totalPages, setTotalPages] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  // ✅ userId pulled from token (fixes production 403)
  const [authUserId, setAuthUserId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
  });

  const handleApiError = (err: any, action: string) => {
    const status = err?.status;
    const message =
      err?.message || err?.raw?.message || err?.raw?.error || `${action} failed`;

    if (status === 401) {
      safeAlert("Session expired. Please login again.");
      window.location.href = "/login";
      return;
    }

    if (status === 403) {
      console.warn("FORBIDDEN (403):", action, err?.debug, err?.raw);
      safeAlert(
        "Access denied (403). This usually means your account is not allowed to create/update customers OR the userId sent does not match your login."
      );
      return;
    }

    console.error(action, err);
    safeAlert(message);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res: any = await apiGet("/api/customers", {
        q: query || undefined,
        page,
        perPage,
      });

      const list = Array.isArray(res)
        ? res.map(normalizeCustomer)
        : (res.data ?? res.items ?? []).map(normalizeCustomer);

      setCustomers(list);
      setTotalPages(res?.totalPages ?? 1);
    } catch (err: any) {
      handleApiError(err, "Fetch customers");
      setCustomers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReady(true);

    // ✅ compute auth user id once on client
    const token = getStoredToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const uid = getAuthUserId();
    if (!uid) {
      // Token exists but doesn't contain user id (or decode failed)
      console.warn("Token found but user id missing in JWT payload.");
      // still allow view, but creating/updating may fail
    }
    setAuthUserId(uid);
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, page, query]);

  const handleAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
    });
    setShowForm(true);
  };

  const handleEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      contactPerson: c.contactPerson ?? "",
      phone: c.phone ?? "",
      email: c.email,
      address: c.address ?? "",
    });
    setShowForm(true);
  };

  const handleDelete = async (c: Customer) => {
    if (!safeConfirm(`Delete ${c.name}?`)) return;

    try {
      await apiDelete(`/api/customers/${c.id}`);
      fetchCustomers();
    } catch (err: any) {
      handleApiError(err, "Delete customer");
    }
  };

  const submit = async (e: any) => {
    e.preventDefault();

    try {
      const uid = authUserId;

      // ✅ If backend requires userId, send the logged-in user's id
      if (!uid) {
        safeAlert(
          "Cannot determine your userId from token. Please login again, then retry."
        );
        return;
      }

      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        userId: uid, // ✅ FIX: no more hardcoded 1
      };

      if (!payload.name || !payload.email) {
        safeAlert("Name and Email are required");
        return;
      }

      if (editing) {
        await apiPut(`/api/customers/${editing.id}`, payload);
      } else {
        await apiPost("/api/customers", payload);
      }

      setShowForm(false);
      fetchCustomers();
    } catch (err: any) {
      handleApiError(err, editing ? "Update customer" : "Create customer");
    }
  };

  const visible = useMemo(() => {
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter((c) =>
      (
        c.name +
        " " +
        (c.contactPerson ?? "") +
        " " +
        c.email +
        " " +
        (c.phone ?? "") +
        " " +
        (c.address ?? "")
      )
        .toLowerCase()
        .includes(q)
    );
  }, [customers, query]);

  if (!ready) return <div className="p-6 text-center">Loading page...</div>;

  return (
    <Protected>
      <div className="space-y-6">
        <TableControls
          title="Customers"
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

        {showForm && (
          <form
            onSubmit={submit}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border"
          >
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit Customer" : "Add New Customer"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Customer Name"
                className="px-3 py-2 border rounded"
              />

              <input
                value={form.contactPerson}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactPerson: e.target.value }))
                }
                placeholder="Contact Person"
                className="px-3 py-2 border rounded"
              />

              <input
                required
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="Email"
                className="px-3 py-2 border rounded"
              />

              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="Phone"
                className="px-3 py-2 border rounded"
              />

              <input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Address"
                className="px-3 py-2 border rounded"
              />
            </div>

            <div className="flex gap-3 mt-4">
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

        <div className="bg-white rounded-lg shadow border overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-100">
              <tr>
                {[
                  "ID",
                  "Name",
                  "Contact Person",
                  "Email",
                  "Phone",
                  "Address",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-sm font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((c, i) => (
                  <tr key={String(c.id)} className={i % 2 ? "bg-gray-50" : ""}>
                    <td className="px-4 py-3">{c.id}</td>
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">{c.contactPerson || "-"}</td>
                    <td className="px-4 py-3">{c.email}</td>
                    <td className="px-4 py-3">{c.phone || "-"}</td>
                    <td className="px-4 py-3">{c.address || "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status || "active"} />
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="px-3 py-1 bg-yellow-400 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="px-3 py-1 bg-red-500 text-white rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center">
                    No customers found
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
