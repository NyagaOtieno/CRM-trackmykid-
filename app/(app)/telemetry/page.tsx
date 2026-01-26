"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, PropsWithChildren } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import TableControls from "@/components/TableControls";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

import "leaflet/dist/leaflet.css";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";

/* ================= TYPES ================= */
type Tele = {
  id: number;
  deviceId?: string; // used to match vehicle
  lat?: number;
  lng?: number;
  ts?: string;
};

type Vehicle = {
  id: number;
  registrationNumber?: string; // plate
  plateNumber?: string;
  name?: string;
  deviceId?: string; // if vehicle stores deviceId
  imei?: string; // if vehicle stores IMEI
};

/* ================= MAP (SSR-SAFE) ================= */
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

/**
 * ✅ Fix TS children error for MarkerClusterGroup by typing it explicitly
 * Some builds export default, others export the module itself—handle both.
 */
type ClusterProps = PropsWithChildren<{
  chunkedLoading?: boolean;
}>;

const MarkerClusterGroup = dynamic(
  async () => {
    const mod = await import("@changey/react-leaflet-markercluster");
    return (mod.default ?? mod) as ComponentType<ClusterProps>;
  },
  { ssr: false }
) as ComponentType<ClusterProps>;

/* ================= HELPERS ================= */
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function hasCoords(t: Tele) {
  // ✅ allow 0,0 coordinates
  return isNum(t.lat) && isNum(t.lng);
}

function getVehicleKey(v: Vehicle) {
  return (v.deviceId || v.imei || "").trim();
}

function getTeleKey(t: Tele) {
  return (t.deviceId || "").trim();
}

function vehicleLabel(v?: Vehicle) {
  if (!v) return "Unknown vehicle";
  return v.registrationNumber || v.plateNumber || v.name || `Vehicle #${v.id}`;
}

/**
 * Optional: If your telemetry endpoint returns multiple points per vehicle,
 * you can show ONLY the latest location per deviceId by setting this to true.
 */
const SHOW_LATEST_PER_DEVICE = true;

function pickLatestPerDevice(list: Tele[]) {
  const map = new Map<string, Tele>();
  for (const t of list) {
    const key = getTeleKey(t);
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, t);
      continue;
    }

    // Compare ts if present; otherwise keep the existing
    const a = existing.ts ? new Date(existing.ts).getTime() : 0;
    const b = t.ts ? new Date(t.ts).getTime() : 0;
    if (b >= a) map.set(key, t);
  }
  return Array.from(map.values());
}

/* ================= PAGE ================= */
export default function TelemetryPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [page, setPage] = useState(1);
  const perPage = 10;

  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Tele[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const [tokenChecked, setTokenChecked] = useState(false);
  const [ready, setReady] = useState(false);

  // prevent racing responses
  const requestSeq = useRef(0);

  /* ✅ Debounce search to reduce API calls */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  /* ✅ Client-only token check */
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

  /* ✅ Patch Leaflet default icon (client-only) */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined") return;

      const L = (await import("leaflet")).default;

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

  /* Fetch vehicles (needed to show vehicle label on map) */
  const fetchVehicles = async () => {
    const res = await api.get("/api/vehicles");
    const data = res.data;
    const list: Vehicle[] = Array.isArray(data) ? data : (data?.data ?? []);
    setVehicles(list);
  };

  /* Fetch telemetry */
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

  /* Load vehicles once when ready */
  useEffect(() => {
    if (!ready) return;
    fetchVehicles().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* Load telemetry whenever page/search changes */
  useEffect(() => {
    if (!ready) return;
    fetchTelemetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, page, debouncedQuery]);

  /* Vehicle lookup map by deviceId/imei */
  const vehicleByKey = useMemo(() => {
    const map = new Map<string, Vehicle>();
    for (const v of vehicles) {
      const key = getVehicleKey(v);
      if (key) map.set(key, v);
    }
    return map;
  }, [vehicles]);

  /* Visible telemetry (client filter + optional latest-per-device) */
  const visible = useMemo(() => {
    const base = debouncedQuery
      ? items.filter((x) =>
          (x.deviceId ?? "").toLowerCase().includes(debouncedQuery.toLowerCase())
        )
      : items;

    return SHOW_LATEST_PER_DEVICE ? pickLatestPerDevice(base) : base;
  }, [items, debouncedQuery]);

  /* Map center from available points */
  const center = useMemo<[number, number]>(() => {
    const valid = visible.filter(hasCoords);
    if (!valid.length) return [0, 0];

    const lat =
      valid.reduce((sum, x) => sum + (x.lat as number), 0) / valid.length;
    const lng =
      valid.reduce((sum, x) => sum + (x.lng as number), 0) / valid.length;

    return [lat, lng];
  }, [visible]);

  if (!tokenChecked) return <div className="p-4">Checking authentication…</div>;
  if (!ready) return <div className="p-4">Redirecting to login…</div>;

  return (
    <Protected>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Vehicle Locations</h1>
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

        {/* MAP */}
        <div className="h-96 w-full rounded shadow overflow-hidden">
          <MapContainer
            center={center}
            zoom={7}
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
                .map((t) => {
                  const v = vehicleByKey.get(getTeleKey(t));

                  return (
                    <Marker
                      key={t.id}
                      position={[t.lat as number, t.lng as number]}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div>
                            <b>Vehicle:</b> {vehicleLabel(v)}
                          </div>
                          <div>
                            <b>Device:</b> {t.deviceId ?? "-"}
                          </div>
                          <div>
                            <b>Time:</b> {t.ts ?? "-"}
                          </div>
                          <div>
                            <b>Lat/Lng:</b> {t.lat}, {t.lng}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded shadow overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Telemetry ID</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Device</th>
                <th className="px-4 py-3 text-left">Lat</th>
                <th className="px-4 py-3 text-left">Lng</th>
                <th className="px-4 py-3 text-left">TS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center">
                    Loading…
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((t) => {
                  const v = vehicleByKey.get(getTeleKey(t));

                  return (
                    <tr key={t.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{t.id}</td>
                      <td className="px-4 py-3">{vehicleLabel(v)}</td>
                      <td className="px-4 py-3">{t.deviceId ?? "-"}</td>
                      <td className="px-4 py-3">{isNum(t.lat) ? t.lat : "-"}</td>
                      <td className="px-4 py-3">{isNum(t.lng) ? t.lng : "-"}</td>
                      <td className="px-4 py-3">{t.ts ?? "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
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
