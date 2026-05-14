"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket } from "@/shared/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getQueueTickets } from "@/lib/api";

export default function QueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQueueTickets().then((data) => { setTickets(data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>;

  return (
    <div>
      <PageHeader title="미처리 큐" description={`AI가 처리하지 못한 문의 ${tickets.length}건`} />

      {tickets.length === 0 ? (
        <Card><CardContent><p className="text-center text-gray-500 py-8">처리 대기 중인 문의가 없습니다. 🎉</p></CardContent></Card>
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
                        {ticket.confidenceScore !== null && (
                          <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            신뢰도: {(ticket.confidenceScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                      <p className="text-sm text-gray-500 mt-1">요청자: {ticket.requester?.name || "알 수 없음"}</p>
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
