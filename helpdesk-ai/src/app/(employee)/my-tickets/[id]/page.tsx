"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Ticket, Message } from "@/shared/types";
import { StatusBadge } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicketDetail();
  }, [ticketId]);

  const fetchTicketDetail = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setTicket(data.data.ticket);
        setMessages(data.data.messages);
      }
    } catch {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, rating: "positive" | "negative") => {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, rating }),
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>;
  }

  if (!ticket) {
    return <div className="text-center py-8 text-gray-500">티켓을 찾을 수 없습니다.</div>;
  }

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        description={`#${ticket.ticketNumber} · ${new Date(ticket.createdAt).toLocaleDateString("ko-KR")}`}
        actions={<StatusBadge status={ticket.status} />}
      />

      {/* 메시지 이력 (Public만 표시) */}
      <div className="space-y-4">
        {messages.map((msg) => (
          <Card key={msg.id} className={msg.senderType === "ai" ? "border-blue-200 bg-blue-50/30" : ""}>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {msg.senderType === "user" && "나"}
                  {msg.senderType === "ai" && "🤖 AI"}
                  {msg.senderType === "agent_l1" && "상담원"}
                  {msg.senderType === "agent_l2" && "담당자"}
                  {msg.senderType === "system" && "시스템"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>

              {/* 첨부파일 */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {msg.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📎 {att.filename}
                    </a>
                  ))}
                </div>
              )}

              {/* AI 답변에 대한 피드백 */}
              {msg.senderType === "ai" && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">도움이 되었나요?</span>
                  <button onClick={() => handleFeedback(msg.id, "positive")} className="text-sm hover:bg-green-50 rounded p-1" aria-label="도움이 됨">👍</button>
                  <button onClick={() => handleFeedback(msg.id, "negative")} className="text-sm hover:bg-red-50 rounded p-1" aria-label="도움이 안 됨">👎</button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
