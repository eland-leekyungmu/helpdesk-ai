/**
 * OpenSearch Serverless 벡터 인덱스 삭제 스크립트
 * 
 * 사용법: node delete-index.mjs <collection-endpoint>
 * 예: node delete-index.mjs https://fqs5x5yt32bmxhrbcr1d.us-east-1.aoss.amazonaws.com
 */

import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION = 'us-east-1';
const INDEX_NAME = 'bedrock-knowledge-base-default-index';

async function deleteIndex(endpoint) {
  const url = new URL(`/${INDEX_NAME}`, endpoint);
  
  const request = new HttpRequest({
    method: 'DELETE',
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      'Content-Type': 'application/json',
      host: url.hostname,
    },
  });

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: REGION,
    service: 'aoss',
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: signedRequest.headers,
  });

  const responseBody = await response.text();
  
  if (response.ok) {
    console.log(`✅ Index "${INDEX_NAME}" deleted successfully`);
    console.log(responseBody);
  } else if (response.status === 404) {
    console.log(`ℹ️ Index "${INDEX_NAME}" does not exist`);
  } else {
    console.error(`❌ Failed to delete index: ${response.status}`);
    console.error(responseBody);
    process.exit(1);
  }
}

const endpoint = process.argv[2];
if (!endpoint) {
  console.error('Usage: node delete-index.mjs <collection-endpoint>');
  console.error('Example: node delete-index.mjs https://xxx.us-east-1.aoss.amazonaws.com');
  process.exit(1);
}

deleteIndex(endpoint);
