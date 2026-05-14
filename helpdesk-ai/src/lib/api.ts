import type {
  Ticket,
  Message,
  User,
  UserRole,
  TicketStatus,
  TicketStats,
  KpiStats,
  LlmCostStats,
  MessageVisibility,
} from "@/shared/types";
import {
  mockUsers,
  mockTickets,
  mockMessages,
  mockTicketStats,
  mockKpiStats,
  mockLlmCostStats,
} from "./mock-data";

// --- Utility ---

function delay(ms?: number): Promise<void> {
  const time = ms ?? Math.floor(Math.random() * 800) + 200;
  return new Promise((resolve) => setTimeout(resolve, time));
}

// --- Ticket APIs ---

export async function createTicket(
  subject: string,
  content: string
): Promise<{
  ticketNumber: string;
  aiResponse: string | null;
  suggestedCategories: string[];
}> {
  await delay();

  const ticketNumber = `TK-2024-${String(Math.floor(Math.random() * 900) + 100)}`;

  // 70% chance of AI response
  const aiResponse =
    Math.random() < 0.7
      ? `접수해 주신 "${subject}" 건에 대해 확인했습니다. 관련 문서를 확인한 결과, 다음 조치를 권장드립니다:\n1. 시스템을 재시작해 보세요.\n2. 문제가 지속되면 담당 에이전트가 배정됩니다.`
      : null;

  const categoryMap: Record<string, string[]> = {
    vpn: ["네트워크", "VPN"],
    네트워크: ["네트워크", "연결"],
    비밀번호: ["계정", "비밀번호"],
    프린터: ["하드웨어", "프린터"],
    소프트웨어: ["소프트웨어", "설치"],
    라이선스: ["소프트웨어", "라이선스"],
  };

  const lowerSubject = subject.toLowerCase() + " " + content.toLowerCase();
  let suggestedCategories: string[] = ["일반", "기타"];

  for (const [keyword, categories] of Object.entries(categoryMap)) {
    if (lowerSubject.includes(keyword)) {
      suggestedCategories = categories;
      break;
    }
  }

  return { ticketNumber, aiResponse, suggestedCategories };
}

export async function getMyTickets(): Promise<Ticket[]> {
  await delay();
  return mockTickets;
}

export async function getTicketDetail(
  ticketId: string
): Promise<{ ticket: Ticket; messages: Message[] }> {
  await delay();

  const ticket = mockTickets.find((t) => t.id === ticketId) ?? mockTickets[0];
  const messages = mockMessages[ticketId] ?? [];

  return { ticket, messages };
}

export async function getQueueTickets(): Promise<Ticket[]> {
  await delay();
  return mockTickets.filter(
    (t) => t.confidenceScore !== null && t.confidenceScore < 0.65
  );
}

export async function getAssignedTickets(
  filter?: string
): Promise<Ticket[]> {
  await delay();

  if (filter) {
    return mockTickets.filter((t) => t.status === filter);
  }
  return mockTickets;
}

export async function addMessage(
  ticketId: string,
  content: string,
  visibility: MessageVisibility = "public"
): Promise<Message> {
  await delay();

  const newMessage: Message = {
    id: `msg-${Date.now()}`,
    ticketId,
    senderId: "user-1",
    senderType: "user",
    visibility,
    content,
    contentType: "text",
    attachments: null,
    source: "web",
    createdAt: new Date().toISOString(),
    sender: mockUsers[0],
  };

  return newMessage;
}

// --- Auth APIs ---

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  await delay(500);

  if (password.length < 4) {
    return { success: false, error: "비밀번호는 4자 이상이어야 합니다." };
  }

  const user = mockUsers.find((u) => u.email === email);

  if (!user) {
    return { success: false, error: "등록되지 않은 이메일입니다." };
  }

  return { success: true, user };
}

// --- Admin APIs ---

export async function getUsers(role?: UserRole): Promise<User[]> {
  await delay();

  if (role) {
    return mockUsers.filter((u) => u.role === role);
  }
  return mockUsers;
}

export async function getAgents(): Promise<User[]> {
  await delay();
  return mockUsers.filter((u) => u.role === "agent_l2");
}

export async function getTicketStats(): Promise<TicketStats> {
  await delay();
  return mockTicketStats;
}

export async function getKpiStats(): Promise<KpiStats> {
  await delay();
  return mockKpiStats;
}

export async function getLlmCostStats(): Promise<LlmCostStats> {
  await delay();
  return mockLlmCostStats;
}

// --- Feedback APIs ---

export async function submitFeedback(
  messageId: string,
  rating: "positive" | "negative"
): Promise<{ success: boolean }> {
  await delay();

  console.log(`Feedback submitted: messageId=${messageId}, rating=${rating}`);
  return { success: true };
}
