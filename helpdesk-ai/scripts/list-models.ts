import 'dotenv/config';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';

async function main() {
  const client = new BedrockClient({ region: process.env.AWS_REGION });
  const cmd = new ListFoundationModelsCommand({ byProvider: 'Anthropic' });
  const response = await client.send(cmd);
  const models = response.modelSummaries?.filter(m => m.modelId?.includes('claude')) || [];
  models.forEach(m => console.log(m.modelId, '-', m.modelName));
}
main().catch(e => console.error(e.message));
