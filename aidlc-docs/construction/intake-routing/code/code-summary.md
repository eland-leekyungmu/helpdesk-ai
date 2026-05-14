# Unit 2: Intake & Routing — Code Summary

## 생성된 파일 목록

### 공유 타입 (`src/shared/types/`)
| 파일 | 설명 |
|---|---|
| `index.ts` | 공통 타입/enum (UserRole, TicketStatus, Priority 등) |
| `api.ts` | API 응답 래핑 (ApiResponse, PaginatedResult) |
| `ticket.ts` | 티켓 관련 Request/Response DTO |
| `message.ts` | 메시지 관련 Request/Response DTO |
| `ai-service.ts` | AIService 인터페이스 (Unit 3 계약) |

### 공유 유틸리티 (`src/shared/utils/`)
| 파일 | 설명 |
|---|---|
| `api-response.ts` | successResponse / errorResponse 헬퍼 |
| `pagination.ts` | 페이지네이션 파싱 및 메타 빌드 |
| `ticket-number.ts` | TK-YYYY-NNNN 형식 티켓 번호 생성 |

### 미들웨어 (`src/shared/middleware/`)
| 파일 | 설명 |
|---|---|
| `auth.ts` | JWT 인증 + 역할 검증 (Unit 4 구현 전 stub) |

### Repository (`src/repositories/`)
| 파일 | 설명 |
|---|---|
| `ticket.repository.ts` | 티켓 CRUD + 필터 조회 |
| `message.repository.ts` | 메시지 CRUD |
| `assignment.repository.ts` | 분배 이력 CRUD + previousAssignees 조회 |
| `email-thread.repository.ts` | 이메일 스레드 매칭 |
| `user.repository.ts` | 사용자 조회 (읽기 전용) |

### Service (`src/services/`)
| 파일 | 설명 |
|---|---|
| `ticket.service.ts` | 티켓 생성(AI 호출), 조회, 분배, 거절 비즈니스 로직 |
| `message.service.ts` | 메시지 추가 + agent_l2 private→public 변환 |
| `email.service.ts` | 이메일 인바운드 파싱, 스레드 식별, 발송 검증 |
| `ai.service.ts` | AIService stub (Unit 3 구현 전) |

### API Routes (`src/app/api/`)
| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/tickets` | POST | 신규 티켓 생성 |
| `/api/tickets/my` | GET | 본인 티켓 목록 |
| `/api/tickets/:id` | GET | 티켓 상세 (visibility 필터) |
| `/api/tickets/queue` | GET | 1차 처리자 미처리 큐 |
| `/api/tickets/assigned` | GET | 담당 티켓 목록 |
| `/api/tickets/assign` | POST | 수동 분배 |
| `/api/tickets/reject` | POST | 분배 거절 |
| `/api/messages` | POST | 메시지 추가 |
| `/api/webhooks/ses-inbound` | POST | SES 이메일 수신 |

## 핵심 비즈니스 규칙 구현

1. **Visibility 필터**: employee는 public 메시지만 조회
2. **agent_l2 private 강제**: 서버에서 visibility를 private로 강제 변환
3. **Private→Public 자동 변환**: agent_l2 private 작성 시 AI가 public 메시지 자동 생성
4. **무한 루프 방지**: 거절 시 previousAssignees 제외 후 재분배
5. **Private 이메일 차단**: validatePrivateBlock()으로 private 메시지 발송 원천 차단
6. **이메일 스레드 식별**: In-Reply-To/References 헤더 기반 기존 티켓 매칭

## 의존성 (Stub)
- `ai.service.ts`: Unit 3 구현 시 실제 Bedrock/KB 연동으로 교체
- `auth.ts`: Unit 4 구현 시 실제 JWT 검증으로 교체
