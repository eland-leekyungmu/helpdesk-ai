"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket } from "@/shared/types";
import { StatusBadge, PriorityBadge, Card, CardContent, EmptyState, SkeletonList } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getQueueTickets } from "@/lib/api";
import { ChevronRight, Clock, Brain, RefreshCw } from "lucide-react";

export default function QueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const data = await getQueueTickets();
    setTickets(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="미처리 큐"
        description={loading ? "로딩 중..." : `AI가 처리하지 못한 문의 ${tickets.length}건`}
        actions={
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            새로고침
          </button>
        }
      />

      {loading ? (
        <SkeletonList count={4} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="처리 대기 중인 문의가 없습니다"
          description="모든 문의가 처리되었습니다. 수고하셨습니다! 🎉"
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
                        {ticket.confidenceScore !== null && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                            <Brain size={10} />
                            {(ticket.confidenceScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">요청자: {(ticket as any).requesterName || ticket.requester?.name || "알 수 없음"}</span>
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
