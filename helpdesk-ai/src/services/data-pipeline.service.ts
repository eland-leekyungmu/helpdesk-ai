// ============================================================
// DataPipelineService - 시드/합성 데이터 생성, 품질 검증, KB 적재
// 소유 유닛: Unit 3 (AI/RAG)
// ============================================================

import { readFile } from 'fs/promises';
import { invokeModel, calculateCost } from '@/lib/bedrock';
import { prisma } from '@/lib/prisma';
import { logUsage } from '@/services/ai.service';
import {
  type SyntheticEntry,
  type ValidationResult,
  type LoadResult,
} from '@/shared/types/ai';
import { CATEGORIES, ORGANIZATION_STRUCTURE, CATEGORY_TEAM_MAP } from '@/shared/constants/categories';

// ─── 시드 데이터 생성 ───────────────────────────────────────

export interface SeedGenerationOptions {
  entriesPerCategory?: number; // 기본 20
}

export async function generateSeedData(
  options: SeedGenerationOptions = {},
): Promise<SyntheticEntry[]> {
  const entriesPerCategory = options.entriesPerCategory || 20;
  const allEntries: SyntheticEntry[] = [];

  for (const category of CATEGORIES) {
    if (category === '기타') continue; // 기타는 시드 생성 제외

    const mapping = CATEGORY_TEAM_MAP[category];
    if (!mapping || !mapping.department) continue;

    console.log(`[DataPipeline] Generating seed for: ${category} (${entriesPerCategory}건)`);

    const prompt = buildSeedPrompt(category, mapping.department, mapping.team, entriesPerCategory);

    try {
      const response = await invokeModel({
        prompt,
        modelType: 'lightweight',
        maxTokens: 8192,
        temperature: 0.7,
      });

      await logUsage({
        modelName: response.modelId,
        modelType: 'lightweight',
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd: calculateCost(response.modelId, response.inputTokens, response.outputTokens),
        requestType: 'seed_generation',
        durationMs: response.durationMs,
      });

      const entries = parseSeedResponse(response.content, category, mapping.department, mapping.team);
      allEntries.push(...entries);
    } catch (error) {
      console.error(`[DataPipeline] Failed to generate seed for ${category}:`, error);
    }
  }

  console.log(`[DataPipeline] Seed generation complete: ${allEntries.length}건`);
  return allEntries;
}

// ─── 소스 데이터 로드 ───────────────────────────────────────

export interface SourceData {
  question: string;
  answer: string;
  category: string;
  department?: string;
  team?: string;
}

export async function loadSourceData(filePath: string): Promise<SourceData[]> {
  const raw = await readFile(filePath, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error('Source data must be a JSON array');
  }

  return data.map((item: Record<string, unknown>) => ({
    question: String(item.question || ''),
    answer: String(item.answer || ''),
    category: String(item.category || '기타'),
    department: item.department ? String(item.department) : undefined,
    team: item.team ? String(item.team) : undefined,
  }));
}

// ─── 합성 데이터 생성 ───────────────────────────────────────

export interface SyntheticGenerationOptions {
  count: number; // 목표 생성 건수
  batchSize?: number; // LLM 1회 호출당 생성 건수 (기본 10)
}

export async function generateSynthetic(
  sourceData: SourceData[],
  options: SyntheticGenerationOptions,
): Promise<SyntheticEntry[]> {
  const { count, batchSize = 10 } = options;
  const allEntries: SyntheticEntry[] = [];
  const totalBatches = Math.ceil(count / batchSize);

  console.log(`[DataPipeline] Synthetic generation: ${count}건 목표, ${totalBatches} batches`);

  for (let batch = 0; batch < totalBatches; batch++) {
    const remaining = count - allEntries.length;
    if (remaining <= 0) break;

    const currentBatchSize = Math.min(batchSize, remaining);

    // 소스에서 랜덤 샘플 선택 (참고용)
    const samples = pickRandomSamples(sourceData, 3);
    const targetCategory = samples[0]?.category || CATEGORIES[batch % CATEGORIES.length];
    const mapping = CATEGORY_TEAM_MAP[targetCategory] || { department: '', team: '' };

    const prompt = buildSyntheticPrompt(samples, currentBatchSize, targetCategory);

    try {
      const response = await invokeModel({
        prompt,
        modelType: 'lightweight',
        maxTokens: 8192,
        temperature: 0.8,
      });

      await logUsage({
        modelName: response.modelId,
        modelType: 'lightweight',
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd: calculateCost(response.modelId, response.inputTokens, response.outputTokens),
        requestType: 'synthesis',
        durationMs: response.durationMs,
      });

      const entries = parseSyntheticResponse(
        response.content,
        targetCategory,
        mapping.department,
        mapping.team,
      );
      allEntries.push(...entries);
    } catch (error) {
      console.error(`[DataPipeline] Batch ${batch + 1}/${totalBatches} failed:`, error);
    }

    // 진행률 로깅 (10% 단위)
    if ((batch + 1) % Math.max(1, Math.floor(totalBatches / 10)) === 0) {
      console.log(`[DataPipeline] Progress: ${allEntries.length}/${count} (${((allEntries.length / count) * 100).toFixed(1)}%)`);
    }
  }

  console.log(`[DataPipeline] Synthetic generation complete: ${allEntries.length}건`);
  return allEntries;
}

