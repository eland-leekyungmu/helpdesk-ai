import "dotenv/config";
import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  HeadBucketCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "ap-northeast-2";
const BUCKET = process.env.ATTACHMENT_BUCKET || "helpdesk-ai-attachments-dev";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function bucketExists(): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`\n🪣  S3 버킷 생성: ${BUCKET} (${REGION})\n`);

  // 1. 버킷 존재 여부 확인
  if (await bucketExists()) {
    console.log("✅ 버킷이 이미 존재합니다. CORS/정책 설정만 업데이트합니다.");
  } else {
    // 2. 버킷 생성
    await s3.send(
      new CreateBucketCommand({
        Bucket: BUCKET,
        ...(REGION !== "us-east-1" && {
          CreateBucketConfiguration: { LocationConstraint: REGION as any },
        }),
      })
    );
    console.log("✅ 버킷 생성 완료");
  }

  // 3. 퍼블릭 액세스 차단 (보안)
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    })
  );
  console.log("✅ 퍼블릭 액세스 차단 설정 완료");

  // 4. CORS 설정 (Presigned URL 업로드를 위해 PUT 허용)
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["*"], // 운영 환경에서는 실제 도메인으로 제한
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag", "Content-Length"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
  console.log("✅ CORS 설정 완료 (PUT/GET 허용)");

  // 5. 수명 주기 정책 — pending 파일 7일 후 자동 삭제
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: BUCKET,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "delete-pending-uploads",
            Status: "Enabled",
            Filter: { Prefix: "tickets/pending-" },
            Expiration: { Days: 7 },
          },
        ],
      },
    })
  );
  console.log("✅ 수명 주기 정책 설정 완료 (pending 파일 7일 후 삭제)");

  console.log(`\n🎉 완료! 버킷 준비됨: s3://${BUCKET}\n`);
}

main().catch((err) => {
  console.error("❌ 오류:", err.message || err);
  process.exit(1);
});
