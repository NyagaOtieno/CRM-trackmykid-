"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import StatusBadge from "@/components/StatusBadge";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

/* ================= TYPES ================= */

interface Job {
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
  status?: string;
}

/* ================= PAGE ================= */

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH ================= */
  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<Job[]>("/api/jobs");
      const array = Array.isArray(list) ? list : [];
      setJobs(array);
      setTotalPages(Math.ceil(array.length / perPage));
    } catch (err: any) {
      console.error("Failed to fetch jobs:", err);
      setJobs([]);
      setTotalPages(1);
      setError(err.message || "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  /* ================= FILTER ================= */
  const visibleJobs = useMemo(() => {
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

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    { label: "ID", accessor: (j: Job) => j.id },
    { label: "Job Type", accessor: (j: Job) => j.jobType },
    { label: "Customer", accessor: (j: Job) => j.customer?.name ?? "-" },
    { label: "Vehicle", accessor: (j: Job) => j.vehicle?.registrationNo ?? "-" },
    { label: "Device", accessor: (j: Job) => j.device?.imei ?? "-" },
    { label: "Scheduled", accessor: (j: Job) => formatDate(j.scheduledAt) },
    { label: "Assigned To", accessor: (j: Job) => j.assignedTo?.name ?? "-" },
    {
      label: "Status",
      accessor: (j: Job) => <StatusBadge status={j.status ?? "open"} />,
    },
  ];

  /* ================= UI ================= */
  return (
    <Protected>
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-bold dark:text-gray-200">Jobs</h1>

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
              ) : visibleJobs.length ? (
                visibleJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    {columns.map((col) => (
                      <td key={col.label} className="px-4 py-3 border-b dark:border-gray-700">
                        {col.accessor(job)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-gray-500 dark:text-gray-400">
                    {error ?? "No jobs found."}
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
