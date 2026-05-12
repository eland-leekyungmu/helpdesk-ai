/**
 * OpenSearch Serverless 벡터 인덱스 생성 스크립트
 * Bedrock KB가 사용할 인덱스를 미리 생성합니다.
 * 
 * 사용법: node create-index.mjs <collection-endpoint>
 * 예: node create-index.mjs https://fqs5x5yt32bmxhrbcr1d.us-east-1.aoss.amazonaws.com
 */

import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION = 'us-east-1';
const INDEX_NAME = 'bedrock-knowledge-base-default-index';

const indexBody = {
  settings: {
    'index.knn': true,
    'number_of_shards': 2,
    'number_of_replicas': 0
  },
  mappings: {
    properties: {
      'bedrock-knowledge-base-default-vector': {
        type: 'knn_vector',
        dimension: 1024,
        method: {
          engine: 'faiss',
          name: 'hnsw',
          parameters: {
            m: 16,
            ef_construction: 512
          },
          space_type: 'l2'
        }
      },
      'AMAZON_BEDROCK_METADATA': {
        type: 'text',
        index: false
      },
      'AMAZON_BEDROCK_TEXT_CHUNK': {
        type: 'text'
      }
    }
  }
};

async function createIndex(endpoint) {
  const url = new URL(`/${INDEX_NAME}`, endpoint);
  
  const request = new HttpRequest({
    method: 'PUT',
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      'Content-Type': 'application/json',
      host: url.hostname,
    },
    body: JSON.stringify(indexBody),
  });

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: REGION,
    service: 'aoss',
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: signedRequest.headers,
    body: JSON.stringify(indexBody),
  });

  const responseBody = await response.text();
  
  if (response.ok) {
    console.log(`✅ Index "${INDEX_NAME}" created successfully`);
    console.log(responseBody);
  } else if (response.status === 400 && responseBody.includes('already exists')) {
    console.log(`ℹ️ Index "${INDEX_NAME}" already exists`);
  } else {
    console.error(`❌ Failed to create index: ${response.status}`);
    console.error(responseBody);
    process.exit(1);
  }
}

const endpoint = process.argv[2];
if (!endpoint) {
  console.error('Usage: node create-index.mjs <collection-endpoint>');
  console.error('Example: node create-index.mjs https://xxx.us-east-1.aoss.amazonaws.com');
  process.exit(1);
}

createIndex(endpoint);
