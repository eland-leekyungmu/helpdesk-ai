"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PenSquare, ListChecks, Inbox, LayoutDashboard,
  Ticket, BarChart2, Users, Settings, LogOut,
  ChevronRight, Menu, X, Headphones,
} from "lucide-react";
import type { UserRole } from "@/shared/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navByRole: Record<UserRole, NavItem[]> = {
  employee: [
    { href: "/new-ticket",  label: "새 문의",      icon: <PenSquare size={18} /> },
    { href: "/my-tickets",  label: "내 문의 목록",  icon: <ListChecks size={18} /> },
  ],
  agent_l1: [
    { href: "/queue",         label: "미처리 큐",   icon: <Inbox size={18} /> },
    { href: "/tickets",       label: "담당 티켓",   icon: <ListChecks size={18} /> },
    { href: "/agent-tickets", label: "전체 티켓",   icon: <Ticket size={18} /> },
  ],
  agent_l2: [
    { href: "/tickets", label: "배정된 티켓", icon: <ListChecks size={18} /> },
  ],
  admin: [
    { href: "/dashboard",   label: "대시보드",    icon: <LayoutDashboard size={18} /> },
    { href: "/all-tickets", label: "전체 티켓",   icon: <Ticket size={18} /> },
    { href: "/statistics",  label: "통계",        icon: <BarChart2 size={18} /> },
    { href: "/users",       label: "사용자 관리", icon: <Users size={18} /> },
    { href: "/settings",    label: "설정",        icon: <Settings size={18} /> },
  ],
};

const roleLabel: Record<UserRole, string> = {
  employee: "임직원",
  agent_l1: "1차 처리자",
  agent_l2: "2차 처리자",
  admin:    "관리자",
};

const roleAccent: Record<UserRole, string> = {
  employee: "from-indigo-600 to-violet-600",
  agent_l1: "from-violet-600 to-purple-700",
  agent_l2: "from-purple-600 to-fuchsia-700",
  admin:    "from-indigo-700 to-violet-700",
};

interface SidebarProps {
  role: UserRole;
  userName: string | null; // null = 로딩 중 (skeleton 표시)
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role];
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("sidebar-expanded");
    return saved === null ? true : saved === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // 모바일: 라우트 변경 시 닫기
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-expanded", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

  const SidebarContent = () => (
    <div className={`flex flex-col h-full bg-gradient-to-b ${roleAccent[role]} text-white`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${expanded ? "" : "justify-center"}`}>
        <div className="shrink-0 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
          <Headphones size={16} className="text-white" />
        </div>
        {expanded && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold leading-tight">IT Help Desk</p>
            <p className="text-xs text-white/60 leading-tight">{roleLabel[role]}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="메인 메뉴">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150
                ${isActive
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-white/80 hover:bg-white/15 hover:text-white"
                }
                ${expanded ? "" : "justify-center"}
              `}
              title={!expanded ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {expanded && <span className="truncate">{item.label}</span>}
              {expanded && isActive && (
                <ChevronRight size={14} className="ml-auto text-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-2 py-4 border-t border-white/10 space-y-1">
        {expanded && (
          <div className="px-3 py-2 mb-1">
            {userName ? (
              <p className="text-xs text-white/50 truncate">{userName}</p>
            ) : (
              <div className="h-3 w-20 rounded bg-white/20 animate-pulse" />
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
            text-white/70 hover:bg-white/15 hover:text-white
            transition-all duration-150
            ${expanded ? "" : "justify-center"}
          `}
          title={!expanded ? "로그아웃" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {expanded && <span>로그아웃</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out h-screen sticky top-0 z-10 ${expanded ? "w-56" : "w-16"}`}
      >
        <div className={`flex flex-col h-full bg-gradient-to-b ${roleAccent[role]} text-white`}>
          {/* Logo */}
          <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${expanded ? "" : "justify-center"}`}>
            {/* 접힌 상태: 아이콘 클릭 시 펼침 */}
            <button
              onClick={!expanded ? toggleExpanded : undefined}
              className={`shrink-0 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center transition-colors ${!expanded ? "hover:bg-white/30 cursor-pointer" : "cursor-default"}`}
              aria-label={!expanded ? "사이드바 펼치기" : undefined}
              tabIndex={!expanded ? 0 : -1}
            >
              <Headphones size={16} className="text-white" />
            </button>
            {expanded && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold leading-tight">IT Help Desk</p>
                <p className="text-xs text-white/60 leading-tight">{roleLabel[role]}</p>
              </div>
            )}
            {/* 펼친 상태: < 버튼으로 접기 */}
            {expanded && (
              <button
                onClick={toggleExpanded}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                aria-label="사이드바 접기"
              >
                <ChevronRight size={14} className="text-white/70 rotate-180" />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="메인 메뉴">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-150
                    ${isActive
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-white/80 hover:bg-white/15 hover:text-white"
                    }
                    ${expanded ? "" : "justify-center"}
                  `}
                  title={!expanded ? item.label : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {expanded && <span className="truncate">{item.label}</span>}
                  {expanded && isActive && (
                    <ChevronRight size={14} className="ml-auto text-indigo-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User + Logout */}
          <div className="px-2 py-4 border-t border-white/10 space-y-1">
            {expanded && (
              <div className="px-3 py-2 mb-1">
                {userName ? (
                  <p className="text-xs text-white/50 truncate">{userName}</p>
                ) : (
                  <div className="h-3 w-20 rounded bg-white/20 animate-pulse" />
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                text-white/70 hover:bg-white/15 hover:text-white
                transition-all duration-150
                ${expanded ? "" : "justify-center"}
              `}
              title={!expanded ? "로그아웃" : undefined}
            >
              <LogOut size={18} className="shrink-0" />
              {expanded && <span>로그아웃</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile: Hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="메뉴 열기"
      >
        <Menu size={18} />
      </button>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 flex flex-col">
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
              onClick={() => setMobileOpen(false)}
              aria-label="메뉴 닫기"
            >
              <X size={20} />
            </button>
            <div className="h-full">
              {/* Mobile에서는 항상 expanded */}
              <div className={`flex flex-col h-full bg-gradient-to-b ${roleAccent[role]} text-white`}>
                <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
                  <div className="shrink-0 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    <Headphones size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight">IT Help Desk</p>
                    <p className="text-xs text-white/60 leading-tight">{roleLabel[role]}</p>
                  </div>
                </div>
                <nav className="flex-1 px-2 py-4 space-y-0.5">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                          transition-all duration-150
                          ${isActive ? "bg-white text-indigo-700 shadow-sm" : "text-white/80 hover:bg-white/15 hover:text-white"}
                        `}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                        {isActive && <ChevronRight size={14} className="ml-auto text-indigo-400" />}
                      </Link>
                    );
                  })}
                </nav>
                <div className="px-2 py-4 border-t border-white/10">
                  <div className="px-3 py-2 mb-1">
                    {userName ? (
                      <p className="text-xs text-white/50 truncate">{userName}</p>
                    ) : (
                      <div className="h-3 w-20 rounded bg-white/20 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
