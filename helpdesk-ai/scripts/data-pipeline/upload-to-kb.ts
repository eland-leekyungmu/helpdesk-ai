import 'dotenv/config';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { BedrockAgentClient, StartIngestionJobCommand } from '@aws-sdk/client-bedrock-agent';

const S3_BUCKET = 'helpdesk-ai-kb-docs-dev';
const KB_ID = process.env.BEDROCK_KB_ID || '';
const REGION = process.env.AWS_REGION || 'ap-northeast-2';

const s3 = new S3Client({ region: REGION });
const bedrockAgent = new BedrockAgentClient({ region: REGION });

interface KBEntry {
  subject: string;
  question: string;
  answer: string;
  category: string;
  department: string;
  team: string;
  tags: string[];
  resolution_type: string;
  [key: string]: unknown;
}

async function main() {
  const inputPath = process.argv[2] || resolve(__dirname, '../../data/generated-100.json');
  console.log(`=== KB 업로드 시작 ===`);
  console.log(`입력: ${inputPath}`);
  console.log(`S3 버킷: ${S3_BUCKET}`);
  console.log(`KB ID: ${KB_ID}\n`);

  // 1. 데이터 로드
  const raw = await readFile(inputPath, 'utf-8');
  const entries: KBEntry[] = JSON.parse(raw);
  console.log(`로드: ${entries.length}건\n`);

  // 2. 각 엔트리를 개별 파일로 S3에 업로드
  // Bedrock KB는 각 문서를 개별 파일로 인식하므로, 엔트리별로 분리
  console.log('[Step 1] S3 업로드...');
  let uploaded = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // KB에 적재될 문서 형태: question + answer를 본문으로, 메타데이터는 별도
    const docContent = formatForKB(entry);
    const metadata = buildMetadata(entry);

    const key = `tickets/ticket-${String(i + 1).padStart(5, '0')}.txt`;
    const metadataKey = `tickets/ticket-${String(i + 1).padStart(5, '0')}.txt.metadata.json`;

    try {
      // 본문 업로드
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: docContent,
        ContentType: 'text/plain; charset=utf-8',
      }));

      // 메타데이터 업로드 (Bedrock KB 메타데이터 형식)
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: metadataKey,
        Body: JSON.stringify(metadata),
        ContentType: 'application/json',
      }));

      uploaded++;
    } catch (error) {
      console.error(`  [${i + 1}] 업로드 실패:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`  → ${uploaded}/${entries.length}건 업로드 완료\n`);

  // 3. KB Ingestion 트리거
  console.log('[Step 2] KB Ingestion 시작...');
  try {
    // 데이터 소스 ID가 필요 — KB에 연결된 데이터 소스 조회
    // 일단 KB ID로 StartIngestionJob 호출
    const response = await bedrockAgent.send(new StartIngestionJobCommand({
      knowledgeBaseId: KB_ID,
      dataSourceId: process.env.BEDROCK_KB_DATASOURCE_ID || '',
    }));
    console.log(`  → Ingestion Job 시작: ${response.ingestionJob?.ingestionJobId}`);
    console.log(`  → 상태: ${response.ingestionJob?.status}`);
  } catch (error) {
    console.error(`  → Ingestion 실패:`, error instanceof Error ? error.message : error);
    console.log('  → 수동으로 Bedrock 콘솔에서 Sync 실행해주세요.');
  }

  console.log('\n=== 완료 ===');
}

function formatForKB(entry: KBEntry): string {
  // KB 검색에 최적화된 문서 형태
  let doc = `[제목] ${entry.subject}\n\n`;
  doc += `[문의]\n${entry.question}\n\n`;
  doc += `[답변]\n${entry.answer}\n`;

  if (entry.internal_note) {
    doc += `\n[내부 메모]\n${entry.internal_note}\n`;
  }
  if (entry.l2_response) {
    doc += `\n[2차 처리자 답변]\n${entry.l2_response}\n`;
  }

  return doc;
}

function buildMetadata(entry: KBEntry) {
  // Bedrock KB 메타데이터 형식 (단순 key-value)
  return {
    metadataAttributes: {
      category: entry.category,
      department: entry.department || '없음',
      team: entry.team || '없음',
      resolution_type: entry.resolution_type,
      source_type: 'synthetic',
    },
  };
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
