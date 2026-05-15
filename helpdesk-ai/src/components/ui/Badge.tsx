import type { TicketStatus, Priority, MessageVisibility } from "@/shared/types";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

const statusConfig: Record<TicketStatus, { label: string; className: string; dot: string; title: string }> = {
  open:        { label: "접수",   className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",    dot: "bg-blue-500",    title: "접수됨 — IT 헬프데스크 처리 대기 중" },
  in_progress: { label: "진행중", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500",   title: "처리 중 — 담당자가 처리하고 있습니다" },
  resolved:    { label: "해결",   className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500", title: "해결됨 — 처리 완료, 요청자 확인 대기" },
  closed:      { label: "종료",   className: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",   dot: "bg-gray-400",    title: "종료됨 — 최종 완료" },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status] ?? statusConfig.open;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
      title={config.title}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  high:   { label: "긴급", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  medium: { label: "보통", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  low:    { label: "낮음", className: "bg-green-50 text-green-700 ring-1 ring-green-200" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority] ?? priorityConfig.medium;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

const visibilityConfig: Record<MessageVisibility, { label: string; className: string }> = {
  public:  { label: "Public",  className: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" },
  private: { label: "Private", className: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
};

export function VisibilityBadge({ visibility }: { visibility: MessageVisibility }) {
  const config = visibilityConfig[visibility];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
