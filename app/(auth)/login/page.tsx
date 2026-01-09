// app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiPost } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [shake, setShake] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [success, setSuccess] = useState(false);

  /* 🌙 System theme */
  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const tryLogin = async (endpoint: string) => {
    return apiPost(endpoint, { email, password });
  };

  const playSound = (type: "success" | "error") => {
    const audio = new Audio(
      type === "success"
        ? "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3"
        : "https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3"
    );
    audio.volume = 0.4;
    audio.play();
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setErrMsg(null);
    setLoading(true);

    try {
      let res;
      try {
        res = await tryLogin("/api/auth/login");
      } catch (err) {
        const status = (err as any)?.status;
        if (status === 404) res = await tryLogin("/auth/login");
        else throw err;
      }

      if (!res || !res.token) throw new Error("Invalid login");

      if (remember) localStorage.setItem("token", res.token);
      else sessionStorage.setItem("token", res.token);

      playSound("success");
      setCelebrate(true);
      setSuccess(true);

      setTimeout(() => {
        router.replace("/dashboard");
      }, 1600);
    } catch (err) {
      playSound("error");
      setErrMsg("Whoops 😅 Invalid email or password");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-4 overflow-hidden">
      {/* 🎉 Celebration */}
      {celebrate && (
        <div className="celebration">
          {Array.from({ length: 25 }).map((_, i) => (
            <span key={i}>{i % 2 === 0 ? "🎉" : "🌸"}</span>
          ))}
        </div>
      )}

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg">
            <Image src="/logo.png" alt="TrackMyKid CRM" width={64} height={64} />
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleLogin}
          className={`glass-card rounded-2xl p-6 sm:p-8 space-y-5 ${
            shake ? "shake" : ""
          }`}
        >
          {!success ? (
            <>
              <h2 className="text-xl sm:text-2xl font-semibold text-white text-center">
                Sign in to your account
              </h2>

              <p className="text-sm text-center text-blue-100">
                Welcome back 👋
              </p>

              {errMsg && (
                <div className="rounded-lg bg-red-500/20 border border-red-400 text-red-100 px-4 py-2 text-sm">
                  {errMsg}
                </div>
              )}

              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />

              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />

              {/* Remember me */}
              <label className="flex items-center gap-2 text-sm text-blue-100">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                />
                Remember me
              </label>

              <div className="flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm text-blue-200 hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-btn"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </>
          ) : (
            /* ✅ Success animation */
            <div className="success">
              <div className="checkmark">✓</div>
              <p className="text-blue-100 mt-3">Login successful!</p>
            </div>
          )}
        </form>

        <p className="text-center text-xs text-blue-100 mt-6">
          © {new Date().getFullYear()} TrackMyKid CRM
        </p>
      </div>

      {/* 🎨 Styles */}
      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        }

        .input {
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.9);
          outline: none;
        }

        .login-btn {
          width: 100%;
          padding: 0.7rem;
          border-radius: 0.75rem;
          background: #2563eb;
          color: white;
          font-weight: 500;
          position: relative;
          overflow: hidden;
        }

        .login-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.2);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .login-btn:active::after {
          opacity: 1;
        }

        .shake {
          animation: shake 0.4s;
        }

        @keyframes shake {
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out both;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .celebration span {
          position: fixed;
          top: -10%;
          animation: fall 1.5s linear forwards;
          font-size: 1.5rem;
          left: calc(100% * var(--i));
        }

        @keyframes fall {
          to {
            transform: translateY(120vh) rotate(360deg);
            opacity: 0;
          }
        }

        .success {
          text-align: center;
        }

        .checkmark {
          font-size: 3rem;
          color: #22c55e;
          animation: pop 0.5s ease-out;
        }

        @keyframes pop {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
