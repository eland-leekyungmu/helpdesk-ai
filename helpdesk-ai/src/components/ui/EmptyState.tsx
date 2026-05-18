import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      {icon ? (
        <div className="mb-4 text-indigo-300">{icon}</div>
      ) : (
        <div className="mb-4">
          <DefaultIllustration />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

function DefaultIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden="true">
      <rect x="10" y="20" width="100" height="65" rx="8" fill="#EEF2FF" />
      <rect x="20" y="32" width="60" height="6" rx="3" fill="#C7D2FE" />
      <rect x="20" y="44" width="80" height="4" rx="2" fill="#E0E7FF" />
      <rect x="20" y="54" width="70" height="4" rx="2" fill="#E0E7FF" />
      <rect x="20" y="64" width="50" height="4" rx="2" fill="#E0E7FF" />
      <circle cx="95" cy="28" r="18" fill="#6366F1" opacity="0.15" />
      <circle cx="95" cy="28" r="10" fill="#6366F1" opacity="0.3" />
      <path d="M90 28h10M95 23v10" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
