"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/shared/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navByRole: Record<UserRole, NavItem[]> = {
  employee: [
    { href: "/new-ticket", label: "새 문의", icon: "✏️" },
    { href: "/my-tickets", label: "내 문의 목록", icon: "📋" },
  ],
  agent_l1: [
    { href: "/queue", label: "미처리 큐", icon: "📥" },
    { href: "/tickets", label: "담당 티켓", icon: "📋" },
  ],
  agent_l2: [
    { href: "/tickets", label: "배정된 티켓", icon: "📋" },
  ],
  admin: [
    { href: "/dashboard", label: "대시보드", icon: "📊" },
    { href: "/statistics", label: "통계", icon: "📈" },
    { href: "/users", label: "사용자 관리", icon: "👥" },
    { href: "/settings", label: "설정", icon: "⚙️" },
  ],
};

interface SidebarProps {
  role: UserRole;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">IT Help Desk</h1>
        <p className="text-sm text-gray-400 mt-1">{userName}</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => { window.location.href = "/login"; }}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
