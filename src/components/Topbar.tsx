// src/components/Topbar.tsx
"use client";

export default function Topbar() {
  return (
    <div className="flex items-center justify-between bg-white shadow px-4 py-3 rounded">
      <div className="text-lg font-semibold">TrackMyKid — Dashboard</div>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="bg-slate-50 px-3 py-1 rounded">3 Vehicles on route</div>
        <div className="bg-slate-50 px-3 py-1 rounded">2 Drivers</div>
        <div className="px-3 py-1">Hello, Admin 👋</div>
      </div>
    </div>
  );
}
