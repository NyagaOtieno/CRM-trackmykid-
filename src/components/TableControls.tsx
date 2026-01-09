"use client";

export interface TableControlsProps {
  title: string;
  query?: string;
  setQuery?: (value: string) => void;
  onSearch?: (value: string) => void;
  onRefresh?: () => void;
  page?: number;
  setPage?: (page: number) => void;
  totalPages?: number;
  onAdd?: () => void;
}

export default function TableControls({
  title,
  query = "",
  setQuery,
  onSearch,
  onRefresh,
  page = 1,
  setPage,
  totalPages = 1,
  onAdd,
}: TableControlsProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Page Title */}
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="flex items-center gap-3">
        {/* Search Box */}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery?.(e.target.value);
            onSearch?.(e.target.value);
          }}
          placeholder="Search..."
          className="border rounded-lg px-4 py-2 w-64"
        />

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>

        {/* Add Button */}
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Add
          </button>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage?.(page - 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
        >
          Prev
        </button>

        <span>
          Page <b>{page}</b> of <b>{totalPages}</b>
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage?.(page + 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
