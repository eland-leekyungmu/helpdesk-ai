import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const sqsClient = new SQSClient({ region: process.env.TARGET_SQS_REGION });
const s3Client = new S3Client({});

export const handler = async (event) => {
  console.log('SES Event received:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const sesMessage = record.ses;
    const messageId = sesMessage.mail.messageId;
    const source = sesMessage.mail.source;
    const subject = sesMessage.mail.commonHeaders?.subject || '(no subject)';
    const recipients = sesMessage.receipt.recipients;

    // Get raw email from S3
    const bucket = process.env.EMAIL_BUCKET;
    let rawEmail = '';

    try {
      const s3Response = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: messageId,
      }));
      rawEmail = await s3Response.Body.transformToString();
    } catch (err) {
      console.error('Failed to get email from S3:', err);
    }

    // Forward to SQS in ap-northeast-2
    const sqsMessage = {
      messageId,
      source,
      subject,
      recipients,
      timestamp: sesMessage.mail.timestamp,
      headers: sesMessage.mail.headers,
      bucket,
      key: messageId,
      rawEmailPreview: rawEmail.substring(0, 5000),
    };

    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.TARGET_SQS_URL,
      MessageBody: JSON.stringify(sqsMessage),
      MessageAttributes: {
        source: { DataType: 'String', StringValue: source },
        subject: { DataType: 'String', StringValue: subject.substring(0, 256) },
      },
    }));

    console.log(`Forwarded email ${messageId} from ${source} to SQS`);
  }

  return { statusCode: 200 };
};
