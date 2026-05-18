"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket } from "@/shared/types";
import { StatusBadge, PriorityBadge, Card, CardContent, EmptyState, SkeletonList } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getAssignedTickets } from "@/lib/api";
import { ChevronRight, Clock } from "lucide-react";

const FILTERS = [
  { value: "active",   label: "진행중" },
  { value: "all",      label: "전체" },
  { value: "resolved", label: "해결됨" },
] as const;

export default function AgentTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");

  useEffect(() => {
    setLoading(true);
    getAssignedTickets(filter)
      .then((data) => { setTickets(data); setLoading(false); })
      .catch(() => { setTickets([]); setLoading(false); });
  }, [filter]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="담당 티켓" description="나에게 배정된 티켓 목록" />

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`
              px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
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
        <SkeletonList count={4} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="배정된 티켓이 없습니다"
          description={filter === "active" ? "현재 진행 중인 티켓이 없습니다." : "해당 조건의 티켓이 없습니다."}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
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
