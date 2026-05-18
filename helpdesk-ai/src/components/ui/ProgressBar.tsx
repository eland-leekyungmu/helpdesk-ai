"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ProgressBarProps {
  message?: string;
  /** 0~100 값. undefined면 indeterminate 애니메이션 */
  value?: number;
  className?: string;
}

export function ProgressBar({ message, value, className = "" }: ProgressBarProps) {
  const isIndeterminate = value === undefined;

  return (
    <div className={`w-full ${className}`}>
      {message && (
        <div className="flex items-center gap-2 mb-2">
          <Loader2 size={14} className="animate-spin text-indigo-500 shrink-0" />
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      )}
      <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
        {isIndeterminate ? (
          <div
            className="h-full w-1/3 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
            style={{ animation: "progress-indeterminate 1.5s ease-in-out infinite" }}
          />
        ) : (
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
      </div>
    </div>
  );
}

/** AI 처리 단계별 진행 표시 */
interface AIProgressProps {
  stage: "submitting" | "ai_processing" | "routing" | "done";
  isAiResponse?: boolean;
}

const stageMessages: Record<AIProgressProps["stage"], (isAi: boolean) => string> = {
  submitting:    () => "문의를 접수하고 있습니다...",
  ai_processing: (isAi) => isAi ? "AI가 답변을 생성하고 있습니다..." : "담당자에게 전달 중입니다...",
  routing:       () => "처리 방향을 결정하고 있습니다...",
  done:          () => "완료",
};

export function AIProgress({ stage, isAiResponse = false }: AIProgressProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const message = stageMessages[stage](isAiResponse);

  return (
    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
      <ProgressBar message={`${message}${dots}`} />
    </div>
  );
}
