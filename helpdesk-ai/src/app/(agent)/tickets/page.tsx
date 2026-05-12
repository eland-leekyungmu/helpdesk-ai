"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket } from "@/shared/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/layout";

export default function AgentTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/tickets/assigned?filter=${filter}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="담당 티켓" description="나에게 배정된 티켓 목록" />

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        {(["active", "all", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f === "active" && "진행중"}
            {f === "all" && "전체"}
            {f === "resolved" && "해결됨"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-8">배정된 티켓이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
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
