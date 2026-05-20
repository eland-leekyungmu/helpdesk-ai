"use client";

import { Sidebar } from "@/components/layout";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <Sidebar role="employee" userName="김사원" />
      <main className="flex-1 p-6 md:p-8 pt-16 md:pt-8 overflow-auto">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
