# IT Help Desk AI — API Specification

## 공통 규칙 (Common Rules)

### 1. 응답 래핑 (Response Wrapping)

모든 API 응답은 아래 형식으로 래핑됩니다.

**성공 응답:**
```json
{
  "success": true,
  "data": { ... }
}
```

**실패 응답:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 에러 메시지"
  }
}
```

### 2. 인증 헤더 (Auth Header)

로그인 이후 모든 요청에 JWT 토큰을 포함합니다.

```
Authorization: Bearer <jwt_token>
```

### 3. 날짜 형식 (Date Format)

모든 날짜/시간 필드는 ISO 8601 형식을 사용합니다.

```
2024-01-15T09:30:00.000Z
```

### 4. 공통 타입 정의

```typescript
type UserRole = "employee" | "agent_l1" | "agent_l2" | "admin";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type MessageVisibility = "public" | "private";
type SenderType = "user" | "agent_l1" | "agent_l2" | "ai" | "system";
type CreatedVia = "web" | "email";
type AssignmentType = "ai_auto" | "manual" | "reassign";
type Priority = "low" | "medium" | "high";
```

---

## Unit 4 APIs (Admin & Analytics)

### POST /api/auth/login

사용자 로그인 (이메일 + 비밀번호)

**Request:**
```json
{
  "email": "user@company.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@company.com",
      "name": "홍길동",
      "role": "employee",
      "teamId": "660e8400-e29b-41d4-a716-446655440001"
    }
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "이메일 또는 비밀번호가 올바르지 않습니다."
  }
}
```

**Error (423 - 계정 잠금):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "로그인 시도 횟수 초과. 30분 후 다시 시도해주세요.",
    "lockedUntil": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### POST /api/auth/logout

현재 세션 로그아웃

**Request Header:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "로그아웃 되었습니다."
  }
}
```

---

### GET /api/admin/users

사용자 목록 조회 (admin 전용)

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| page | number | N | 페이지 번호 (기본: 1) |
| limit | number | N | 페이지 크기 (기본: 20) |
| role | UserRole | N | 역할 필터 |
| teamId | string | N | 팀 ID 필터 |
| isActive | boolean | N | 활성 상태 필터 |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "agent@company.com",
        "name": "김처리",
        "role": "agent_l2",
        "teamId": "660e8400-e29b-41d4-a716-446655440001",
        "teamName": "인프라팀",
        "departmentName": "IT본부",
        "isActive": true,
        "createdAt": "2024-01-10T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### POST /api/admin/users

사용자 생성 (admin 전용)

**Request:**
```json
{
  "email": "newuser@company.com",
  "name": "박신입",
  "password": "tempPassword123!",
  "role": "agent_l2",
  "teamId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "email": "newuser@company.com",
    "name": "박신입",
    "role": "agent_l2",
    "teamId": "660e8400-e29b-41d4-a716-446655440001",
    "isActive": true,
    "createdAt": "2024-01-15T09:30:00.000Z"
  }
}
```

**Error (409):**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "이미 등록된 이메일입니다."
  }
}
```

---

### GET /api/admin/agents

2차 처리자(agent_l2) 목록 조회 — 분배 대상 선택용

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| teamId | string | N | 팀 ID 필터 |
| departmentId | string | N | 부서 ID 필터 |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "김전문",
        "email": "expert@company.com",
        "teamId": "660e8400-e29b-41d4-a716-446655440001",
        "teamName": "인프라팀",
        "departmentName": "IT본부",
        "activeTicketCount": 3
      }
    ]
  }
}
```

---

### PUT /api/admin/settings

시스템 설정 변경 (admin 전용)

**Request:**
```json
{
  "confidenceThreshold": 0.75,
  "maxLoginAttempts": 5,
  "lockDurationMinutes": 30
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "confidenceThreshold": 0.75,
    "maxLoginAttempts": 5,
    "lockDurationMinutes": 30,
    "updatedAt": "2024-01-15T09:30:00.000Z"
  }
}
```

---

### POST /api/admin/reindex

Knowledge Base 재색인 트리거 (admin 전용)

**Request:**
```json
{}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "status": "triggered",
    "message": "KB 재색인이 시작되었습니다. 완료까지 수 분이 소요될 수 있습니다.",
    "triggeredAt": "2024-01-15T09:30:00.000Z"
  }
}
```

---

### GET /api/analytics/tickets

