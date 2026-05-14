"use client";

import { Sidebar } from "@/components/layout";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  // TODO: 실제 사용자 정보는 세션에서 가져옴 (agent_l1 또는 agent_l2)
  return (
    <div className="flex min-h-screen">
      <Sidebar role="agent_l1" userName="박상담" />
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
