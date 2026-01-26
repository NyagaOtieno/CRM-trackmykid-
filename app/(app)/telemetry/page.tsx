"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import TableControls from "@/components/TableControls";
import Protected from "@/components/Protected";
import { api } from "@/lib/api";

import "leaflet/dist/leaflet.css";
import "@changey/react-leaflet-markercluster/dist/styles.min.css";

type Tele = {
  id: number;
  deviceId?: string; // <-- used to match vehicle
  lat?: number;
  lng?: number;
  ts?: string;
};

type Vehicle = {
  id: number;
  registrationNumber?: string; // plate
  plateNumber?: string;        // sometimes this
  name?: string;               // optional label
  deviceId?: string;           // if vehicle stores deviceId/imei
  imei?: string;               // if vehicle stores imei
};

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const MarkerClusterGroup = dynamic(() => import("@changey/react-leaflet-markercluster"), { ssr: false });

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function hasCoords(t: Tele) {
  return isNum(t.lat) && isNum(t.lng);
}

function vehicleLabel(v?: Vehicle) {
  if (!v) return "Unknown vehicle";
  return (
    v.registrationNumber ||
    v.plateNumber ||
    v.name ||
    `Vehicle #${v.id}`
  );
}

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

  const requestSeq = useRef(0);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // auth check
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

  // leaflet icon patch (client-only)
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      const L = (await import("leaflet")).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });
    })();
  }, []);

  const fetchVehicles = async () => {
    // 🔁 Change this endpoint if yours is different
    const res = await api.get("/api/vehicles");
    const data = res.data;

    // support both array + paginated shape
    const list: Vehicle[] = Array.isArray(data) ? data : (data?.data ?? []);
    setVehicles(list);
  };

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

  // initial load: vehicles + telemetry
  useEffect(() => {
    if (!ready) return;
    fetchVehicles().catch(console.error);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    fetchTelemetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, page, debouncedQuery]);

  // Build a lookup so telemetry.deviceId can find its vehicle quickly
  const vehicleByDeviceId = useMemo(() => {
    const map = new Map<string, Vehicle>();
    for (const v of vehicles) {
      const key = (v.deviceId || v.imei || "").trim();
      if (key) map.set(key, v);
    }
    return map;
  }, [vehicles]);

  // visible telemetry (client filter, optional)
  const visible = useMemo(() => {
    if (!debouncedQuery) return items;
    const q = debouncedQuery.toLowerCase();
    return items.filter((x) => (x.deviceId ?? "").toLowerCase().includes(q));
  }, [items, debouncedQuery]);

  // center based on valid markers
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

        <div className="h-96 w-full rounded shadow overflow-hidden">
          <MapContainer center={center} zoom={7} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MarkerClusterGroup chunkedLoading>
              {visible
                .filter(hasCoords)
                .map((t) => {
                  const v = t.deviceId ? vehicleByDeviceId.get(t.deviceId.trim()) : undefined;

                  return (
                    <Marker key={t.id} position={[t.lat as number, t.lng as number]}>
                      <Popup>
                        <div className="text-sm">
                          <div><b>Vehicle:</b> {vehicleLabel(v)}</div>
                          <div><b>Device:</b> {t.deviceId ?? "-"}</div>
                          <div><b>Time:</b> {t.ts ?? "-"}</div>
                          <div><b>Lat/Lng:</b> {t.lat}, {t.lng}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

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
                  <td colSpan={6} className="p-6 text-center">Loading…</td>
                </tr>
              ) : visible.length ? (
                visible.map((t) => {
                  const v = t.deviceId ? vehicleByDeviceId.get(t.deviceId.trim()) : undefined;

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
                  <td colSpan={6} className="p-6 text-center text-gray-500">No telemetry data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Protected>
  );
}