티켓 현황 통계 (admin 전용)

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| startDate | string (ISO) | Y | 시작일 |
| endDate | string (ISO) | Y | 종료일 |
| groupBy | string | N | "day" \| "week" \| "month" (기본: "day") |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTickets": 1250,
      "openTickets": 45,
      "inProgressTickets": 120,
      "resolvedTickets": 980,
      "closedTickets": 105
    },
    "byCategory": [
      { "category": "네트워크", "count": 320 },
      { "category": "계정/권한", "count": 280 },
      { "category": "소프트웨어", "count": 250 }
    ],
    "trend": [
      { "date": "2024-01-08", "created": 45, "resolved": 38 },
      { "date": "2024-01-09", "created": 52, "resolved": 47 }
    ]
  }
}
```

---

### GET /api/analytics/kpi

KPI 지표 조회 (admin 전용)

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| startDate | string (ISO) | Y | 시작일 |
| endDate | string (ISO) | Y | 종료일 |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "aiResolutionRate": {
      "value": 0.62,
      "label": "1차 AI 해결률",
      "trend": "+3.2%"
    },
    "routingAccuracy": {
      "value": 0.85,
      "label": "2차 분배 성공률",
      "trend": "+1.5%"
    },
    "avgProcessingTime": {
      "value": 4.2,
      "unit": "hours",
      "label": "평균 처리 시간",
      "trend": "-0.8h"
    },
    "feedbackPositiveRate": {
      "value": 0.78,
      "label": "긍정 피드백 비율",
      "trend": "+2.1%"
    }
  }
}
```

---

### GET /api/analytics/llm-cost

