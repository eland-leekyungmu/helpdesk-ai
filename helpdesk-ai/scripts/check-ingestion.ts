import 'dotenv/config';
import { BedrockAgentClient, GetIngestionJobCommand } from '@aws-sdk/client-bedrock-agent';

const KB_ID = process.env.BEDROCK_KB_ID || 'FNZWM9CGC2';
const DS_ID = '0P02H9ZTOC';
const JOB_ID = 'PWECWW74GR';

async function main() {
  const client = new BedrockAgentClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });

  const resp = await client.send(new GetIngestionJobCommand({
    knowledgeBaseId: KB_ID,
    dataSourceId: DS_ID,
    ingestionJobId: JOB_ID,
  }));

  const job = resp.ingestionJob;
  console.log('Status:', job?.status);
  console.log('Statistics:', JSON.stringify(job?.statistics, null, 2));
  console.log('Failure Reasons:', JSON.stringify(job?.failureReasons, null, 2));
}

main().catch(e => console.error('Error:', e.message));
