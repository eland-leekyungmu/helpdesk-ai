import { TicketStatus, TicketPriority, MessageVisibility } from "@/shared/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config: Record<TicketStatus, { variant: BadgeVariant; label: string }> = {
    open: { variant: "info", label: "접수" },
    in_progress: { variant: "warning", label: "진행중" },
    resolved: { variant: "success", label: "해결" },
    closed: { variant: "default", label: "종료" },
  };
  const { variant, label } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const config: Record<TicketPriority, { variant: BadgeVariant; label: string }> = {
    low: { variant: "default", label: "낮음" },
    medium: { variant: "warning", label: "보통" },
    high: { variant: "danger", label: "높음" },
  };
  const { variant, label } = config[priority];
  return <Badge variant={variant}>{label}</Badge>;
}

export function VisibilityBadge({ visibility }: { visibility: MessageVisibility }) {
  const config: Record<MessageVisibility, { variant: BadgeVariant; label: string }> = {
    public: { variant: "info", label: "Public" },
    private: { variant: "purple", label: "Private" },
  };
  const { variant, label } = config[visibility];
  return <Badge variant={variant}>{label}</Badge>;
}
