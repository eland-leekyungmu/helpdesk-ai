import type {
  Ticket,
  Message,
  User,
  UserRole,
  TicketStats,
  KpiStats,
  LlmCostStats,
} from "@/shared/types";

// ============================================================
// API Layer - 실제 API Routes 호출
// ============================================================

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  const json = await res.json();
  if (!json.success) {
    const msg = json.error?.message || json.error || "요청에 실패했습니다.";
    if (res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
    }
    console.error(`[API Error] ${res.status} ${url}: ${msg}`);
    throw new Error(msg);
  }
  return json.data;
}

// --- Tickets ---

export async function createTicket(
  subject: string,
  content: string
): Promise<{
  ticketNumber: string;
  aiResponse: string | null;
  suggestedCategories: string[];
}> {
  const data = await request<any>("/api/tickets", {
    method: "POST",
    body: JSON.stringify({ subject, content }),
  });
  return {
    ticketNumber: data.ticketNumber || data.ticket_number || "HD-0000",
    aiResponse: data.aiResponse?.content || data.aiResponse || null,
    suggestedCategories: data.category || data.suggestedCategories || [],
  };
}

export async function getMyTickets(): Promise<Ticket[]> {
  try {
    const data = await request<any>("/api/tickets/my");
    return data.items || data || [];
  } catch {
    return [];
  }
}

export async function getTicketDetail(
  ticketId: string
): Promise<{ ticket: Ticket; messages: Message[] }> {
  const data = await request<any>(`/api/tickets/${ticketId}`);
  return {
    ticket: data.ticket || data,
    messages: data.messages || [],
  };
}

export async function getQueueTickets(): Promise<Ticket[]> {
  try {
    const data = await request<any>("/api/tickets/queue");
    return data.items || data || [];
  } catch {
    return [];
  }
}

export async function getAssignedTickets(filter?: string): Promise<Ticket[]> {
  try {
    const params = filter && filter !== "all" ? `?status=${filter === "active" ? "in_progress" : filter}` : "";
    const data = await request<any>(`/api/tickets/assigned${params}`);
    return data.items || data || [];
  } catch {
    return [];
  }
}

// --- Messages ---

export async function addMessage(
  ticketId: string,
  content: string,
  visibility: "public" | "private"
): Promise<Message> {
  return request<Message>("/api/messages", {
    method: "POST",
    body: JSON.stringify({ ticketId, content, visibility }),
  });
}

// --- Auth ---

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.success) {
      return { success: false, error: json.error?.message || json.error || "로그인 실패" };
    }
    // 토큰 저장
    if (json.data?.token) {
      setToken(json.data.token);
    }
    return { success: true, user: json.data?.user || json.data };
  } catch {
    return { success: false, error: "서버에 연결할 수 없습니다." };
  }
}

// --- Admin ---

export async function getUsers(role?: UserRole): Promise<User[]> {
  const params = role ? `?role=${role}` : "";
  const data = await request<any>(`/api/admin/users${params}`);
  return data.items || data || [];
}

export async function getAgents(): Promise<User[]> {
  const data = await request<any>("/api/admin/agents");
  return data.agents || data || [];
}

// --- Analytics ---

export async function getTicketStats(): Promise<TicketStats> {
  try {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = now.toISOString();
    const data = await request<any>(`/api/analytics/tickets?from=${from}&to=${to}`);
    // API 반환: { total, byStatus: { open, in_progress, resolved, closed }, byResolutionType }
    return {
      total: data.total || 0,
      open: data.byStatus?.open || 0,
      inProgress: data.byStatus?.in_progress || 0,
      resolved: data.byStatus?.resolved || 0,
      closed: data.byStatus?.closed || 0,
    };
  } catch {
    return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 };
  }
}

export async function getKpiStats(): Promise<KpiStats> {
  try {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = now.toISOString();
    const data = await request<any>(`/api/analytics/kpi?from=${from}&to=${to}`);
    // API 반환: { resolution: {rate}, routing: {rate}, processing: {avg, unit} }
    return {
      resolutionRate: data.resolution?.rate || 0,
      routingAccuracy: data.routing?.rate || 0,
      avgProcessingTimeHours: data.processing?.unit === "minutes"
        ? (data.processing?.avg || 0) / 60
        : (data.processing?.avg || 0),
    };
  } catch {
    return { resolutionRate: 0, routingAccuracy: 0, avgProcessingTimeHours: 0 };
  }
}

export async function getLlmCostStats(): Promise<LlmCostStats> {
  try {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = now.toISOString();
    const data = await request<any>(`/api/analytics/llm-cost?from=${from}&to=${to}`);
    return {
      totalCost: data.totalCostUsd || data.totalCost || 0,
      byModel: (data.byModel || []).map((m: any) => ({
        model: m.modelName || m.model || "",
        cost: m.costUsd || m.cost || 0,
        calls: m.requests || m.calls || 0,
      })),
      byPeriod: data.byPeriod || [],
    };
  } catch {
    return { totalCost: 0, byModel: [], byPeriod: [] };
  }
}

// --- Feedback ---

export async function submitFeedback(
  messageId: string,
  rating: "positive" | "negative"
): Promise<void> {
  await request("/api/feedback", {
    method: "POST",
    body: JSON.stringify({ messageId, rating }),
  });
}
