// src/lib/auth.ts
export interface LoginResponse {
  token: string;
}

export async function loginUser(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return false;
    }

    const data: LoginResponse = await res.json();
    localStorage.setItem("token", data.token); // store JWT
    return true;
  } catch (err) {
    console.error("Login error:", err);
    return false;
  }
}

// Helper to get token
export function getToken(): string | null {
  return localStorage.getItem("token");
}
