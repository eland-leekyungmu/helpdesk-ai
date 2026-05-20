# Build Instructions

## Prerequisites
- **Node.js**: v20+
- **Package Manager**: npm
- **Database**: PostgreSQL 15+ (RDS ap-northeast-2)
- **AWS**: Bedrock, S3, SES 접근 가능한 자격 증명

## Environment Variables
`.env` 파일 참조 (DATABASE_URL, AWS 자격 증명, BEDROCK_KB_ID 등)

## Build Steps

### 1. Install Dependencies
```bash
cd helpdesk-ai
npm install
```

### 2. Prisma Client 생성
```bash
npx prisma generate
```

### 3. DB 마이그레이션 (최초 또는 스키마 변경 시)
```bash
npx prisma db push
```

### 4. Build (Production)
```bash
npm run build
```

### 5. 로컬 개발 서버
```bash
npm run dev
# → http://localhost:3000
```

## Build 성공 확인
- `next build` 완료 시 `.next/` 디렉토리 생성
- 컴파일 에러 없음
- Prisma Client 정상 생성

## Troubleshooting

### Prisma Client 에러
```bash
npx prisma generate
```

### 타입 에러
```bash
npx tsc --noEmit
```
