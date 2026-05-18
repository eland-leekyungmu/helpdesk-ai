import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.ATTACHMENT_BUCKET || "helpdesk-ai-attachments-dev";
const EXPIRES_IN = parseInt(process.env.ATTACHMENT_PRESIGNED_EXPIRES_SEC || "900");
export const MAX_FILE_SIZE_BYTES = parseInt(process.env.ATTACHMENT_MAX_SIZE_MB || "200") * 1024 * 1024;
export const MAX_FILE_COUNT = parseInt(process.env.ATTACHMENT_MAX_COUNT || "10");

export interface AttachmentMeta {
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

/**
 * 업로드용 Presigned PUT URL 발급
 */
export async function getPresignedUploadUrl(
  ticketId: string,
  filename: string,
  mimeType: string,
  size: number,
): Promise<{ uploadUrl: string; key: string }> {
  const ext = filename.split(".").pop() || "bin";
  const key = `tickets/${ticketId}/${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
    ContentLength: size,
    Metadata: {
      originalFilename: encodeURIComponent(filename),
      ticketId,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });
  return { uploadUrl, key };
}

/**
 * 다운로드용 Presigned GET URL 발급
 */
export async function getPresignedDownloadUrl(
  key: string,
  filename: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
  });

  return getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });
}

/**
 * S3 객체 삭제
 */
export async function deleteAttachment(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
