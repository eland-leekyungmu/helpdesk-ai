"use client";

import { useState } from "react";
import { Button, Textarea, Input } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout";

export default function NewTicketPage() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setAiResponse(null);

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("content", content);
      files.forEach((file) => formData.append("attachments", file));

      const res = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setTicketNumber(data.data.ticketNumber);
        if (data.data.aiResponse) {
          setAiResponse(data.data.aiResponse);
        }
        if (data.data.suggestedCategories) {
          setSuggestedCategories(data.data.suggestedCategories);
        }
      }
    } catch {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleFeedback = async (rating: "positive" | "negative") => {
    // TODO: 피드백 API 호출
    alert(rating === "positive" ? "감사합니다! 👍" : "피드백을 반영하겠습니다.");
  };

  return (
    <div>
      <PageHeader title="새 문의" description="IT 관련 문의를 입력해 주세요." />

      {!ticketNumber ? (
        <Card>
          <CardContent>
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
                placeholder="문의 내용을 자세히 입력해 주세요. 파일이나 이미지를 첨부할 수도 있습니다."
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  첨부파일
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                {files.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">{files.length}개 파일 선택됨</p>
                )}
              </div>
              <Button type="submit" loading={loading} className="w-full">
                문의 접수
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">문의가 접수되었습니다</h2>
                <span className="text-sm text-gray-500">#{ticketNumber}</span>
              </div>
            </CardHeader>
            <CardContent>
              {suggestedCategories.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">AI 추천 카테고리:</p>
                  <div className="flex gap-2 flex-wrap">
                    {suggestedCategories.map((cat) => (
                      <span key={cat} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiResponse ? (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-600 font-medium text-sm">🤖 AI 답변</span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{aiResponse}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-gray-500">답변이 도움이 되었나요?</span>
                    <button
                      onClick={() => handleFeedback("positive")}
                      className="p-1 hover:bg-green-50 rounded"
                      aria-label="도움이 됨"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleFeedback("negative")}
                      className="p-1 hover:bg-red-50 rounded"
                      aria-label="도움이 안 됨"
                    >
                      👎
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">
                  담당자가 확인 후 답변드리겠습니다. 내 문의 목록에서 진행 상태를 확인할 수 있습니다.
                </p>
              )}
            </CardContent>
          </Card>

          <Button variant="secondary" onClick={() => { setTicketNumber(null); setAiResponse(null); setSubject(""); setContent(""); setFiles([]); }}>
            새 문의 작성
          </Button>
        </div>
      )}
    </div>
  );
}
