"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout";
import { UserRole } from "@/shared/types";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("agent_l1");
  const [name, setName] = useState("처리자");

  useEffect(() => {
    // JWT에서 사용자 정보 추출 (간단히 /api/auth/me 호출)
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "agent_l1");
        setName(payload.email?.split("@")[0] || "처리자");
      } catch {}
      // 실제 이름은 API에서 가져옴
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.success && d.data?.name) setName(d.data.name); })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userName={name} />
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
