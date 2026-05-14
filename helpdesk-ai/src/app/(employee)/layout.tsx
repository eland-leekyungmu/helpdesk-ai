"use client";

import { Sidebar } from "@/components/layout";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  // TODO: 실제 사용자 정보는 세션에서 가져옴
  return (
    <div className="flex min-h-screen">
      <Sidebar role="employee" userName="김사원" />
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  );
}
