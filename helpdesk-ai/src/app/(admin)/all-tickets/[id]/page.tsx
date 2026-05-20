"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Ticket, Message } from "@/shared/types";
import { StatusBadge, VisibilityBadge, PriorityBadge } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getTicketDetail } from "@/lib/api";

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTicketDetail(ticketId)
      .then(({ ticket, messages }) => {
        setTicket(ticket);
        setMessages(messages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>;
  if (!ticket) return <div className="text-center py-8 text-gray-500">티켓을 찾을 수 없습니다.</div>;

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        description={`#${ticket.ticketNumber} · 요청자: ${ticket.requester?.name || "알 수 없음"} · ${new Date(ticket.createdAt).toLocaleDateString("ko-KR")}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        }
      />

      {/* 티켓 정보 */}
      <Card className="mb-4">
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">담당자</span>
              <p className="font-medium">
                {(ticket as any).assignedToName || ticket.assignee?.name
                  ? ((ticket as any).assignedToName || ticket.assignee?.name)
                  : ticket.assignedTo
                  ? "배정됨"
                  : ticket.status === "open" || ticket.status === "in_progress"
                  ? "IT 헬프데스크"
                  : "미배정"}
              </p>
            </div>
            <div><span className="text-gray-500">접수 경로</span><p className="font-medium">{ticket.createdVia === "web" ? "웹" : "이메일"}</p></div>
            <div><span className="text-gray-500">신뢰도</span><p className="font-medium">{ticket.confidenceScore ? `${(ticket.confidenceScore * 100).toFixed(0)}%` : "-"}</p></div>
            <div><span className="text-gray-500">해결 유형</span><p className="font-medium">{ticket.resolutionType || "-"}</p></div>
          </div>
          {ticket.category && (
            <div className="mt-3 flex gap-1">
              {ticket.category.map((cat) => (
                <span key={cat} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{cat}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 메시지 이력 (Public + Private 모두) */}
      <h2 className="text-lg font-semibold mb-3">메시지 이력</h2>
      <div className="space-y-3">
        {messages.length === 0 ? (
          <Card><CardContent><p className="text-gray-500 text-center py-4">메시지가 없습니다.</p></CardContent></Card>
        ) : (
          messages.map((msg) => (
            <Card
              key={msg.id}
              className={
                msg.visibility === "private" ? "border-purple-200 bg-purple-50/30"
                : msg.senderType === "ai" ? "border-blue-200 bg-blue-50/30" : ""
              }
            >
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {msg.senderType === "user" && `👤 ${ (msg as any).senderName || msg.sender?.name || "요청자"}`}
                    {msg.senderType === "ai" && "🤖 AI"}
                    {msg.senderType === "agent_l1" && `🟢 ${(msg as any).senderName || msg.sender?.name || "1차 처리자"}`}
                    {msg.senderType === "agent_l2" && `🔵 ${(msg as any).senderName || msg.sender?.name || "2차 처리자"}`}
                    {msg.senderType === "system" && "⚙️ 시스템"}
                  </span>
                  <VisibilityBadge visibility={msg.visibility} />
                  <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString("ko-KR")}</span>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
