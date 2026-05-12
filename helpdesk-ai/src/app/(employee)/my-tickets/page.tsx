"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Ticket } from "@/shared/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/layout";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tickets/my");
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>;
  }

  return (
    <div>
      <PageHeader title="내 문의 목록" description="접수한 문의의 처리 현황을 확인하세요." />

      {tickets.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-8">접수된 문의가 없습니다.</p>
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
                      {ticket.category && (
                        <div className="flex gap-1 mt-1">
                          {ticket.category.map((cat) => (
                            <span key={cat} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{new Date(ticket.createdAt).toLocaleDateString("ko-KR")}</p>
                      <p className="text-xs">{new Date(ticket.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</p>
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
