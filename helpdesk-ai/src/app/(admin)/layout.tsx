"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<string | null>(null); // null = 로딩 중

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.success && d.data?.name) setName(d.data.name); })
        .catch(() => { setName("관리자"); });
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <Sidebar role="admin" userName={name} />
      <main className="flex-1 p-6 md:p-8 pt-16 md:pt-8 overflow-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
