# Unit 5 (Infrastructure) — Infrastructure Design Clarification

## 목적
Q4 (SES 인바운드 이메일 도메인) 설명 + 재질의

## 확정 답변 (참조)
- Q1: **A** — 도메인 `ai-dlc.innoplecloud.net`
- Q2: **C** — 1 vCPU / 2 GB
- Q3: **A** — `helpdesk-ai-{resource}-{env}`
- Q5: **A** — Claude 3.5 Sonnet + Haiku + Titan Embeddings v2

---

## 🔎 Q4 설명: SES 인바운드 이메일 도메인

### 핵심 답변
**"아무 이메일"이 아니라, DNS를 제어할 수 있는 도메인이 필요합니다.**

SES 인바운드는 다음과 같이 동작합니다:

```
[사용자] → support@help.ai-dlc.innoplecloud.net 으로 이메일 발송
              ↓
[DNS] MX 레코드 조회 → inbound-smtp.{region}.amazonaws.com 으로 라우팅
              ↓
[SES] 이메일 수신 → Receipt Rule 실행
              ↓
[S3] 이메일 원본 저장 → [Lambda/SQS] 파싱 트리거
```

### 필요 조건
1. **도메인 DNS 제어 권한** — Route 53에서 MX 레코드를 SES 엔드포인트로 설정
2. **SES 도메인 인증** — DKIM(TXT 3개) + SPF(TXT) + MX 레코드
3. **별도 도메인 구매 불필요** — `innoplecloud.net`의 서브도메인(`help.ai-dlc.innoplecloud.net` 등)을 사용하면 됨

### ⚠️ 중요: SES 인바운드 리전 제한

**ap-northeast-2(서울)에서는 SES 이메일 수신(인바운드)이 지원되지 않습니다.** 발송만 가능합니다.

SES 인바운드 지원 리전: `us-east-1`, `eu-west-1`, `us-west-2`

따라서 아키텍처가 약간 변경됩니다:
- **SES 인바운드**: us-east-1에 구성 (Receipt Rule + S3 + Lambda)
- **Lambda**: 수신 이메일을 ap-northeast-2의 SQS(`helpdesk-email-inbound`)로 전달
- **SES 아웃바운드**: ap-northeast-2에서 발송 (이건 서울 리전 지원)

### 비용
- SES 인바운드: 수신 1000건당 $0.10 (거의 무료)
- Lambda: 호출당 과금 (거의 무료)
- 추가 도메인 구매 불필요 (기존 도메인의 서브도메인 사용)

---

## Clarification Question Q4

`ai-dlc.innoplecloud.net`의 DNS를 Route 53에서 관리하고 있거나, 관리할 수 있는 상태인가요? 그리고 SES 인바운드를 어떻게 처리할까요?

A) Route 53에서 DNS 관리 중 (또는 이관 가능) — 서브도메인 `help.ai-dlc.innoplecloud.net`을 SES 인바운드용으로 사용 · us-east-1에 SES 인바운드 구성 · Lambda로 ap-northeast-2 SQS 전달
B) DNS 관리 가능 — 하지만 dev에서는 SES 인바운드 미구성 · 웹 접수만 테스트 · 이메일 인바운드는 추후 구성
C) DNS 제어 불가 — 별도 도메인 구매 필요 (Route 53에서 직접 구매 가능 · 연 $10~15)
D) Other (please describe after [Answer]: tag below)

**추가 검토 결과 (Gmail 방식 등)**: Gmail 전달 방식은 Google API 의존성 추가 · 비전문적 · 지연 발생으로 부적합. MVP에 인바운드 필수이므로 **SES 인바운드(us-east-1) + 서브도메인**이 최적.

[Answer]: 
A로 해야겠네.
---

## 응답 후 다음 단계
답변 확정 후 즉시 `infrastructure-design.md` + `deployment-architecture.md` 생성 → Completion 메시지
