"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout";
import { UserRole } from "@/shared/types";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("agent_l1");
  const [name, setName] = useState<string | null>(null); // null = 로딩 중

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "agent_l1");
        // email prefix는 표시하지 않음 — API 응답 전까지 null 유지
      } catch {}
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.success && d.data?.name) setName(d.data.name); })
        .catch(() => { setName("처리자"); }); // API 실패 시 기본값
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <Sidebar role={role} userName={name} />
      <main className="flex-1 p-6 md:p-8 pt-16 md:pt-8 overflow-auto">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
