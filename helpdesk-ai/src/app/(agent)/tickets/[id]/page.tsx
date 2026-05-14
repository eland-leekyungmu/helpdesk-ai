"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Ticket, Message, User, UserRole } from "@/shared/types";
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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [assignComment, setAssignComment] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [suggestedAgent, setSuggestedAgent] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("agent_l1");

  useEffect(() => {
    // JWT에서 역할 추출
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.role || "agent_l1");
        // 2차 처리자는 Private 전용
        if (payload.role === "agent_l2") {
          setReplyVisibility("private");
        }
      } catch {}
    }
    fetchTicketDetail();
  }, [ticketId]);

  const fetchTicketDetail = () => {
    getTicketDetail(ticketId)
      .then(({ ticket, messages }) => {
        setTicket(ticket);
        setMessages(messages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      await addMessage(ticketId, replyContent, replyVisibility);
      setReplyContent("");
      fetchTicketDetail();
    } catch {}
    setSending(false);
  };

  const openAssignModal = async () => {
    try {
      const agentList = await getAgents();
      setAgents(agentList);
    } catch {}
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedAgent) return;
    try {
      const token = localStorage.getItem("auth_token");
      await fetch("/api/tickets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ticketId, assignedTo: selectedAgent, comment: assignComment }),
      });
    } catch {}
    setShowAssignModal(false);
    setAssignComment("");
    fetchTicketDetail();
  };

  const handleReject = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      await fetch("/api/tickets/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ticketId, reason: rejectReason, suggestedUserId: suggestedAgent || undefined }),
      });
    } catch {}
    setShowRejectModal(false);
    setRejectReason("");
    setSuggestedAgent("");
    fetchTicketDetail();
  };

  const openRejectModal = async () => {
    try {
      const agentList = await getAgents();
      setAgents(agentList);
    } catch {}
    setShowRejectModal(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>;
  if (!ticket) return <div className="text-center py-8 text-gray-500">티켓을 찾을 수 없습니다.</div>;

  const isL1 = userRole === "agent_l1";
  const isL2 = userRole === "agent_l2";

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        description={`#${ticket.ticketNumber} · 요청자: ${ticket.requester?.name || "알 수 없음"}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            {/* 1차 처리자: 2차 분배 버튼 */}
            {isL1 && <Button variant="secondary" size="sm" onClick={openAssignModal}>2차 분배</Button>}
            {/* 2차 처리자: 본인 아님 버튼 */}
            {isL2 && <Button variant="danger" size="sm" onClick={openRejectModal}>본인 아님</Button>}
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
            {/* 1차 처리자만 Public/Private 토글 가능 */}
            {isL1 && (
              <div className="flex gap-1">
                <button onClick={() => setReplyVisibility("public")} className={`px-2 py-1 text-xs rounded ${replyVisibility === "public" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>Public</button>
                <button onClick={() => setReplyVisibility("private")} className={`px-2 py-1 text-xs rounded ${replyVisibility === "private" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>Private</button>
              </div>
            )}
            {/* 2차 처리자는 Private 고정 표시 */}
            {isL2 && (
              <span className="px-2 py-1 text-xs rounded bg-purple-600 text-white">Private</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReply} className="space-y-3">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={isL2 ? "답변을 작성하세요 (AI가 가공하여 요청자에게 전달됩니다)..." : replyVisibility === "public" ? "요청자에게 전달될 답변을 작성하세요..." : "내부 메모를 작성하세요 (요청자에게 보이지 않음)..."}
              required
            />
            <Button type="submit" loading={sending}>
              {isL2 ? "답변 저장 (Private)" : replyVisibility === "public" ? "답변 전송" : "내부 메모 저장"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2차 분배 모달 (1차 처리자 전용) */}
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

      {/* 본인 아님 모달 (2차 처리자 전용) */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader><h3 className="text-lg font-semibold">본인 업무 아님</h3></CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="사유 (선택)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="본인 업무가 아닌 이유를 입력하세요..."
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">다른 담당자 추천 (선택)</label>
                <select value={suggestedAgent} onChange={(e) => setSuggestedAgent(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="">선택 안 함 (AI가 재분배)</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name} ({agent.team?.name})</option>
                  ))}
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowRejectModal(false)}>취소</Button>
                <Button variant="danger" onClick={handleReject}>본인 아님 처리</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
