"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import brandLogo from "../brand-logo.png";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@noel.local");
  const [password, setPassword] = useState("NoelDev-2026-ChangeMe");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || "Đăng nhập không thành công");
      setLoading(false);
      return;
    }
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] px-4 py-10 text-[#302a25]">
      <section className="mx-auto max-w-md rounded-3xl border border-[#eadfd2] bg-white p-8 shadow-xl shadow-[#6b4b2a]/10">
        <div className="mb-8 flex items-center gap-3">
          <Image src={brandLogo} alt="Logo Tiệm nhà Noel" priority className="h-16 w-16 rounded-full border border-[#eadfd2] object-cover" />
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a47d59]">Tiệm nhà Noel</p><h1 className="text-2xl font-bold">Đăng nhập quản trị</h1></div>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm font-semibold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded2c5] px-4 py-3 outline-none focus:border-[#6b4b2a]" /></label>
          <label className="block text-sm font-semibold">Mật khẩu<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded2c5] px-4 py-3 outline-none focus:border-[#6b4b2a]" /></label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6b4b2a] px-4 py-3 font-bold text-white transition hover:bg-[#53391f] disabled:opacity-60">{loading && <Loader2 size={17} className="animate-spin" />}Đăng nhập</button>
        </form>
        <p className="mt-6 text-xs leading-5 text-[#7a6a5d]">Tài khoản mẫu chỉ dùng cho môi trường development. Hãy đổi mật khẩu trước khi đưa vào vận hành.</p>
      </section>
    </main>
  );
}
