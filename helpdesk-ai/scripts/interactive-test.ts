import 'dotenv/config';
import * as readline from 'readline';
import { analyzeIntent, generateAnswer, transformToPublic, routeToModel } from '../src/services/ai.service';
import { prisma } from '../src/lib/prisma';
import { type Attachment } from '../src/shared/types/ai';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   IT Help Desk AI - Interactive Test                    ║');
  console.log('║   질문을 입력하면 AI 파이프라인 결과를 보여줍니다       ║');
  console.log('║   종료: exit 또는 Ctrl+C                               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  while (true) {
    const question = await ask('\n💬 질문 입력: ');
    if (question.trim().toLowerCase() === 'exit') break;
    if (!question.trim()) continue;

    // 첨부파일 여부 확인
    const attachInput = await ask('📎 첨부파일 있음? (y/n, 기본 n): ');
    let attachments: Attachment[] | undefined;
    if (attachInput.trim().toLowerCase() === 'y') {
      const filepath = await ask('   파일 경로 (예: ./data/test.png): ');
      const filename = filepath.trim().split(/[/\\]/).pop() || 'file';
      attachments = [{
        filename,
        mimeType: guessMimeType(filename),
        size: 1024,
        url: filepath.trim(),
      }];
    }

    const modelType = routeToModel(attachments);
    console.log(`\n⏳ 처리 중... (모델: ${modelType === 'heavy' ? '🔴 HEAVY' : '🟢 LIGHTWEIGHT'})\n`);

    try {
      // 1. 의도 분석
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 [Step 1] 의도 분석 (analyzeIntent)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const { intentResult, usage: intentUsage } = await analyzeIntent(question, attachments);
      console.log(`  부서: ${intentResult.department || '(미확인)'}`);
      console.log(`  팀:   ${intentResult.team || '(미확인)'}`);
      console.log(`  카테고리: ${intentResult.categories.join(', ')}`);
      console.log(`  소요시간: ${intentUsage.durationMs}ms`);

      // 2. 담당자 매핑
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 [Step 2] 담당자 매핑');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (intentResult.team) {
        const agents = await prisma.user.findMany({
          where: { role: 'agent_l2', isActive: true, team: { name: intentResult.team } },
          include: { team: { include: { department: true } } },
        });
        if (agents.length > 0) {
          console.log(`  매핑된 2차 처리자 (${intentResult.team}):`);
          agents.forEach((a: { name: string; email: string }) => console.log(`    - ${a.name} (${a.email})`));
        } else {
          console.log(`  ⚠️ ${intentResult.team}에 매핑된 2차 처리자 없음 → 1차 처리자 큐로`);
        }
      } else {
        console.log('  ⚠️ 팀 미확인 → 1차 처리자 큐로');
      }

      // 3. RAG 검색 + 답변 생성
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🤖 [Step 3] RAG 검색 + 답변 생성 (generateAnswer)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const answer = await generateAnswer(undefined as unknown as string, question, attachments);
      console.log(`  신뢰도 (1차 문서): ${(answer.confidence * 100).toFixed(1)}% (임계값: 50%)`);
      console.log(`  모델: ${answer.modelUsed || '(답변 생성 안 함)'}`);
      console.log(`  모델 라우팅: ${modelType === 'heavy' ? '🔴 HEAVY (첨부파일 있음)' : '🟢 LIGHTWEIGHT (텍스트만)'}`);
      console.log(`  참조 소스: ${answer.sources.length}건`);
      if (answer.sources.length > 0) {
        console.log('  참조 내용:');
        answer.sources.slice(0, 3).forEach((s, i) =>
          console.log(`    [${i + 1}] score=${(s.score * 100).toFixed(1)}% | ${s.category} | ${s.question.substring(0, 60)}...`)
        );
      }

      // 4. 라우팅 판정
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔀 [Step 4] 라우팅 판정');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (answer.confidence >= 0.5) {
        console.log('  ✅ AI 직접 답변 (1차 문서 confidence >= 50%)');
      } else if (intentResult.team) {
        const agents = await prisma.user.findMany({
          where: { role: 'agent_l2', isActive: true, team: { name: intentResult.team } },
        });
        const assignee = agents.length > 0 ? agents[0] : null;
        console.log(`  ➡️ 2차 처리자에게 바로 전달`);
        console.log(`     부서: ${intentResult.department}`);
        console.log(`     팀: ${intentResult.team}`);
        if (assignee) {
          console.log(`     담당자: ${assignee.name} (${assignee.email})`);
        }
        console.log(`     (1차 문서 confidence ${(answer.confidence * 100).toFixed(1)}% < 50% → 2차 문서 검색 후 분배)`);
      } else {
        console.log('  ⬆️ 1차 처리자 큐로 에스컬레이션');
      }

      // 5. 생성된 답변
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💡 [Step 5] 결과');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (answer.answer) {
        console.log(answer.answer);
      } else {
        console.log('  (AI 답변 없음 — 2차 처리자에게 원본 질문이 그대로 전달됩니다)');
      }
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('❌ 에러:', error instanceof Error ? error.message : error);
    }
  }

  rl.close();
  await prisma.$disconnect();
  console.log('\n👋 종료');
}

main();

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] || 'application/octet-stream';
}
