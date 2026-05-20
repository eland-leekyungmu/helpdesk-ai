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
  content: string,
  attachments?: { key: string; filename: string; size: number; mimeType: string; url: string }[]
): Promise<{
  ticketNumber: string;
  ticketId?: string;
  aiResponse: string | null;
  suggestedCategories: string[];
}> {
  const data = await request<any>("/api/tickets", {
    method: "POST",
    body: JSON.stringify({ subject, content, attachments }),
  });
  return {
    ticketNumber: data.ticketNumber || data.ticket_number || "HD-0000",
    ticketId: data.id || data.ticketId,
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
  visibility: "public" | "private",
  attachments?: { key: string; filename: string; size: number; mimeType: string }[]
): Promise<Message> {
  return request<Message>("/api/messages", {
    method: "POST",
    body: JSON.stringify({ ticketId, content, visibility, attachments }),
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
    // API 응답: { total, byStatus: { open, in_progress, resolved, closed }, byResolutionType }
    const byStatus = data.byStatus || {};
    return {
      total: data.total ?? data.summary?.totalTickets ?? 0,
      open: byStatus.open ?? data.summary?.openTickets ?? data.open ?? 0,
      inProgress: byStatus.in_progress ?? data.summary?.inProgressTickets ?? data.inProgress ?? 0,
      resolved: byStatus.resolved ?? data.summary?.resolvedTickets ?? data.resolved ?? 0,
      closed: byStatus.closed ?? data.summary?.closedTickets ?? data.closed ?? 0,
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
    return {
      // API 응답: { resolution: { rate }, routing: { rate }, processing: { avg, unit } }
      resolutionRate: data.resolution?.rate ?? data.aiResolutionRate?.value ?? data.resolutionRate ?? 0,
      routingAccuracy: data.routing?.rate ?? data.routingAccuracy?.value ?? data.routingAccuracy ?? 0,
      // processing.avg는 분 단위 → 시간으로 변환
      avgProcessingTimeHours:
        data.processing?.avg != null
          ? data.processing.avg / 60
          : data.avgProcessingTime?.value ?? data.avgProcessingTimeHours ?? 0,
    };
  } catch {
    return { resolutionRate: 0, routingAccuracy: 0, avgProcessingTimeHours: 0 };
  }
}

export async function getLlmCostStats(period: "day" | "week" | "month" = "month"): Promise<LlmCostStats> {
  try {
    const now = new Date();
    let from: Date;

    switch (period) {
      case "day":
        from = new Date(now);
        from.setDate(from.getDate() - 1);
        break;
      case "week":
        from = new Date(now);
        from.setDate(from.getDate() - 7);
        break;
      case "month":
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // 모델별 집계
    const modelData = await request<any>(
      `/api/analytics/llm-cost?from=${from.toISOString()}&to=${now.toISOString()}&groupBy=model`
    );
    // 일별 집계 (비용 추이)
    const dayData = await request<any>(
      `/api/analytics/llm-cost?from=${from.toISOString()}&to=${now.toISOString()}&groupBy=day`
    );

    return {
      totalCost: modelData.totalCost || 0,
      byModel: (modelData.breakdown || []).map((m: any) => ({
        model: m.label || "",
        cost: m.cost || 0,
        calls: m.count || 0,
      })),
      byPeriod: (dayData.breakdown || []).map((d: any) => ({
        date: d.label || "",
        cost: d.cost || 0,
      })),
    };
  } catch {
    return { totalCost: 0, byModel: [], byPeriod: [] };
  }
}

// --- Organization Stats ---

export interface OrgStats {
  organizations: {
    id: string;
    name: string;
    ticketCount: number;
    cost: number;
    departments: { id: string; name: string; ticketCount: number; cost: number }[];
  }[];
}

export async function getOrganizationStats(period: "day" | "week" | "month" = "month"): Promise<OrgStats> {
  try {
    const now = new Date();
    let from: Date;

    switch (period) {
      case "day":
        from = new Date(now);
        from.setDate(from.getDate() - 1);
        break;
      case "week":
        from = new Date(now);
        from.setDate(from.getDate() - 7);
        break;
      case "month":
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const data = await request<any>(
      `/api/analytics?type=organizations&from=${from.toISOString()}&to=${now.toISOString()}`
    );
    return { organizations: data.organizations || [] };
  } catch {
    return { organizations: [] };
  }
}

// --- Attachments ---

export interface UploadFileInfo {
  filename: string;
  mimeType: string;
  size: number;
}

export interface UploadResult {
  uploadUrl: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
}

export async function getUploadUrls(
  ticketId: string,
  files: UploadFileInfo[]
): Promise<UploadResult[]> {
  return request<UploadResult[]>("/api/attachments/upload", {
    method: "POST",
    body: JSON.stringify({ ticketId, files }),
  });
}

export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error(`S3 업로드 실패: ${res.status}`);
}

export async function getDownloadUrl(key: string, filename: string): Promise<string> {
  const data = await request<{ downloadUrl: string }>("/api/attachments/download", {
    method: "POST",
    body: JSON.stringify({ key, filename }),
  });
  return data.downloadUrl;
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
