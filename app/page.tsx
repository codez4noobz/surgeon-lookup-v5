"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="w-8 h-8 bg-white rounded-sm mb-8" />
          <h1 className="text-2xl font-semibold tracking-tight text-[#f5f5f5]">
            SurgeonScope
          </h1>
          <p className="text-[#737373] text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#111111] border border-[#222222] rounded-md px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#444444] focus:border-[#444444] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[#111111] border border-[#222222] rounded-md px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#444444] focus:border-[#444444] transition-colors"
          />

          {error && (
            <p className="text-red-400 text-xs pt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black rounded-md py-3 text-sm font-medium hover:bg-[#e5e5e5] transition-colors disabled:opacity-40 mt-2"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
