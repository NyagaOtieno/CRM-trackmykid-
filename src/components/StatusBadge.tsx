"use client";

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    resolved: "bg-blue-100 text-blue-800",
    pending: "bg-yellow-100 text-yellow-800",
    warning: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
    default: "bg-gray-100 text-gray-800",
  };

  const normalized = status?.toLowerCase() || "default";

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold ${
        colors[normalized] || colors.default
      }`}
    >
      {status}
    </span>
  );
}
