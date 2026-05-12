/**
 * OpenSearch Serverless 벡터 인덱스 생성 - 환경변수에서 직접 자격증명 사용
 */
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION = 'us-east-1';
const INDEX_NAME = 'bedrock-knowledge-base-default-index';

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
};

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
          parameters: { m: 16, ef_construction: 512 },
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
    credentials,
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
    console.log(`Index created successfully (dimension: 1024, cosine)`);
    console.log(responseBody);
  } else {
    console.error(`Failed to create index: ${response.status}`);
    console.error(responseBody);
    process.exit(1);
  }
}

const endpoint = process.argv[2] || 'https://fqs5x5yt32bmxhrbcr1d.us-east-1.aoss.amazonaws.com';
createIndex(endpoint);
