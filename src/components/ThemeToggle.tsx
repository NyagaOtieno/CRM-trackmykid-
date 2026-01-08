// src/components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="mt-4 p-3 bg-gray-200 dark:bg-gray-800 rounded-lg text-center"
    >
      {dark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
