/**
 * km-generated-1000.json을 개별 .txt + .metadata.json으로 분리하여
 * KB S3 버킷의 tickets/ 경로에 업로드하는 스크립트
 */
import { readFileSync } from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });

const BUCKET = process.env.KB_S3_BUCKET!;
const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1";

const s3 = new S3Client({ region: REGION });

interface TicketData {
  subject: string;
  question: string;
  internal_note?: string;
  l2_response?: string;
  answer: string;
  category: string;
  department: string;
  team: string;
  tags?: string[];
  resolution_type: string;
  requester?: { name: string; email: string; company?: string };
  agent_l1?: { name: string; email: string };
  agent_l2?: { name: string; email: string; department?: string; team?: string };
}

function buildTxt(t: TicketData): string {
  let content = `[제목] ${t.subject}\n\n[문의]\n${t.question}\n\n[답변]\n${t.answer}\n`;

  if (t.internal_note) {
    content += `\n[내부 메모]\n${t.internal_note}\n`;
  }
  if (t.l2_response) {
    content += `\n[2차 처리자 답변]\n${t.l2_response}\n`;
  }

  return content;
}

function buildMetadata(t: TicketData): object {
  return {
    metadataAttributes: {
      category: t.category,
      department: t.department,
      team: t.team,
      resolution_type: t.resolution_type,
      source_type: "synthetic",
    },
  };
}

async function main() {
  const dataPath = resolve(__dirname, "../data/km-generated-1000.json");
  const tickets: TicketData[] = JSON.parse(readFileSync(dataPath, "utf-8"));

  console.log(`총 ${tickets.length}건 업로드 시작 → s3://${BUCKET}/tickets/`);

  // 기존 tickets/ 에 있는 파일 번호 이후부터 시작 (충돌 방지)
  const startIdx = 1001;
  const batchSize = 20;

  for (let i = 0; i < tickets.length; i += batchSize) {
    const batch = tickets.slice(i, i + batchSize);
    const promises = batch.flatMap((t, j) => {
      const idx = startIdx + i + j;
      const paddedIdx = String(idx).padStart(5, "0");
      const txtKey = `tickets/ticket-${paddedIdx}.txt`;
      const metaKey = `tickets/ticket-${paddedIdx}.txt.metadata.json`;

      return [
        s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: txtKey,
            Body: buildTxt(t),
            ContentType: "text/plain; charset=utf-8",
          })
        ),
        s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: metaKey,
            Body: JSON.stringify(buildMetadata(t)),
            ContentType: "application/json",
          })
        ),
      ];
    });

    await Promise.all(promises);
    console.log(`  ${Math.min(i + batchSize, tickets.length)} / ${tickets.length} 완료`);
  }

  console.log("✅ 전체 업로드 완료");
}

main().catch((err) => {
  console.error("❌ 오류:", err);
  process.exit(1);
});
