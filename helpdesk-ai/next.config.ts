import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@aws-sdk/client-bedrock-runtime",
    "@aws-sdk/client-bedrock-agent-runtime",
    "@aws-sdk/client-bedrock-agent",
    "@aws-sdk/client-s3",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "bcrypt",
    "bcryptjs",
    "jsonwebtoken",
    "pdf-parse",
  ],
};

export default nextConfig;
