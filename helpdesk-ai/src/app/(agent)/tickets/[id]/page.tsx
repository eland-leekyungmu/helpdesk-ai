"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Ticket, Message, User, UserRole } from "@/shared/types";
import { Button, Textarea, StatusBadge, VisibilityBadge, Card, CardContent, Modal, ModalBody, ModalFooter, SkeletonList, useToast, FileUpload, AttachmentList } from "@/components/ui";
import type { SelectedFile, AttachmentItem } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getTicketDetail, getAgents, addMessage, getUploadUrls, uploadFileToS3 } from "@/lib/api";
import { Send, UserCheck, AlertCircle, Sparkles, Bot, Headphones, User as UserIcon, Settings, Lock, Unlock, History } from "lucide-react";

export default function AgentTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [replyVisibility, setReplyVisibility] = useState<"public" | "private">("public");
  const [sending, setSending] = useState(false);
  const [replyFiles, setReplyFiles] = useState<SelectedFile[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [assignComment, setAssignComment] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [suggestedAgent, setSuggestedAgent] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("agent_l1");
  const [userId, setUserId] = useState<string>("");  // 본인 제외용
  const [showAssignmentHistory, setShowAssignmentHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.role || "agent_l1");
        if (payload.userId) setUserId(payload.userId);
        if (payload.role === "agent_l2") setReplyVisibility("private");
      } catch {}
    }
    fetchTicketDetail();
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      // 첨부파일 업로드
      let attachments: AttachmentItem[] = [];
      if (replyFiles.length > 0) {
        const uploadResults = await getUploadUrls(
          ticketId,
          replyFiles.map((sf) => ({
            filename: sf.file.name,
            mimeType: sf.file.type || "application/octet-stream",
            size: sf.file.size,
          }))
        );
        await Promise.all(
          uploadResults.map((result, i) => uploadFileToS3(result.uploadUrl, replyFiles[i].file))
        );
        attachments = uploadResults.map((r) => ({
          key: r.key,
          filename: r.filename,
          size: r.size,
          mimeType: r.mimeType,
        }));
      }

      await addMessage(ticketId, replyContent, replyVisibility, attachments.length > 0 ? attachments : undefined);
      setReplyContent("");
      setReplyFiles([]);
      showSuccess("답변이 전송되었습니다.");
      fetchTicketDetail();
    } catch {
      showError("답변 전송에 실패했습니다.");
    }
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
      const res = await fetch("/api/tickets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ticketId, assignedTo: selectedAgent, comment: assignComment }),
      });
      if (!res.ok) throw new Error();
      showSuccess("2차 처리자에게 분배되었습니다.");
    } catch {
      showError("분배에 실패했습니다.");
    }
    setShowAssignModal(false);
    setAssignComment("");
    setSelectedAgent("");
    fetchTicketDetail();
  };

  const handleReject = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/tickets/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          ticketId,  // assignmentId 대신 ticketId 전송 (서버에서 active assignment 조회)
          reason: rejectReason,
          suggestedUserId: suggestedAgent || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "처리 실패");
      showSuccess(json.data?.message || "본인 아님 처리되었습니다.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    }
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

  const isL1 = userRole === "agent_l1";
  const isL2 = userRole === "agent_l2";

  if (loading) return (
    <div className="animate-fade-in">
      <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6 skeleton" />
      <SkeletonList count={3} />
    </div>
  );

  if (!ticket) return <div className="text-center py-16 text-gray-500">티켓을 찾을 수 없습니다.</div>;

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <PageHeader
        title={ticket.subject}
        description={`#${ticket.ticketNumber} · 요청자: ${(ticket as any).requesterName || ticket.requester?.name || "알 수 없음"}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            {isL1 && (
              <Button variant="outline" size="sm" onClick={openAssignModal} icon={<UserCheck size={14} />}>
                2차 분배
              </Button>
            )}
            {isL2 && (
              <Button variant="danger" size="sm" onClick={openRejectModal} icon={<AlertCircle size={14} />}>
                본인 아님
              </Button>
            )}
          </div>
        }
      />

      {/* Messages — scrollable */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">

        {/* 배정 이력 — Zendesk/Freshdesk 스타일 Activity Log */}
        {(ticket as any).assignments?.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowAssignmentHistory((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
            >
              <History size={12} />
              배정 이력 {showAssignmentHistory ? "숨기기" : "보기"} ({(ticket as any).assignments.length}건)
            </button>
            {showAssignmentHistory && (
              <div className="border border-gray-100 rounded-2xl bg-gray-50/50 divide-y divide-gray-100 mb-3">
                {[...(ticket as any).assignments]
                  .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((a: any) => {
                    const typeLabel: Record<string, string> = {
                      ai_auto: "AI 자동 배정",
                      manual: "수동 배정",
                      reassign: "재배정",
                    };
                    const statusLabel: Record<string, { label: string; color: string }> = {
                      active:    { label: "처리 중", color: "text-emerald-600" },
                      completed: { label: "완료",   color: "text-gray-400" },
                      rejected:  { label: "거절",   color: "text-red-500" },
                    };
                    const st = statusLabel[a.status] ?? { label: a.status, color: "text-gray-400" };
                    return (
                      <div key={a.id} className="flex items-start gap-3 px-4 py-3 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-700">{a.assignedToName}</span>
                            <span className="text-gray-400">에게 {typeLabel[a.assignmentType] ?? a.assignmentType}</span>
                            {a.assignedByName && (
                              <span className="text-gray-400">by {a.assignedByName}</span>
                            )}
                            <span className={`font-medium ${st.color}`}>[{st.label}]</span>
                          </div>
                          {a.rejectedReason && (
                            <p className="text-gray-400 mt-0.5">거절 사유: {a.rejectedReason}</p>
                          )}
                        </div>
                        <span className="text-gray-400 shrink-0">
                          {new Date(a.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => {
          const isPrivate = msg.visibility === "private";
          const isAI = msg.senderType === "ai";
          const isUser = msg.senderType === "user";

          return (
            <div
              key={msg.id}
              className={`rounded-2xl border p-4 transition-all ${
                isPrivate
                  ? "border-purple-200 bg-purple-50/40"
                  : isAI
                  ? "border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-violet-50/60"
                  : "border-gray-100 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isAI ? "bg-gradient-to-br from-indigo-500 to-violet-500" :
                  isUser ? "bg-gray-200" :
                  isPrivate ? "bg-purple-200" : "bg-violet-200"
                }`}>
                  {isAI ? <Sparkles size={12} className="text-white" /> :
                   isUser ? <UserIcon size={12} className="text-gray-600" /> :
                   <Headphones size={12} className={isPrivate ? "text-purple-600" : "text-violet-600"} />}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {msg.senderType === "user" && "요청자"}
                  {msg.senderType === "ai" && "AI 어시스턴트"}
                  {msg.senderType === "agent_l1" && "1차 처리자"}
                  {msg.senderType === "agent_l2" && "2차 처리자"}
                  {msg.senderType === "system" && "시스템"}
                </span>
                <VisibilityBadge visibility={msg.visibility} />
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(msg.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed pl-8">{msg.content}</p>
              {/* 첨부파일 */}
              {(msg as any).attachments?.length > 0 && (
                <div className="pl-8 mt-1">
                  <AttachmentList attachments={(msg as any).attachments as AttachmentItem[]} />
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply Input — sticky bottom (resolved/closed 또는 본인 담당 아닐 시 숨김) */}
      {ticket.status !== "resolved" && ticket.status !== "closed" && (ticket.assignedTo === userId || isL1) ? (
        <div className="sticky bottom-0 bg-[#f8f9fc] pt-3 pb-2 border-t border-gray-100">
          <form onSubmit={handleReply}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Visibility toggle */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 font-medium">답변 유형</span>
                {isL1 ? (
                  <div className="flex gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => setReplyVisibility("public")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        replyVisibility === "public"
                          ? "bg-indigo-600 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <Unlock size={11} /> Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyVisibility("private")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        replyVisibility === "private"
                          ? "bg-purple-600 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <Lock size={11} /> Private
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700">
                    <Lock size={11} /> Private (AI 가공 후 전달)
                  </span>
                )}
              </div>

              <div className="flex items-end gap-2 p-3">
                <div className="flex-1 space-y-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleReply(e as any);
                    }}
                    placeholder={
                      isL2
                        ? "답변을 작성하세요 (AI가 가공하여 요청자에게 전달됩니다)..."
                        : replyVisibility === "public"
                        ? "요청자에게 전달될 답변을 작성하세요... (Ctrl+Enter로 전송)"
                        : "내부 메모를 작성하세요 (요청자에게 보이지 않음)..."
                    }
                    rows={2}
                    className="w-full resize-none text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
                    required
                  />
                  <FileUpload
                    files={replyFiles}
                    onChange={setReplyFiles}
                    maxCount={10}
                    maxSizeMB={200}
                    disabled={sending}
                  />
                </div>
                <Button
                  type="submit"
                  loading={sending}
                  size="sm"
                  icon={<Send size={14} />}
                  className="shrink-0 self-start"
                >
                  전송
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : ticket.status === "resolved" || ticket.status === "closed" ? (
        <div className="sticky bottom-0 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-700 text-center">
          ✅ 이 티켓은 {ticket.status === "resolved" ? "해결" : "종료"}되었습니다. 추가 답변이 필요하면 관리자에게 문의하세요.
        </div>
      ) : (
        <div className="sticky bottom-0 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700 text-center">
          🔄 이 티켓은 다른 담당자에게 이관되었습니다. 더 이상 답변을 작성할 수 없습니다.
        </div>
      )}

      {/* 2차 분배 모달 */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="2차 처리자 분배">
        <ModalBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">담당자 선택</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">선택하세요</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.team?.name || "팀 미배정"})
                </option>
              ))}
            </select>
          </div>
          <Textarea
            label="이관 메시지 (선택)"
            value={assignComment}
            onChange={(e) => setAssignComment(e.target.value)}
            placeholder="2차 처리자에게 전달할 메시지를 입력하세요..."
            rows={3}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>취소</Button>
          <Button onClick={handleAssign} disabled={!selectedAgent} icon={<UserCheck size={14} />}>분배</Button>
        </ModalFooter>
      </Modal>

      {/* 본인 아님 모달 */}
      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} title="본인 업무 아님">
        <ModalBody className="space-y-4">
          <Textarea
            label="사유 (선택)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="본인 업무가 아닌 이유를 입력하세요..."
            rows={3}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">다른 담당자 추천 (선택)</label>
            <select
              value={suggestedAgent}
              onChange={(e) => setSuggestedAgent(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">선택 안 함 (AI가 재분배)</option>
              {agents
                .filter((agent) => agent.id !== userId)  // 본인 제외
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.team?.name || "팀 미배정"})
                  </option>
                ))}
            </select>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>취소</Button>
          <Button variant="danger" onClick={handleReject} icon={<AlertCircle size={14} />}>본인 아님 처리</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
