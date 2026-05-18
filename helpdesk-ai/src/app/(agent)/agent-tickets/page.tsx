"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket, TicketStatus } from "@/shared/types";
import { StatusBadge, PriorityBadge, Card, CardContent, EmptyState, SkeletonList } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { ChevronRight, Clock, RefreshCw } from "lucide-react";

async function getAllTickets(status?: string): Promise<Ticket[]> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const params = status && status !== "all" ? `?status=${status}` : "";
    // agent_l1도 admin/tickets API에 접근 가능 (withRole에서 agent_l1 허용)
    const res = await fetch(`/api/admin/tickets${params}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    if (!json.success) return [];
    return json.data?.items || json.data || [];
  } catch {
    return [];
  }
}

const STATUS_FILTERS = [
  { value: "all",         label: "전체" },
  { value: "open",        label: "접수" },
  { value: "in_progress", label: "진행중" },
  { value: "resolved",    label: "해결" },
  { value: "closed",      label: "종료" },
] as const;

export default function AgentAllTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");

  const fetchTickets = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    const data = await getAllTickets(filter === "all" ? undefined : filter);
    setTickets(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="전체 티켓"
        description="모든 접수된 티켓을 조회하고 처리할 수 있습니다."
        actions={
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:text-violet-600 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            새로고침
          </button>
        }
      />

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as TicketStatus | "all")}
            className={`
              shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
              ${filter === f.value
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-violet-300 hover:text-violet-600"
              }
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : tickets.length === 0 ? (
        <EmptyState title="티켓이 없습니다" description="해당 조건의 티켓이 없습니다." />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            // 처리자 상세 화면으로 연결 (분배 등 처리 가능)
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
              <Card hoverable>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-mono text-gray-400">#{ticket.ticketNumber}</span>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          요청자: {(ticket as any).requesterName || ticket.requester?.name || "알 수 없음"}
                          {((ticket as any).assignedToName || ticket.assignee?.name)
                            ? ` · 담당: ${(ticket as any).assignedToName || ticket.assignee?.name}`
                            : !ticket.assignedTo && (ticket.status === "open" || ticket.status === "in_progress")
                            ? " · 담당: IT 헬프데스크"
                            : ""}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={10} />
                          {new Date(ticket.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
