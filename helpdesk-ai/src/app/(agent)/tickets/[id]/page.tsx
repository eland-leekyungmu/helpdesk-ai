"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Ticket, Message, User } from "@/shared/types";
import { Button, Textarea } from "@/components/ui";
import { StatusBadge, VisibilityBadge } from "@/components/ui";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getTicketDetail, getAgents, addMessage } from "@/lib/api";

export default function AgentTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [replyVisibility, setReplyVisibility] = useState<"public" | "private">("public");
  const [sending, setSending] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [assignComment, setAssignComment] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  useEffect(() => {
    getTicketDetail(ticketId).then(({ ticket, messages }) => {
      setTicket(ticket);
      setMessages(messages); // 처리자는 Public + Private 모두 볼 수 있음
      setLoading(false);
    });
  }, [ticketId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSending(true);
    await addMessage(ticketId, replyContent, replyVisibility);
    // 목업: 메시지 추가 시뮬레이션
    setMessages((prev) => [...prev, {
      id: `m-${Date.now()}`, ticketId, senderId: "u2", senderType: "agent_l1",
      visibility: replyVisibility, content: replyContent, contentType: "text",
      attachments: null, source: "web", createdAt: new Date().toISOString(),
    }]);
    setReplyContent("");
    setSending(false);
  };

  const openAssignModal = async () => {
    const agentList = await getAgents();
    setAgents(agentList);
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedAgent) return;
    alert(`${agents.find(a => a.id === selectedAgent)?.name}에게 분배되었습니다.`);
    setShowAssignModal(false);
    setAssignComment("");
  };

  const handleReject = () => {
    alert("'본인 아님' 처리되었습니다. AI가 재분배합니다.");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>;
  if (!ticket) return <div className="text-center py-8 text-gray-500">티켓을 찾을 수 없습니다.</div>;

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        description={`#${ticket.ticketNumber} · 요청자: ${ticket.requester?.name || "알 수 없음"}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <Button variant="secondary" size="sm" onClick={openAssignModal}>2차 분배</Button>
            <Button variant="danger" size="sm" onClick={handleReject}>본인 아님</Button>
          </div>
        }
      />

      {/* 메시지 이력 */}
      <div className="space-y-3 mb-6">
        {messages.map((msg) => (
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
                  {msg.senderType === "user" && `👤 ${msg.sender?.name || "요청자"}`}
                  {msg.senderType === "ai" && "🤖 AI"}
                  {msg.senderType === "agent_l1" && `🟢 ${msg.sender?.name || "1차 처리자"}`}
                  {msg.senderType === "agent_l2" && `🔵 ${msg.sender?.name || "2차 처리자"}`}
                  {msg.senderType === "system" && "⚙️ 시스템"}
                </span>
                <VisibilityBadge visibility={msg.visibility} />
                <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString("ko-KR")}</span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 답변 입력 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">답변 작성</span>
            <div className="flex gap-1">
              <button onClick={() => setReplyVisibility("public")} className={`px-2 py-1 text-xs rounded ${replyVisibility === "public" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>Public</button>
              <button onClick={() => setReplyVisibility("private")} className={`px-2 py-1 text-xs rounded ${replyVisibility === "private" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>Private</button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReply} className="space-y-3">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={replyVisibility === "public" ? "요청자에게 전달될 답변을 작성하세요..." : "내부 메모를 작성하세요 (요청자에게 보이지 않음)..."}
              required
            />
            <Button type="submit" loading={sending}>
              {replyVisibility === "public" ? "답변 전송" : "내부 메모 저장"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 분배 모달 */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader><h3 className="text-lg font-semibold">2차 처리자 분배</h3></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">담당자 선택</label>
                <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">선택하세요</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name} ({agent.team?.name})</option>
                  ))}
                </select>
              </div>
              <Textarea label="이관 메시지 (선택)" value={assignComment} onChange={(e) => setAssignComment(e.target.value)} placeholder="2차 처리자에게 전달할 메시지..." />
            </CardContent>
            <CardFooter>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowAssignModal(false)}>취소</Button>
                <Button onClick={handleAssign} disabled={!selectedAgent}>분배</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
