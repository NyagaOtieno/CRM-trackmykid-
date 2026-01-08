// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const tryLogin = async (endpoint: string) => {
    // wrapper so we try endpoint variants (some backends are /auth/login others /api/auth/login)
    return apiPost(endpoint, { email, password });
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setErrMsg(null);
    setLoading(true);
    try {
      // try likely endpoints in order
      let res;
      try {
        res = await tryLogin("/api/auth/login");
      } catch (err) {
        // if 404 or not found, try without /api prefix
        const status = (err as any)?.status;
        if (status === 404) {
          res = await tryLogin("/auth/login");
        } else {
          throw err;
        }
      }

      if (!res || !res.token) throw new Error("Invalid login response (no token).");

      // Save token
      localStorage.setItem("token", res.token);

      // Redirect to dashboard
      router.replace("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setErrMsg(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Login</h1>

        {errMsg && <div className="mb-3 text-red-500">{errMsg}</div>}

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 mb-3 border rounded dark:bg-gray-700 dark:text-white"
        />

        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