LLM 비용 통계 (admin 전용)

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| startDate | string (ISO) | Y | 시작일 |
| endDate | string (ISO) | Y | 종료일 |
| groupBy | string | N | "model" \| "day" \| "week" (기본: "model") |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalCostUsd": 142.58,
    "totalRequests": 8420,
    "byModel": [
      {
        "modelName": "claude-3-haiku",
        "modelType": "lightweight",
        "requests": 6800,
        "inputTokens": 2040000,
        "outputTokens": 680000,
        "costUsd": 45.20
      },
      {
        "modelName": "claude-3-sonnet",
        "modelType": "heavy",
        "requests": 1620,
        "inputTokens": 810000,
        "outputTokens": 405000,
        "costUsd": 97.38
      }
    ],
    "byRequestType": [
      { "type": "answer_gen", "count": 5200, "costUsd": 98.50 },
      { "type": "routing", "count": 1500, "costUsd": 12.30 },
      { "type": "category", "count": 1200, "costUsd": 8.40 },
      { "type": "public_transform", "count": 420, "costUsd": 18.20 },
      { "type": "synthesis", "count": 100, "costUsd": 5.18 }
    ]
  }
}
```

---

### POST /api/feedback

메시지에 대한 피드백 제출

**Request:**
```json
{
  "messageId": "880e8400-e29b-41d4-a716-446655440003",
  "rating": "positive"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "messageId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "rating": "positive",
    "createdAt": "2024-01-15T09:30:00.000Z"
  }
}
```

---


## Unit 2 APIs (Intake & Routing)

### POST /api/tickets

신규 티켓 생성 (employee, agent_l1)

**Request:**
```json
{
  "subject": "VPN 접속이 안됩니다",
  "content": "오늘 아침부터 회사 VPN에 접속이 되지 않습니다. 에러 메시지: Connection timed out",
  "attachments": [
    {
      "fileName": "error-screenshot.png",
      "fileSize": 245000,
      "mimeType": "image/png",
      "url": "https://s3.amazonaws.com/helpdesk-attachments/..."
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "ticketNumber": "TK-2024-0042",
    "subject": "VPN 접속이 안됩니다",
    "status": "open",
    "priority": "medium",
    "category": ["네트워크", "VPN"],
    "requesterId": "550e8400-e29b-41d4-a716-446655440000",
    "assignedTo": null,
    "createdVia": "web",
    "confidenceScore": 0.82,
    "createdAt": "2024-01-15T09:30:00.000Z",
    "aiResponse": {
      "messageId": "bb0e8400-e29b-41d4-a716-446655440006",
      "content": "VPN 접속 문제 해결을 위해 다음 단계를 시도해주세요:\n1. VPN 클라이언트를 완전히 종료 후 재시작\n2. 네트워크 연결 상태 확인\n3. DNS 캐시 초기화 (ipconfig /flushdns)",
      "confidence": 0.82,
      "sources": [
        {
          "id": "kb-001",
          "title": "VPN 접속 장애 해결 가이드",
          "relevanceScore": 0.91
        }
      ]
    }
  }
}
```

> **비즈니스 로직**: 티켓 생성 시 AIService를 호출하여 자동 답변을 생성합니다.
> - confidence >= threshold → AI 답변을 public 메시지로 즉시 제공
> - 2차 분배 판정 → 적절한 agent_l2에게 자동 분배
> - confidence < threshold → 1차 처리자 큐에 추가 (요청자에게 안내 없음)

---

### GET /api/tickets/my

요청자 본인의 티켓 목록 조회 (employee)

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| page | number | N | 페이지 번호 (기본: 1) |
| limit | number | N | 페이지 크기 (기본: 20) |
| status | TicketStatus | N | 상태 필터 |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440005",
        "ticketNumber": "TK-2024-0042",
        "subject": "VPN 접속이 안됩니다",
        "status": "resolved",
        "priority": "medium",
        "category": ["네트워크", "VPN"],
        "createdAt": "2024-01-15T09:30:00.000Z",
        "resolvedAt": "2024-01-15T10:15:00.000Z",
        "lastMessageAt": "2024-01-15T10:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

---

### GET /api/tickets/:id

티켓 상세 조회

> **⚠️ 중요 비즈니스 규칙:**
> - `employee` 역할: **public** visibility 메시지만 반환
> - `agent_l1`, `agent_l2`, `admin` 역할: **모든** 메시지 반환 (public + private)

**Response (200) — employee 역할:**
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "ticketNumber": "TK-2024-0042",
    "subject": "VPN 접속이 안됩니다",
    "status": "resolved",
    "priority": "medium",
    "category": ["네트워크", "VPN"],
    "requesterId": "550e8400-e29b-41d4-a716-446655440000",
    "requesterName": "홍길동",
    "assignedTo": null,
    "createdVia": "web",
    "confidenceScore": 0.82,
    "resolutionType": "ai_auto",
    "createdAt": "2024-01-15T09:30:00.000Z",
    "resolvedAt": "2024-01-15T10:15:00.000Z",
    "messages": [
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440007",
        "senderType": "user",
        "senderName": "홍길동",
        "visibility": "public",
        "content": "오늘 아침부터 회사 VPN에 접속이 되지 않습니다.",
        "contentType": "text",
        "source": "web",
        "createdAt": "2024-01-15T09:30:00.000Z"
      },
      {
        "id": "bb0e8400-e29b-41d4-a716-446655440006",
        "senderType": "ai",
        "senderName": "AI 어시스턴트",
        "visibility": "public",
        "content": "VPN 접속 문제 해결을 위해 다음 단계를 시도해주세요...",
        "contentType": "text",
        "source": "ai_generated",
        "createdAt": "2024-01-15T09:30:05.000Z"
      }
    ]
  }
}
```

**Response (200) — agent 역할 (추가로 private 메시지 포함):**
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "ticketNumber": "TK-2024-0042",
    "subject": "VPN 접속이 안됩니다",
    "status": "in_progress",
    "priority": "medium",
    "category": ["네트워크", "VPN"],
    "requesterId": "550e8400-e29b-41d4-a716-446655440000",
    "requesterName": "홍길동",
    "assignedTo": "dd0e8400-e29b-41d4-a716-446655440008",
    "assignedToName": "김전문",
    "createdVia": "web",
    "confidenceScore": 0.45,
    "createdAt": "2024-01-15T09:30:00.000Z",
    "messages": [
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440007",
        "senderType": "user",
        "senderName": "홍길동",
        "visibility": "public",
        "content": "오늘 아침부터 회사 VPN에 접속이 되지 않습니다.",
        "contentType": "text",
        "source": "web",
        "createdAt": "2024-01-15T09:30:00.000Z"
      },
      {
        "id": "ee0e8400-e29b-41d4-a716-446655440009",
        "senderType": "agent_l2",
        "senderName": "김전문",
        "visibility": "private",
        "content": "확인 결과 해당 사용자의 VPN 인증서가 만료되었습니다. 인증서 갱신 처리 완료.",
        "contentType": "text",
        "source": "web",
        "createdAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": "ff0e8400-e29b-41d4-a716-446655440010",
        "senderType": "ai",
        "senderName": "AI 어시스턴트",
        "visibility": "public",
        "content": "VPN 인증서가 만료되어 접속이 불가했습니다. 인증서 갱신이 완료되었으니 VPN 클라이언트를 재시작하여 접속해주세요.",
        "contentType": "text",
        "source": "ai_generated",
        "aiOriginalId": "ee0e8400-e29b-41d4-a716-446655440009",
        "createdAt": "2024-01-15T10:00:10.000Z"
      }
    ],
    "assignments": [
      {
        "id": "gg0e8400-e29b-41d4-a716-446655440011",
        "assignedTo": "dd0e8400-e29b-41d4-a716-446655440008",
        "assignedToName": "김전문",
        "assignmentType": "ai_auto",
        "status": "active",
        "createdAt": "2024-01-15T09:30:10.000Z"
      }
    ]
  }
}
```

---

### GET /api/tickets/queue

1차 처리자 미처리 큐 (agent_l1 전용)

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| page | number | N | 페이지 번호 (기본: 1) |
| limit | number | N | 페이지 크기 (기본: 20) |
| priority | Priority | N | 우선순위 필터 |
| category | string | N | 카테고리 필터 |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "hh0e8400-e29b-41d4-a716-446655440012",
        "ticketNumber": "TK-2024-0043",
        "subject": "프린터 드라이버 설치 요청",
        "status": "open",
        "priority": "low",
        "category": ["하드웨어", "프린터"],
        "requesterName": "이직원",
        "confidenceScore": 0.55,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "waitingTime": "2h 30m"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

---

### GET /api/tickets/assigned

처리자 담당 티켓 목록 (agent_l1, agent_l2)

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| page | number | N | 페이지 번호 (기본: 1) |
| limit | number | N | 페이지 크기 (기본: 20) |
| status | TicketStatus | N | 상태 필터 |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440005",
        "ticketNumber": "TK-2024-0042",
        "subject": "VPN 접속이 안됩니다",
        "status": "in_progress",
        "priority": "medium",
        "category": ["네트워크", "VPN"],
        "requesterName": "홍길동",
        "assignmentType": "ai_auto",
        "assignedAt": "2024-01-15T09:30:10.000Z",
        "createdAt": "2024-01-15T09:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### POST /api/tickets/assign

수동 분배 (agent_l1 → agent_l2)

**Request:**
```json
{
  "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
  "assignedTo": "dd0e8400-e29b-41d4-a716-446655440008",
  "comment": "네트워크 전문가 확인 필요"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ii0e8400-e29b-41d4-a716-446655440013",
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
    "assignedTo": "dd0e8400-e29b-41d4-a716-446655440008",
    "assignedBy": "jj0e8400-e29b-41d4-a716-446655440014",
    "assignmentType": "manual",
    "status": "active",
    "comment": "네트워크 전문가 확인 필요",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST /api/tickets/reject

"본인 아님" 분배 거절 (agent_l2)

**Request:**
```json
{
  "assignmentId": "gg0e8400-e29b-41d4-a716-446655440011",
  "reason": "해당 건은 보안팀 소관입니다.",
  "suggestedUserId": "kk0e8400-e29b-41d4-a716-446655440015"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "분배가 거절되었습니다. 재분배가 진행됩니다.",
    "assignmentId": "gg0e8400-e29b-41d4-a716-446655440011",
    "status": "rejected"
  }
}
```

> **⚠️ 비즈니스 규칙 — 무한 루프 방지:**
> 거절 시 `assignment.rejected` 이벤트가 발행되며, 재분배 로직에서 `previousAssignees`에 포함된 사용자는 재분배 대상에서 제외됩니다.

---

### POST /api/messages

메시지 추가

> **⚠️ 중요 비즈니스 규칙:**
> - `agent_l2`는 **반드시 `"private"` visibility**로만 작성 가능 (서버에서 강제 검증)
> - `agent_l2`가 `"public"`으로 요청 시 서버가 자동으로 `"private"`로 변환하거나 에러 반환
> - `employee`, `agent_l1`은 `"public"` visibility로 작성

**Request (agent_l2 — private 메시지):**
```json
{
  "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
  "content": "확인 결과 해당 사용자의 VPN 인증서가 만료되었습니다. 인증서 갱신 처리 완료.",
  "visibility": "private",
  "contentType": "text"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "ee0e8400-e29b-41d4-a716-446655440009",
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
    "senderId": "dd0e8400-e29b-41d4-a716-446655440008",
    "senderType": "agent_l2",
    "visibility": "private",
    "content": "확인 결과 해당 사용자의 VPN 인증서가 만료되었습니다. 인증서 갱신 처리 완료.",
    "contentType": "text",
    "source": "web",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "publicMessage": {
      "id": "ff0e8400-e29b-41d4-a716-446655440010",
      "content": "VPN 인증서가 만료되어 접속이 불가했습니다. 인증서 갱신이 완료되었으니 VPN 클라이언트를 재시작하여 접속해주세요.",
      "senderType": "ai",
      "visibility": "public",
      "aiOriginalId": "ee0e8400-e29b-41d4-a716-446655440009"
    }
  }
}
```

> **흐름**: agent_l2가 private 메시지 작성 → AIService.transformToPublic() 호출 → public 메시지 자동 생성

**Request (employee — 추가 문의):**
```json
{
  "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
  "content": "재시작했는데도 여전히 안됩니다. 에러 코드: ERR_CERT_INVALID",
  "visibility": "public",
  "contentType": "text"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "ll0e8400-e29b-41d4-a716-446655440016",
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
    "senderId": "550e8400-e29b-41d4-a716-446655440000",
    "senderType": "user",
    "visibility": "public",
    "content": "재시작했는데도 여전히 안됩니다. 에러 코드: ERR_CERT_INVALID",
    "contentType": "text",
    "source": "web",
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---


## Internal Service Calls (Unit 2 → Unit 3: AIService)

Unit 2 (Intake & Routing)가 Unit 3 (AI/RAG)의 AIService를 직접 호출하는 내부 서비스 인터페이스입니다.
동일 Next.js 앱 내 모듈 간 직접 함수 호출 (REST 아님).

---

### AIService.generateAnswer()

RAG 기반 답변 생성

```typescript
// Input
{
  ticketId: "aa0e8400-e29b-41d4-a716-446655440005",
  question: "VPN 접속이 안됩니다. 에러: Connection timed out",
  attachments: [
    { fileName: "error.png", mimeType: "image/png", url: "s3://..." }
  ]
}

// Output
{
  answer: "VPN 접속 문제 해결을 위해 다음 단계를 시도해주세요...",
  confidence: 0.82,
  sources: [
    { id: "kb-001", title: "VPN 접속 장애 해결 가이드", relevanceScore: 0.91 },
    { id: "kb-015", title: "네트워크 연결 문제 FAQ", relevanceScore: 0.76 }
  ],
  modelUsed: "claude-3-haiku",
  tokensUsed: { input: 1250, output: 380 }
}
```

---

### AIService.determineRouting()

1차 답변 / 2차 분배 / Fallback 판정

```typescript
// Input
{
  confidence: 0.82,
  ragResults: [
    { id: "kb-001", relevanceScore: 0.91, content: "..." }
  ]
}

// Output — Case 1: AI 직접 답변
{
  type: "ai_answer",
  answer: "VPN 접속 문제 해결을 위해..."
}

// Output — Case 2: 2차 처리자 분배
{
  type: "route_to_l2",
  agentId: "dd0e8400-e29b-41d4-a716-446655440008",
  reason: "네트워크 인프라 전문 지식 필요"
}

// Output — Case 3: 1차 처리자 큐 (Fallback)
{
  type: "escalate_to_l1"
}
```

---

### AIService.routeToModel()

입력 유형별 LLM 모델 선택

```typescript
// Input
{
  hasAttachments: true,
  attachmentTypes: ["image/png"],
  contentLength: 250,
  complexity: "medium"
}

// Output
"claude-3-sonnet"  // 이미지 포함 → 고성능 모델
// or
"claude-3-haiku"   // 텍스트만 → 경량 모델
```

---

### AIService.suggestCategory()

카테고리 추천 (최대 10개)

```typescript
// Input
"VPN 접속이 안됩니다. Connection timed out 에러가 발생합니다."

// Output
["네트워크", "VPN", "연결 장애"]
```

---

### AIService.transformToPublic()

2차 처리자의 Private 메시지를 Public 메시지로 변환

> **⚠️ 핵심 규칙: 문맥/톤/형식만 수정하며, 내용(사실/정보)은 절대 변경하지 않습니다.**
> - ✅ 기술 용어를 쉬운 표현으로 변환
> - ✅ 내부 시스템명을 일반적 표현으로 대체
> - ✅ 존댓말/안내 톤으로 변환
> - ❌ 새로운 정보 추가 금지
> - ❌ 기존 정보 삭제 금지
> - ❌ 사실 관계 변경 금지

```typescript
// Input (Private message from agent_l2)
{
  id: "ee0e8400-e29b-41d4-a716-446655440009",
  content: "확인 결과 해당 사용자의 VPN 인증서가 만료되었습니다. 인증서 갱신 처리 완료.",
  senderType: "agent_l2",
  visibility: "private"
}

// Output (Public-ready content)
"VPN 인증서가 만료되어 접속이 불가했습니다. 인증서 갱신이 완료되었으니 VPN 클라이언트를 재시작하여 접속해주세요."
```

---

### AIService.assessConfidence()

RAG 검색 결과 기반 신뢰도 점수 산출

```typescript
// Input
[
  { id: "kb-001", relevanceScore: 0.91, content: "..." },
  { id: "kb-015", relevanceScore: 0.76, content: "..." }
]

// Output
0.82  // 0.0 ~ 1.0 범위의 신뢰도 점수
```

---

## Internal Service Calls (Unit 2 → Unit 4: UserRepository)

Unit 2가 분배 로직에서 사용자 정보를 조회할 때 사용하는 인터페이스입니다.

---

### UserRepository.findById()

```typescript
// Input
userId: "dd0e8400-e29b-41d4-a716-446655440008"

// Output
{
  id: "dd0e8400-e29b-41d4-a716-446655440008",
  email: "expert@company.com",
  name: "김전문",
  role: "agent_l2",
  teamId: "660e8400-e29b-41d4-a716-446655440001",
  isActive: true
}
```

---

### UserRepository.findByTeamId()

```typescript
// Input
teamId: "660e8400-e29b-41d4-a716-446655440001"

// Output
[
  {
    id: "dd0e8400-e29b-41d4-a716-446655440008",
    name: "김전문",
    role: "agent_l2",
    isActive: true
  },
  {
    id: "kk0e8400-e29b-41d4-a716-446655440015",
    name: "박보안",
    role: "agent_l2",
    isActive: true
  }
]
```

---

### UserRepository.findByRole()

```typescript
// Input
role: "agent_l2"

// Output
[
  {
    id: "dd0e8400-e29b-41d4-a716-446655440008",
    name: "김전문",
    role: "agent_l2",
    teamId: "660e8400-e29b-41d4-a716-446655440001",
    teamName: "인프라팀",
    isActive: true
  }
]
```

---


## Event-Based Async Communication (SQS)

비동기 이벤트 기반 통신. Producer가 SQS 큐에 메시지를 발행하고, Consumer가 비동기로 처리합니다.

---

### email.inbound

인바운드 이메일 수신 (SES → Lambda → SQS)

**Producer:** SES/Lambda
**Consumer:** EmailService
**Queue:** `helpdesk-email-inbound`

```json
{
  "eventType": "email.inbound",
  "timestamp": "2024-01-15T09:30:00.000Z",
  "payload": {
    "messageId": "ses-msg-001@mail.company.com",
    "from": "user@company.com",
    "to": "helpdesk@company.com",
    "subject": "Re: [TK-2024-0042] VPN 접속이 안됩니다",
    "inReplyTo": "helpdesk-reply-001@company.com",
    "references": ["helpdesk-reply-001@company.com"],
    "bodyText": "재시작했는데도 여전히 안됩니다.",
    "bodyHtml": "<p>재시작했는데도 여전히 안됩니다.</p>",
    "attachments": [],
    "s3Key": "inbound-emails/2024/01/15/ses-msg-001.eml"
  }
}
```

**처리 로직:**
1. `identifyThread()` — In-Reply-To/References 헤더로 기존 티켓 매칭
2. 매칭 성공 → 해당 티켓에 메시지 추가
3. 매칭 실패 → 신규 티켓 생성 (createdVia: "email")

---

### email.outbound

Public 답변 이메일 발송

**Producer:** TicketService
**Consumer:** EmailService
**Queue:** `helpdesk-email-outbound`

> **⚠️ 핵심 규칙: Private 메시지는 절대로 이메일로 발송하지 않습니다.**
> EmailService는 발송 전 반드시 `validatePrivateBlock()`을 호출하여 private 메시지 여부를 검증합니다.

```json
{
  "eventType": "email.outbound",
  "timestamp": "2024-01-15T10:00:10.000Z",
  "payload": {
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
    "messageId": "ff0e8400-e29b-41d4-a716-446655440010",
    "recipientEmail": "user@company.com",
    "recipientName": "홍길동",
    "subject": "Re: [TK-2024-0042] VPN 접속이 안됩니다",
    "content": "VPN 인증서가 만료되어 접속이 불가했습니다. 인증서 갱신이 완료되었으니 VPN 클라이언트를 재시작하여 접속해주세요.",
    "visibility": "public",
    "inReplyTo": "ses-msg-001@mail.company.com"
  }
}
```

---

### message.private.created

2차 처리자 Private 답변 → Public 변환 트리거

**Producer:** TicketService
**Consumer:** AIService
**Queue:** `helpdesk-assignment-events`

```json
{
  "eventType": "message.private.created",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "payload": {
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
    "messageId": "ee0e8400-e29b-41d4-a716-446655440009",
    "senderId": "dd0e8400-e29b-41d4-a716-446655440008",
    "senderType": "agent_l2",
    "content": "확인 결과 해당 사용자의 VPN 인증서가 만료되었습니다. 인증서 갱신 처리 완료.",
    "visibility": "private"
  }
}
```

**처리 로직:**
1. `AIService.transformToPublic()` 호출 (톤/형식만 변환, 내용 변경 금지)
2. Public 메시지 생성 (`ai_original_id` = 원본 private 메시지 ID)
3. 이메일 접수 건이면 `email.outbound` 이벤트 발행

---

### assignment.rejected

"본인 아님" 분배 거절 → 재분배

**Producer:** TicketService
**Consumer:** AIService (재분배 판정)
**Queue:** `helpdesk-assignment-events`

> **⚠️ 핵심 규칙 — 무한 루프 방지:**
> `previousAssignees` 목록에 포함된 사용자는 재분배 대상에서 반드시 제외합니다.

```json
{
  "eventType": "assignment.rejected",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "payload": {
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
    "assignmentId": "gg0e8400-e29b-41d4-a716-446655440011",
    "rejectedBy": "dd0e8400-e29b-41d4-a716-446655440008",
    "reason": "해당 건은 보안팀 소관입니다.",
    "suggestedUserId": "kk0e8400-e29b-41d4-a716-446655440015",
    "previousAssignees": [
      "dd0e8400-e29b-41d4-a716-446655440008"
    ]
  }
}
```

**처리 로직:**
1. `previousAssignees`에 포함된 사용자 제외
2. `suggestedUserId`가 있으면 우선 고려
3. AI가 새로운 적합 담당자 판정
4. 적합 담당자 없으면 1차 처리자 큐로 에스컬레이션

---

### llm.usage

LLM 호출 로그 비동기 저장

**Producer:** AIService
**Consumer:** AnalyticsService
**Queue:** `helpdesk-llm-logging`

```json
{
  "eventType": "llm.usage",
  "timestamp": "2024-01-15T09:30:05.000Z",
  "payload": {
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
    "modelName": "claude-3-haiku",
    "modelType": "lightweight",
    "inputTokens": 1250,
    "outputTokens": 380,
    "costUsd": 0.000425,
    "requestType": "answer_gen",
    "durationMs": 1850
  }
}
```

---

### ticket.resolved

티켓 해결 → 학습 데이터 누적

**Producer:** TicketService
**Consumer:** FeedbackService
**Queue:** `helpdesk-feedback-accumulate`

```json
{
  "eventType": "ticket.resolved",
  "timestamp": "2024-01-15T10:15:00.000Z",
  "payload": {
    "ticketId": "aa0e8400-e29b-41d4-a716-446655440005",
    "ticketNumber": "TK-2024-0042",
    "subject": "VPN 접속이 안됩니다",
    "category": ["네트워크", "VPN"],
    "resolutionType": "agent_l2",
    "resolvedBy": "dd0e8400-e29b-41d4-a716-446655440008",
    "resolvedAt": "2024-01-15T10:15:00.000Z"
  }
}
```

**처리 로직:**
1. 티켓의 질문-답변 쌍을 KB 엔트리로 변환
2. `knowledge_base_entries` 테이블에 저장 (`source_type: "feedback"`)
3. 일정 건수 누적 시 `kb.reindex` 이벤트 발행

---

### kb.reindex

Knowledge Base 재색인 트리거

**Producer:** FeedbackService / AdminService
**Consumer:** Bedrock KB (외부)
**Queue:** `helpdesk-feedback-accumulate`

```json
{
  "eventType": "kb.reindex",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "payload": {
    "triggeredBy": "system",
    "reason": "accumulated_entries_threshold",
    "newEntriesCount": 50,
    "totalEntries": 1250
  }
}
```

---

## External Service Calls

### AWS Bedrock LLM (Invoke Model)

```typescript
// Request
{
  modelId: "anthropic.claude-3-haiku-20240307-v1:0",
  contentType: "application/json",
  body: {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "다음 IT 문의에 대해 답변해주세요: VPN 접속이 안됩니다..."
      }
    ],
    system: "당신은 IT 헬프데스크 AI 어시스턴트입니다. RAG 검색 결과를 기반으로 정확한 답변을 제공하세요."
  }
}

