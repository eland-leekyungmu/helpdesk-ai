# 첨부파일 기능 코드 생성 계획 (사이클 C)

**작성일**: 2026-05-15

---

- [ ] Step 1: .env에 S3 첨부파일 버킷 환경변수 추가
- [ ] Step 2: src/lib/s3.ts — S3 업로드/Presigned URL 유틸리티
- [ ] Step 3: src/app/api/attachments/upload/route.ts — Presigned PUT URL 발급 API
- [ ] Step 4: src/app/api/attachments/download/route.ts — Presigned GET URL 발급 API
- [ ] Step 5: src/lib/api.ts — getUploadUrl, getDownloadUrl 클라이언트 함수 추가
- [ ] Step 6: src/components/ui/FileUpload.tsx — 파일 업로드 공통 컴포넌트
- [ ] Step 7: src/components/ui/AttachmentList.tsx — 첨부파일 목록/다운로드 컴포넌트
- [ ] Step 8: ticket.service.ts — createTicket에 attachments 저장 연동
- [ ] Step 9: message.service.ts — addMessage에 attachments 저장 연동
- [ ] Step 10: (employee)/new-ticket/page.tsx — 파일 업로드 UI 연동
- [ ] Step 11: (employee)/my-tickets/[id]/page.tsx — 첨부파일 표시
- [ ] Step 12: (agent)/tickets/[id]/page.tsx — 첨부파일 업로드 + 표시
- [ ] Step 13: TypeScript 진단 확인
- [ ] Step 14: audit.md 업데이트
