"use client";

import { Sidebar } from "@/components/layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TODO: 실제 사용자 정보는 세션에서 가져옴
  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" userName="최관리" />
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
