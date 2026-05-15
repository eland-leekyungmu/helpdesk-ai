"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Ticket, Message } from "@/shared/types";
import { StatusBadge, Card, CardContent, SkeletonList, useToast, AttachmentList } from "@/components/ui";
import type { AttachmentItem } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getTicketDetail, submitFeedback } from "@/lib/api";
import { Sparkles, ThumbsUp, ThumbsDown, User, Headphones, Bot } from "lucide-react";

const senderConfig = {
  user:     { label: "나",     icon: <User size={14} />,       bubble: "bg-indigo-600 text-white ml-auto",  wrapper: "items-end" },
  ai:       { label: "AI",     icon: <Bot size={14} />,        bubble: "bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 text-gray-800", wrapper: "items-start" },
  agent_l1: { label: "상담원", icon: <Headphones size={14} />, bubble: "bg-white border border-gray-200 text-gray-800", wrapper: "items-start" },
  agent_l2: { label: "담당자", icon: <Headphones size={14} />, bubble: "bg-white border border-gray-200 text-gray-800", wrapper: "items-start" },
  system:   { label: "시스템", icon: null,                     bubble: "bg-gray-100 text-gray-600 text-xs mx-auto", wrapper: "items-center" },
} as const;

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackDone, setFeedbackDone] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    getTicketDetail(ticketId).then(({ ticket, messages }) => {
      setTicket(ticket);
      setMessages(messages.filter((m) => m.visibility === "public"));
      setLoading(false);
    });
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFeedback = async (messageId: string, rating: "positive" | "negative") => {
    try {
      await submitFeedback(messageId, rating);
      setFeedbackDone((prev) => new Set(prev).add(messageId));
      showSuccess(rating === "positive" ? "피드백 감사합니다! 😊" : "더 나은 답변을 위해 개선하겠습니다.");
    } catch {
      showError("피드백 전송에 실패했습니다.");
    }
  };

  if (loading) return (
    <div className="animate-fade-in">
      <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6 skeleton" />
      <SkeletonList count={3} />
    </div>
  );

  if (!ticket) return (
    <div className="text-center py-16 text-gray-500">티켓을 찾을 수 없습니다.</div>
  );

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <PageHeader
        title={ticket.subject}
        description={`#${ticket.ticketNumber} · ${new Date(ticket.createdAt).toLocaleDateString("ko-KR")}`}
        actions={<StatusBadge status={ticket.status} />}
      />

      {/* Messages — scrollable */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.map((msg) => {
          const config = senderConfig[msg.senderType as keyof typeof senderConfig] ?? senderConfig.system;
          const isUser = msg.senderType === "user";
          const isAI = msg.senderType === "ai";

          return (
            <div key={msg.id} className={`flex flex-col gap-1 ${config.wrapper}`}>
              {/* Sender label */}
              {!isUser && (
                <div className="flex items-center gap-1.5 px-1">
                  {isAI && (
                    <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-md flex items-center justify-center">
                      <Sparkles size={10} className="text-white" />
                    </div>
                  )}
                  <span className="text-xs text-gray-500 font-medium">{config.label}</span>
                  <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}

              {/* Bubble */}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${config.bubble}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {/* 첨부파일 */}
                {(msg as any).attachments?.length > 0 && (
                  <AttachmentList attachments={(msg as any).attachments as AttachmentItem[]} />
                )}
                {isUser && (
                  <p className="text-xs text-indigo-200 mt-1 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>

              {/* AI Feedback */}
              {isAI && !feedbackDone.has(msg.id) && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-400">도움이 되었나요?</span>
                  <button
                    onClick={() => handleFeedback(msg.id, "positive")}
                    className="p-1 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                    aria-label="도움이 됨"
                  >
                    <ThumbsUp size={13} />
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, "negative")}
                    className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="도움이 안 됨"
                  >
                    <ThumbsDown size={13} />
                  </button>
                </div>
              )}
              {isAI && feedbackDone.has(msg.id) && (
                <p className="text-xs text-gray-400 px-1">피드백 감사합니다 🙏</p>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Resolved notice */}
      {(ticket.status === "resolved" || ticket.status === "closed") && (
        <div className="sticky bottom-0 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-700 text-center">
          ✅ 이 문의는 해결되었습니다.
        </div>
      )}
    </div>
  );
}
