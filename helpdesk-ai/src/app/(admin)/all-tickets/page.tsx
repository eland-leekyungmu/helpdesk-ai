"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket, TicketStatus } from "@/shared/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/layout";

async function getAllTickets(status?: string): Promise<Ticket[]> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const params = status && status !== "all" ? `?status=${status}` : "";
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

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");

  useEffect(() => {
    setLoading(true);
    getAllTickets(filter === "all" ? undefined : filter).then((data) => {
      setTickets(data);
      setLoading(false);
    });
  }, [filter]);

  return (
    <div>
      <PageHeader title="전체 티켓" description="모든 접수된 티켓을 조회합니다." />

      {/* 상태 필터 */}
      <div className="flex gap-2 mb-4">
        {(["all", "open", "in_progress", "resolved", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s === "all" && "전체"}
            {s === "open" && "접수"}
            {s === "in_progress" && "진행중"}
            {s === "resolved" && "해결"}
            {s === "closed" && "종료"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>
      ) : tickets.length === 0 ? (
        <Card><CardContent><p className="text-center text-gray-500 py-8">티켓이 없습니다.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/all-tickets/${ticket.id}`}>
              <Card className="hover:border-blue-300 transition-colors cursor-pointer">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">#{ticket.ticketNumber}</span>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        요청자: {ticket.requester?.name || "알 수 없음"}
                        {ticket.assignee && ` · 담당: ${ticket.assignee.name}`}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{new Date(ticket.createdAt).toLocaleDateString("ko-KR")}</p>
                    </div>
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
