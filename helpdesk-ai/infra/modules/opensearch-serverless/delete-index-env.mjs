/**
 * OpenSearch Serverless 인덱스 삭제 - 환경변수에서 직접 자격증명 사용
 */
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION = 'ap-northeast-2';
const INDEX_NAME = 'bedrock-knowledge-base-default-index';

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
};

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
    credentials,
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
    console.log(`Index deleted successfully`);
    console.log(responseBody);
  } else if (response.status === 404) {
    console.log(`Index does not exist`);
  } else {
    console.error(`Failed to delete index: ${response.status}`);
    console.error(responseBody);
    process.exit(1);
  }
}

const endpoint = process.argv[2] || 'https://fqs5x5yt32bmxhrbcr1d.us-east-1.aoss.amazonaws.com';
deleteIndex(endpoint);
