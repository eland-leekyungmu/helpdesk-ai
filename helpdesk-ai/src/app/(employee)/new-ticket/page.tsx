"use client";

import { useState } from "react";
import {
  Button, Textarea, Input, Card, CardContent, CardHeader,
  AIProgress, useToast, FileUpload, AttachmentList,
} from "@/components/ui";
import type { SelectedFile, AttachmentItem } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { createTicket, submitFeedback, getUploadUrls, uploadFileToS3 } from "@/lib/api";
import { ThumbsUp, ThumbsDown, Sparkles, RotateCcw, CheckCircle2 } from "lucide-react";

type SubmitStage = "idle" | "submitting" | "uploading" | "ai_processing" | "routing" | "done";

export default function NewTicketPage() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [stage, setStage] = useState<SubmitStage>("idle");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<AttachmentItem[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setStage("submitting");
    setAiResponse(null);

    await new Promise((r) => setTimeout(r, 400));

    try {
      // 1. 티켓 먼저 생성 (ticketId 확보)
      setStage("uploading");

      // 임시 ticketId로 presigned URL 발급 후 업로드
      // 실제로는 티켓 생성 후 ticketId를 받아야 하므로 먼저 생성
      const attachmentMeta: AttachmentItem[] = [];

      // 파일이 있으면 먼저 티켓 생성 후 업로드
      // 여기서는 티켓 생성 → 파일 업로드 → 메시지에 첨부 순서로 처리
      // createTicket API가 attachments를 받으므로 업로드 후 전달

      let attachmentsForApi: { key: string; filename: string; size: number; mimeType: string; url: string }[] = [];

      if (selectedFiles.length > 0) {
        // 임시 ticketId (실제 생성 전이므로 "temp" 사용, 생성 후 이동 가능)
        // 더 나은 방법: 티켓 생성 API에서 ticketId를 먼저 예약하거나
        // 파일 업로드를 티켓 생성 후에 처리
        // 현재 구조상 티켓 생성 후 파일 업로드 → 메시지 업데이트 방식 사용
        // 여기서는 "pending" prefix로 업로드 후 티켓 생성 시 전달
        const tempId = `pending-${Date.now()}`;
        const uploadResults = await getUploadUrls(
          tempId,
          selectedFiles.map((sf) => ({
            filename: sf.file.name,
            mimeType: sf.file.type || "application/octet-stream",
            size: sf.file.size,
          }))
        );

        // S3에 직접 업로드
        await Promise.all(
          uploadResults.map((result, i) =>
            uploadFileToS3(result.uploadUrl, selectedFiles[i].file)
          )
        );

        attachmentsForApi = uploadResults.map((r) => ({
          key: r.key,
          filename: r.filename,
          size: r.size,
          mimeType: r.mimeType,
          url: r.key, // key를 url로 사용 (다운로드 시 presigned URL 발급)
        }));

        attachmentsForApi.forEach((a) =>
          attachmentMeta.push({ key: a.key, filename: a.filename, size: a.size, mimeType: a.mimeType })
        );
      }

      setStage("ai_processing");
      await new Promise((r) => setTimeout(r, 300));

      const result = await createTicket(subject, content, attachmentsForApi);

      setStage("routing");
      await new Promise((r) => setTimeout(r, 400));
      setStage("done");

      setTicketNumber(result.ticketNumber);
      setTicketId(result.ticketId ?? null);
      setAiResponse(result.aiResponse);
      setSuggestedCategories(result.suggestedCategories);
      setUploadedAttachments(attachmentMeta);
    } catch {
      setStage("idle");
      showError("문의 접수에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleFeedback = async (rating: "positive" | "negative") => {
    try {
      await submitFeedback("mock-msg-id", rating);
      setFeedbackDone(true);
      showSuccess(rating === "positive" ? "피드백 감사합니다! 😊" : "더 나은 답변을 위해 개선하겠습니다.");
    } catch {
      showError("피드백 전송에 실패했습니다.");
    }
  };

  const handleReset = () => {
    setTicketNumber(null);
    setTicketId(null);
    setAiResponse(null);
    setSubject("");
    setContent("");
    setSelectedFiles([]);
    setStage("idle");
    setFeedbackDone(false);
    setSuggestedCategories([]);
    setUploadedAttachments([]);
  };

  const isLoading = stage !== "idle" && stage !== "done";
  const isAiResponse = !!aiResponse;

  const stageForProgress = stage === "uploading" ? "submitting" : stage as any;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="새 문의"
        description="IT 관련 문의를 입력해 주세요. AI가 빠르게 답변해 드립니다."
      />

      {stage === "done" && ticketNumber ? (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <h2 className="text-base font-semibold text-gray-900">문의가 접수되었습니다</h2>
                </div>
                <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
                  #{ticketNumber}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {suggestedCategories.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2 font-medium">AI 추천 카테고리</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {suggestedCategories.map((cat) => (
                      <span key={cat} className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium ring-1 ring-indigo-200">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 첨부파일 표시 */}
              {uploadedAttachments.length > 0 && (
                <AttachmentList attachments={uploadedAttachments} />
              )}

              {aiResponse ? (
                <div className="mt-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-indigo-700">AI 답변</span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                  </div>
                  {!feedbackDone ? (
                    <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600 flex-1">이 답변이 도움이 되었나요?</p>
                      <button onClick={() => handleFeedback("positive")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-emerald-600 hover:bg-emerald-50 transition-colors" aria-label="도움이 됨">
                        <ThumbsUp size={15} /><span>도움됨</span>
                      </button>
                      <button onClick={() => handleFeedback("negative")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors" aria-label="도움이 안 됨">
                        <ThumbsDown size={15} /><span>아니요</span>
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500 text-center">피드백 감사합니다 🙏</p>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl mt-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-amber-600 text-sm">👤</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">담당자 배정 중</p>
                    <p className="text-sm text-amber-700 mt-0.5">담당자가 확인 후 답변드리겠습니다.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Button variant="secondary" onClick={handleReset} icon={<RotateCcw size={15} />}>
            새 문의 작성
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent>
            {isLoading ? (
              <div className="py-4">
                <AIProgress stage={stageForProgress} isAiResponse={isAiResponse} />
                {stage === "uploading" && (
                  <p className="text-xs text-gray-400 text-center mt-2">파일 업로드 중...</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="제목"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="문의 제목을 입력하세요"
                  required
                />
                <Textarea
                  label="문의 내용"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="문의 내용을 자세히 입력해 주세요."
                  rows={5}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    첨부파일 <span className="text-gray-400 font-normal">(선택, 최대 10개 · 파일당 200MB)</span>
                  </label>
                  <FileUpload
                    files={selectedFiles}
                    onChange={setSelectedFiles}
                    maxCount={10}
                    maxSizeMB={200}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" icon={<Sparkles size={16} />}>
                  문의 접수
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
