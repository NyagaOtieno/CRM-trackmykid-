"use client";

import { useEffect, useMemo, useState } from "react";
import TableControls from "@/components/TableControls";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";

// Fix default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

type Tele = {
  id: number;
  deviceId?: string;
  lat?: number;
  lng?: number;
  ts?: string;
};

export default function TelemetryPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Tele[]>([]);
  const [loading, setLoading] = useState(false);

  const [tokenChecked, setTokenChecked] = useState(false);
  const [ready, setReady] = useState(false);

  // ✅ Client-only token check
  useEffect(() => {
    if (typeof window === "undefined") return; // server guard
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      window.location.href = "/login"; // safe redirect
    } else {
      setReady(true);
    }

    setTokenChecked(true);
  }, []);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/telemetry", {
        params: { q: query || undefined, page, perPage },
      });

      const responseData = res.data;

      if (Array.isArray(responseData)) {
        setItems(responseData);
        setTotalPages(1);
      } else {
        setItems(responseData.data ?? []);
        setTotalPages(responseData.totalPages ?? 1);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setTotalPages(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (ready) fetchTelemetry();
  }, [page, query, ready]);

  const visible = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((x) => (x.deviceId ?? "").toLowerCase().includes(q));
  }, [items, query]);

  const center = useMemo(() => {
    const valid = visible.filter((x) => x.lat && x.lng);
    if (!valid.length) return [0, 0];

    const lat = valid.reduce((sum, x) => sum + (x.lat ?? 0), 0) / valid.length;
    const lng = valid.reduce((sum, x) => sum + (x.lng ?? 0), 0) / valid.length;

    return [lat, lng];
  }, [visible]);

  if (!tokenChecked) return <div>Checking authentication...</div>;
  if (!ready) return <div>Redirecting to login...</div>;

  return (
    <Protected>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Telemetry</h1>
        </div>

        <TableControls
          title="Telemetry"
          query={query}
          setQuery={(v) => {
            setQuery(v);
            setPage(1);
          }}
          onAdd={() => alert("Telemetry is device generated")}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />

        <div className="h-96 w-full rounded shadow overflow-hidden">
          <MapContainer
            center={center as [number, number]}
            zoom={5}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup chunkedLoading>
              {visible.map(
                (t) =>
                  t.lat &&
                  t.lng && (
                    <Marker key={t.id} position={[t.lat, t.lng]}>
                      <Popup>
                        Device: {t.deviceId ?? "-"} <br />
                        TS: {t.ts ?? "-"}
                      </Popup>
                    </Marker>
                  )
              )}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded shadow overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Lat</th>
                <th className="px-4 py-3">Lng</th>
                <th className="px-4 py-3">TS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3">{t.id}</td>
                    <td className="px-4 py-3">{t.deviceId ?? "-"}</td>
                    <td className="px-4 py-3">{t.lat ?? "-"}</td>
                    <td className="px-4 py-3">{t.lng ?? "-"}</td>
                    <td className="px-4 py-3">{t.ts ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No telemetry data
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
