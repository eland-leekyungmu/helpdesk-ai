import type {
  IAIService,
  GenerateAnswerInput,
  AIAnswerResponse,
  RAGSource,
  RoutingDecision,
} from "@/shared/types/ai-service";

/**
 * AIService Stub — Unit 3에서 실제 구현으로 교체 예정
 * Unit 2는 이 인터페이스에만 의존합니다.
 */
export const aiService: IAIService = {
  async generateAnswer(input: GenerateAnswerInput): Promise<AIAnswerResponse> {
    // Stub: 기본 응답 반환
    return {
      answer: `"${input.question}"에 대한 답변을 준비 중입니다. 잠시만 기다려주세요.`,
      confidence: 0.5,
      sources: [],
      modelUsed: "stub",
      tokensUsed: { input: 0, output: 0 },
    };
  },

  async determineRouting(confidence: number, _ragResults: RAGSource[]): Promise<RoutingDecision> {
    // Stub: 신뢰도 기반 간단 판정
    if (confidence >= 0.75) {
      return { type: "ai_answer", answer: "" };
    }
    return { type: "escalate_to_l1" };
  },

  async suggestCategory(_question: string): Promise<string[]> {
    // Stub: 빈 배열
    return [];
  },

  async transformToPublic(privateMessage: {
    id: string;
    content: string;
    senderType: string;
    visibility: string;
  }): Promise<string> {
    // Stub: 원본 내용 그대로 반환
    return privateMessage.content;
  },

  assessConfidence(ragResults: RAGSource[]): number {
    if (ragResults.length === 0) return 0;
    const avg = ragResults.reduce((sum, r) => sum + r.relevanceScore, 0) / ragResults.length;
    return Math.round(avg * 100) / 100;
  },
};