// ─── 품질 검증 ──────────────────────────────────────────────

export function validateQuality(entries: SyntheticEntry[]): ValidationResult {
  const validEntries: SyntheticEntry[] = [];
  let duplicatesRemoved = 0;
  let invalidFormat = 0;

  const seenQuestions = new Set<string>();

  for (const entry of entries) {
    // 형식 검증
    if (!entry.question || !entry.answer || !entry.category || !entry.department || !entry.team) {
      invalidFormat++;
      continue;
    }

    // 카테고리 유효성
    if (!CATEGORIES.includes(entry.category as typeof CATEGORIES[number])) {
      invalidFormat++;
      continue;
    }

    // 중복 제거 (단순 문자열 비교 — 90% 유사도 근사)
    const normalized = entry.question.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenQuestions.has(normalized)) {
      duplicatesRemoved++;
      continue;
    }
    seenQuestions.add(normalized);

    validEntries.push(entry);
  }

  return {
    totalInput: entries.length,
    passed: validEntries.length,
    duplicatesRemoved,
    invalidFormat,
    entries: validEntries,
  };
}

// ─── KB 적재 ────────────────────────────────────────────────

export async function loadToKB(entries: SyntheticEntry[]): Promise<LoadResult> {
  let totalLoaded = 0;
  let failed = 0;
  const errors: string[] = [];

  // 배치 단위 DB 적재 (500건씩)
  const BATCH_SIZE = 500;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    try {
      await prisma.knowledgeBaseEntry.createMany({
        data: batch.map((entry) => ({
          sourceType: 'synthetic',
          question: entry.question,
          answer: entry.answer,
          category: entry.category,
          isSynthetic: true,
          qualityScore: entry.qualityScore ?? null,
        })),
      });
      totalLoaded += batch.length;
    } catch (error) {
      failed += batch.length;
      errors.push(`Batch ${i / BATCH_SIZE + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`[DataPipeline] KB load complete: ${totalLoaded} loaded, ${failed} failed`);
  return { totalLoaded, failed, errors };
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────

function buildSeedPrompt(
  category: string,
  department: string,
  team: string,
  count: number,
): string {
  return `당신은 IT Help Desk 데이터 생성 전문가입니다.
아래 카테고리에 해당하는 IT 문의-답변 데이터를 ${count}건 생성하세요.

[카테고리] ${category}
[담당 부서] ${department}
[담당 팀] ${team}

규칙:
- 실제 기업 IT Help Desk에서 나올 법한 현실적인 문의
- 질문은 다양한 표현과 상황으로 작성
- 답변은 구체적이고 실행 가능한 안내
- 각 항목은 서로 다른 주제/상황이어야 함

다음 JSON 배열 형식으로만 응답하세요:
[
  {"question": "질문 내용", "answer": "답변 내용"},
  ...
]`;
}

function buildSyntheticPrompt(
  samples: SourceData[],
  count: number,
  targetCategory: string,
): string {
  const sampleText = samples
    .map((s, i) => `예시 ${i + 1}:\n  Q: ${s.question}\n  A: ${s.answer}`)
    .join('\n\n');

  return `당신은 IT Help Desk 데이터 생성 전문가입니다.
아래 예시를 참고하여 유사하지만 새로운 IT 문의-답변을 ${count}건 생성하세요.

[카테고리] ${targetCategory}

[참고 예시]
${sampleText}

규칙:
- 예시를 그대로 복사하지 말 것
- 같은 유형이지만 다른 상황/표현으로 변형
- paraphrase, 시나리오 확장, 상상 기반 신규 케이스 포함
- 질문은 자연스러운 구어체 허용
- 답변은 정확하고 구체적으로

다음 JSON 배열 형식으로만 응답하세요:
[
  {"question": "질문 내용", "answer": "답변 내용"},
  ...
]`;
}

function parseSeedResponse(
  content: string,
  category: string,
  department: string,
  team: string,
): SyntheticEntry[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    // LLM 응답에 줄바꿈이 포함될 수 있으므로 정리
    const cleaned = jsonMatch[0].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: { question?: string; answer?: string }) => item.question && item.answer)
      .map((item: { question: string; answer: string }) => ({
        question: item.question,
        answer: item.answer,
        category,
        department,
        team,
      }));
  } catch {
    return [];
  }
}

function parseSyntheticResponse(
  content: string,
  category: string,
  department: string,
  team: string,
): SyntheticEntry[] {
  return parseSeedResponse(content, category, department, team);
}

function pickRandomSamples(data: SourceData[], count: number): SourceData[] {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
