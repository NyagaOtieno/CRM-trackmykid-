"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

/* ================= TYPES ================= */

type Job = {
  id: number;
  jobType: string;
  notes?: string;
  scheduledAt?: string;

  customerId: number;
  deviceId: number;
  vehicleId: number;
  createdById: number;
  assignedToId: number;

  customer?: { name: string };
  device?: { imei: string };
  vehicle?: { registrationNo: string };
  assignedTo?: { name: string };
};

/* ================= PAGE ================= */

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ================= */

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // 🔥 BACKEND RETURNS Job[]
      const list = await api.get<Job[]>("/api/jobs");

      setJobs(Array.isArray(list) ? list : []);
      setTotalPages(Math.ceil((list?.length ?? 1) / perPage));
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setJobs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  /* ================= FILTER ================= */

  const visible = useMemo(() => {
    if (!query) return jobs;
    const q = query.toLowerCase();
    return jobs.filter(
      (j) =>
        j.jobType.toLowerCase().includes(q) ||
        j.id.toString().includes(q) ||
        j.customer?.name?.toLowerCase().includes(q)
    );
  }, [jobs, query]);

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString() : "-";

  /* ================= UI ================= */

  return (
    <Protected>
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-bold">Jobs</h1>

        <TableControls
          title="Jobs"
          query={query}
          setQuery={(v) => {
            setQuery(v);
            setPage(1);
          }}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />

        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Job Type</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Device</th>
                <th className="px-4 py-3 text-left">Scheduled</th>
                <th className="px-4 py-3 text-left">Assigned To</th>
                <th className="px-4 py-3 text-left">Status</th>
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
                visible.map((j) => (
                  <tr
                    key={j.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3">{j.id}</td>
                    <td className="px-4 py-3">{j.jobType}</td>
                    <td className="px-4 py-3">
                      {j.customer?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {j.vehicle?.registrationNo ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {j.device?.imei ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(j.scheduledAt)}
                    </td>
                    <td className="px-4 py-3">
                      {j.assignedTo?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status="open" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="p-6 text-center text-gray-500"
                  >
                    No jobs found.
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
