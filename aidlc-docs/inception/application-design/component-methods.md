# Component Methods (High-Level Signatures)

> 상세 비즈니스 로직은 Construction Phase의 Functional Design에서 정의합니다.
> 여기서는 메서드 시그니처와 입출력 타입만 정의합니다.

---

## TicketService

```typescript
class TicketService {
  createTicket(input: CreateTicketInput): Promise<Ticket>
  getTicketById(ticketId: string, userId: string, role: UserRole): Promise<TicketDetail>
  getMyTickets(userId: string, filters: TicketFilters): Promise<PaginatedResult<TicketSummary>>
  getAssignedTickets(agentId: string, filters: TicketFilters): Promise<PaginatedResult<TicketSummary>>
  getUnassignedQueue(filters: QueueFilters): Promise<PaginatedResult<TicketSummary>>
  addMessage(input: AddMessageInput): Promise<Message>
  updateStatus(ticketId: string, status: TicketStatus, userId: string): Promise<Ticket>
  assignTicket(input: AssignTicketInput): Promise<TicketAssignment>
  rejectAssignment(input: RejectAssignmentInput): Promise<void>
}
```

## AIService

```typescript
class AIService {
  generateAnswer(ticketId: string, question: string, attachments?: Attachment[]): Promise<AIResponse>
  assessConfidence(ragResults: RAGResult[]): number
  routeToModel(input: ModelRouteInput): ModelType
  suggestCategory(question: string): Promise<string>
  determineRouting(confidence: number, ragResults: RAGResult[]): RoutingDecision
  transformToPublic(privateMessage: Message): Promise<string>
  logUsage(log: LLMUsageInput): Promise<void>
}
```

## EmailService

```typescript
class EmailService {
  parseInboundEmail(rawEmail: SESEvent): Promise<ParsedEmail>
  identifyThread(headers: EmailHeaders): Promise<string | null>  // returns ticketId or null
  sendReply(ticketId: string, messageId: string): Promise<void>
  validatePrivateBlock(messageId: string): boolean
}
```

## AuthService

```typescript
class AuthService {
  login(email: string, password: string): Promise<AuthResult>
  logout(sessionId: string): Promise<void>
  validateToken(token: string): Promise<TokenPayload>
  checkRole(userId: string, requiredRole: UserRole[]): boolean
  incrementLoginAttempt(userId: string): Promise<void>
}
```

## AdminService

```typescript
class AdminService {
  createUser(input: CreateUserInput): Promise<User>
  updateUser(userId: string, input: UpdateUserInput): Promise<User>
  deactivateUser(userId: string): Promise<void>
  getDepartments(): Promise<Department[]>
  createDepartment(input: CreateDepartmentInput): Promise<Department>
  updateDepartment(deptId: string, input: UpdateDepartmentInput): Promise<Department>
  getAgentList(filters?: AgentFilters): Promise<User[]>
  updateConfidenceThreshold(value: number): Promise<void>
}
```

## AnalyticsService

```typescript
class AnalyticsService {
  getResolutionRate(period: DateRange): Promise<RateMetric>
  getRoutingAccuracy(period: DateRange): Promise<RateMetric>
  getProcessingTime(period: DateRange): Promise<TimeDistribution>
  getLLMCostStats(period: DateRange, groupBy: 'model' | 'day' | 'week'): Promise<CostStats>
  getTicketStats(period: DateRange): Promise<TicketStats>
  getDepartmentStats(period: DateRange): Promise<DepartmentStats[]>
}
```

## FeedbackService

```typescript
class FeedbackService {
  submitFeedback(input: SubmitFeedbackInput): Promise<Feedback>
  accumulateLearningData(ticketId: string): Promise<void>
  triggerReindex(): Promise<ReindexStatus>
}
```

## DataPipelineService

```typescript
class DataPipelineService {
  loadSourceData(filePath: string): Promise<SourceData[]>
  generateSynthetic(sourceData: SourceData[], count: number): Promise<SyntheticEntry[]>
  validateQuality(entries: SyntheticEntry[]): Promise<ValidationResult>
  loadToKB(entries: SyntheticEntry[]): Promise<LoadResult>
}
```

---

## 주요 DTO/Input 타입

```typescript
// Ticket
interface CreateTicketInput {
  subject: string;
  content: string;
  requesterId: string;
  createdVia: CreatedVia;
  attachments?: Attachment[];
}

interface AddMessageInput {
  ticketId: string;
  senderId: string;
  senderType: SenderType;
  visibility: MessageVisibility;
  content: string;
  attachments?: Attachment[];
  source: MessageSource;
}

interface AssignTicketInput {
  ticketId: string;
  assignedTo: string;
  assignedBy?: string;
  assignmentType: AssignmentType;
  comment?: string;  // Private 이관 코멘트
}

interface RejectAssignmentInput {
  assignmentId: string;
  reason?: string;
  suggestedUserId?: string;
}

// AI
interface AIResponse {
  answer: string;
  confidence: number;
  sources: RAGSource[];
  modelUsed: string;
  tokensUsed: { input: number; output: number };
}

type RoutingDecision = 
  | { type: 'ai_answer'; answer: string }
  | { type: 'route_to_l2'; agentId: string; reason: string }
  | { type: 'escalate_to_l1' }

// Auth
interface AuthResult {
  token: string;
  user: { id: string; email: string; name: string; role: UserRole };
}
```
