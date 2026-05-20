import type { Attachment } from "./index";

// AIService 인터페이스 (Unit 3 계약)

export interface RAGSource {
  id: string;
  title: string;
  relevanceScore: number;
}

export interface AIAnswerResponse {
  answer: string;
  confidence: number;
  sources: RAGSource[];
  modelUsed: string;
  tokensUsed: { input: number; output: number };
}

export type RoutingDecision =
  | { type: "ai_answer"; answer: string }
  | { type: "route_to_l2"; agentId: string; reason: string }
  | { type: "escalate_to_l1" };

export interface GenerateAnswerInput {
  ticketId: string;
  question: string;
  attachments?: Attachment[];
}

export interface IAIService {
  generateAnswer(input: GenerateAnswerInput): Promise<AIAnswerResponse>;
  determineRouting(confidence: number, ragResults: RAGSource[]): Promise<RoutingDecision>;
  suggestCategory(question: string): Promise<string[]>;
  transformToPublic(privateMessage: {
    id: string;
    content: string;
    senderType: string;
    visibility: string;
  }): Promise<string>;
  assessConfidence(ragResults: RAGSource[]): number;
}
