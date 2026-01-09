"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

/* =======================
   TYPES
======================= */

interface Track {
  id: number;
  deviceId?: string;
  lng?: number;
  lat?: number;
  ts?: string;
}

/* =======================
   COMPONENT
======================= */

export default function DeviceTrackingsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =======================
     FETCH TRACKS
  ======================= */

  const fetchTracks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ data?: Track[]; totalPages?: number }>(
        `/api/device-trackings?q=${query || ""}&page=${page}&perPage=${perPage}`
      );

      const items = data.data ?? [];
      setTracks(items);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      console.error(err);
      setTracks([]);
      setTotalPages(1);
      setError(err.message || "Failed to fetch tracks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [page, query]);

  /* =======================
     FILTERING
  ======================= */

  const visibleTracks = useMemo(() => {
    if (!query) return tracks;
    const q = query.toLowerCase();
    return tracks.filter((t) => (t.deviceId ?? "").toLowerCase().includes(q));
  }, [tracks, query]);

  /* =======================
     RENDER
  ======================= */

  return (
    <Protected>
      <div className="space-y-6 p-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold dark:text-gray-200">
            Device Trackings
          </h1>
        </div>

        {/* Search + Pagination */}
        <TableControls
          title="Device Trackings"
          query={query}
          setQuery={(v) => {
            setQuery(v);
            setPage(1);
          }}
          onAdd={() => alert("Tracks come directly from devices")}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />

        {/* Table */}
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-300 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                {["ID", "Device", "Latitude", "Longitude", "Timestamp"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-gray-500 dark:text-gray-300"
                  >
                    Loading...
                  </td>
                </tr>
              ) : visibleTracks.length ? (
                visibleTracks.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`${
                      i % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"
                    } hover:bg-gray-100 dark:hover:bg-gray-600 transition`}
                  >
                    <td className="px-4 py-3 border-b dark:border-gray-700">{t.id}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{t.deviceId ?? "-"}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{t.lat ?? "-"}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{t.lng ?? "-"}</td>
                    <td className="px-4 py-3 border-b dark:border-gray-700">{t.ts ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-gray-500 dark:text-gray-300"
                  >
                    {error ? error : "No tracks found"}
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
