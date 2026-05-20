import 'dotenv/config';
import { BedrockAgentClient, ListDataSourcesCommand, StartIngestionJobCommand } from '@aws-sdk/client-bedrock-agent';

const KB_ID = process.env.BEDROCK_KB_ID || 'FNZWM9CGC2';
const REGION = process.env.AWS_REGION || 'ap-northeast-2';

async function main() {
  const client = new BedrockAgentClient({ region: REGION });

  // 1. 데이터 소스 목록 조회
  console.log('KB ID:', KB_ID);
  const listResp = await client.send(new ListDataSourcesCommand({ knowledgeBaseId: KB_ID }));
  const dataSources = listResp.dataSourceSummaries || [];
  console.log('Data Sources:', dataSources.length);
  dataSources.forEach(ds => console.log(`  - ${ds.dataSourceId} (${ds.name}) [${ds.status}]`));

  if (dataSources.length === 0) {
    console.error('데이터 소스가 없습니다.');
    return;
  }

  // 2. 첫 번째 데이터 소스로 Sync 시작
  const dsId = dataSources[0].dataSourceId!;
  console.log(`\nSync 시작: dataSourceId=${dsId}`);

  const syncResp = await client.send(new StartIngestionJobCommand({
    knowledgeBaseId: KB_ID,
    dataSourceId: dsId,
  }));

  console.log(`Ingestion Job ID: ${syncResp.ingestionJob?.ingestionJobId}`);
  console.log(`Status: ${syncResp.ingestionJob?.status}`);
  console.log('\nSync가 시작되었습니다. 완료까지 1~2분 소요됩니다.');
}

main().catch(e => console.error('Error:', e.message));
