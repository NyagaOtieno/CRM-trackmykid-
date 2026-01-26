"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import TableControls from "@/components/TableControls";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

// ✅ Leaflet CSS must be imported in a client file
import "leaflet/dist/leaflet.css";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";

type Tele = {
  id: number;
  deviceId?: string;
  lat?: number;
  lng?: number;
  ts?: string;
};

// ✅ Dynamically import leaflet components to avoid SSR/build crashes on Vercel
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const MarkerClusterGroup = dynamic(() => import("@changey/react-leaflet-markercluster"), {
  ssr: false,
});

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function hasCoords(t: Tele) {
  // ✅ allow 0,0 as valid
  return isNum(t.lat) && isNum(t.lng);
}

export default function TelemetryPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [page, setPage] = useState(1);
  const perPage = 10;

  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Tele[]>([]);
  const [loading, setLoading] = useState(false);

  const [tokenChecked, setTokenChecked] = useState(false);
  const [ready, setReady] = useState(false);

  // Prevent racing responses
  const requestSeq = useRef(0);

  // ✅ Debounce query to reduce API calls
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // ✅ Client-only token check + Next router redirect
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      setReady(false);
    } else {
      setReady(true);
    }

    setTokenChecked(true);
  }, [router]);

  // ✅ Patch Leaflet default icon only on client
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined") return;

      const L = (await import("leaflet")).default;

      // Fix default marker icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });

      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchTelemetry = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);

    try {
      const res = await api.get("/api/telemetry", {
        params: {
          q: debouncedQuery || undefined,
          page,
          perPage,
        },
      });

      // ignore stale response
      if (seq !== requestSeq.current) return;

      const data = res.data;

      if (Array.isArray(data)) {
        setItems(data);
        setTotalPages(1);
      } else {
        setItems(data?.data ?? []);
        setTotalPages(data?.totalPages ?? 1);
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      setItems([]);
      setTotalPages(1);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    fetchTelemetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, page, debouncedQuery]);

  // If backend already filters by q, this is optional,
  // but we keep it for safety/consistency:
  const visible = useMemo(() => {
    if (!debouncedQuery) return items;
    const q = debouncedQuery.toLowerCase();
    return items.filter((x) => (x.deviceId ?? "").toLowerCase().includes(q));
  }, [items, debouncedQuery]);

  const center = useMemo<[number, number]>(() => {
    const valid = visible.filter(hasCoords);
    if (!valid.length) return [0, 0];

    const lat = valid.reduce((sum, x) => sum + (x.lat as number), 0) / valid.length;
    const lng = valid.reduce((sum, x) => sum + (x.lng as number), 0) / valid.length;

    return [lat, lng];
  }, [visible]);

  if (!tokenChecked) return <div className="p-4">Checking authentication…</div>;
  if (!ready) return <div className="p-4">Redirecting to login…</div>;

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
            center={center}
            zoom={5}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MarkerClusterGroup chunkedLoading>
              {visible
                .filter(hasCoords)
                .map((t) => (
                  <Marker key={t.id} position={[t.lat as number, t.lng as number]}>
                    <Popup>
                      <div className="text-sm">
                        <div>
                          <b>Device:</b> {t.deviceId ?? "-"}
                        </div>
                        <div>
                          <b>TS:</b> {t.ts ?? "-"}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        {/* ✅ Remove dark background per your preference */}
        <div className="bg-white rounded shadow overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Device</th>
                <th className="px-4 py-3 text-left">Lat</th>
                <th className="px-4 py-3 text-left">Lng</th>
                <th className="px-4 py-3 text-left">TS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center">
                    Loading…
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{t.id}</td>
                    <td className="px-4 py-3">{t.deviceId ?? "-"}</td>
                    <td className="px-4 py-3">{isNum(t.lat) ? t.lat : "-"}</td>
                    <td className="px-4 py-3">{isNum(t.lng) ? t.lng : "-"}</td>
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
