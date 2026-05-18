"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket } from "@/shared/types";
import { StatusBadge, PriorityBadge, Card, CardContent, EmptyState, SkeletonList } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getMyTickets } from "@/lib/api";
import { ChevronRight, Clock, PenSquare } from "lucide-react";

const STATUS_FILTERS = [
  { value: "",            label: "전체" },
  { value: "open",        label: "접수" },
  { value: "in_progress", label: "진행중" },
  { value: "resolved",    label: "해결" },
  { value: "closed",      label: "종료" },
] as const;

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    getMyTickets().then((data) => {
      setTickets(data);
      setLoading(false);
    });
  }, []);

  const filtered = statusFilter
    ? tickets.filter((t) => t.status === statusFilter)
    : tickets;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="내 문의 목록"
        description="접수한 문의의 처리 현황을 확인하세요."
      />

      {/* Status Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`
              shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
              ${statusFilter === f.value
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              }
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={statusFilter ? "해당 상태의 문의가 없습니다" : "아직 문의가 없어요"}
          description={statusFilter ? "다른 상태를 선택해보세요." : "첫 문의를 접수해보세요. AI가 빠르게 답변해 드립니다."}
          action={!statusFilter ? { label: "문의하기", onClick: () => router.push("/new-ticket") } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <Link key={ticket.id} href={`/my-tickets/${ticket.id}`}>
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
                      {ticket.category && ticket.category.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {ticket.category.slice(0, 3).map((cat) => (
                            <span key={cat} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        <span>{new Date(ticket.createdAt).toLocaleDateString("ko-KR")}</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* FAB — 새 문의 */}
      <Link
        href="/new-ticket"
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 md:hidden"
        aria-label="새 문의"
      >
        <PenSquare size={22} />
      </Link>
    </div>
  );
}