// Response
{
  content: [
    {
      type: "text",
      text: "VPN 접속 문제 해결을 위해 다음 단계를 시도해주세요..."
    }
  ],
  usage: {
    input_tokens: 1250,
    output_tokens: 380
  }
}
```

---

### AWS Bedrock Knowledge Base (Retrieve & Generate)

```typescript
// Request
{
  knowledgeBaseId: "KB_HELPDESK_001",
  input: {
    text: "VPN 접속이 안됩니다. Connection timed out"
  },
  retrievalConfiguration: {
    vectorSearchConfiguration: {
      numberOfResults: 5
    }
  }
}

// Response
{
  retrievalResults: [
    {
      content: { text: "VPN 접속 장애 시 1) 클라이언트 재시작 2) DNS 초기화..." },
      location: { type: "S3", s3Location: { uri: "s3://kb-bucket/vpn-guide.md" } },
      score: 0.91
    }
  ]
}
```

---

### Amazon SES (Send Email)

```typescript
// Request
{
  Source: "helpdesk@company.com",
  Destination: {
    ToAddresses: ["user@company.com"]
  },
  Message: {
    Subject: { Data: "Re: [TK-2024-0042] VPN 접속이 안됩니다" },
    Body: {
      Html: {
        Data: "<p>VPN 인증서가 만료되어 접속이 불가했습니다...</p>"
      }
    }
  },
  ReplyToAddresses: ["helpdesk@company.com"],
  Headers: [
    { Name: "In-Reply-To", Value: "ses-msg-001@mail.company.com" },
    { Name: "References", Value: "ses-msg-001@mail.company.com" }
  ]
}
```

---

## SQS Queue List

| 큐 이름 | 용도 | Producer | Consumer |
|---|---|---|---|
| `helpdesk-email-inbound` | 인바운드 이메일 처리 | SES/Lambda | EmailService |
| `helpdesk-email-outbound` | 아웃바운드 이메일 발송 | TicketService | EmailService |
| `helpdesk-llm-logging` | LLM 사용 로그 비동기 저장 | AIService | AnalyticsService |
| `helpdesk-feedback-accumulate` | 학습 데이터 누적 + KB 재색인 | TicketService, FeedbackService | FeedbackService, Bedrock KB |
| `helpdesk-assignment-events` | 분배/재분배 이벤트 + Private→Public 변환 | TicketService | AIService |

---

## 비즈니스 규칙 요약 (Critical Rules)

| # | 규칙 | 적용 위치 |
|---|---|---|
| 1 | 모든 응답은 `{"success": true/false, "data"/"error"}` 형식으로 래핑 | 모든 API |
| 2 | GET /api/tickets/:id — employee는 public 메시지만, agent는 전체 메시지 | TicketService.getTicketById() |
| 3 | POST /api/messages — agent_l2는 private visibility만 허용 (서버 강제 검증) | TicketService.addMessage() |
| 4 | AIService.transformToPublic() — 톤/형식만 수정, 내용/사실 변경 절대 금지 | AIService |
| 5 | assignment.rejected — previousAssignees 재분배 제외 (무한 루프 방지) | 재분배 로직 |
| 6 | email.outbound — private 메시지는 절대 이메일 발송 금지 | EmailService.sendReply() |
| 7 | 2차 처리자 Private 작성 → AI가 Public 변환 → 요청자에게 전달 | message.private.created 흐름 |
| 8 | 신뢰도 < threshold 시 요청자에게 안내 없이 1차 처리자 큐에 추가 | 티켓 생성 흐름 |
