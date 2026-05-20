# 테스트 질문 리스트 (라우팅 유형별)

AI 라우팅 판정 기준:
- **신뢰도 ≥ 0.5** → AI 직접 답변 (티켓 자동 완료)
- **신뢰도 < 0.5 + 팀 매칭 성공** → 2차 처리자 자동 분배
- **신뢰도 < 0.5 + 팀 매칭 실패** → 1차 처리자 큐 에스컬레이션

---

## 1. AI가 바로 응답하는 질문 (신뢰도 ≥ 0.5)

KB에 유사 문의-답변이 충분히 적재된 주제입니다. AI가 자동으로 답변하고 티켓이 resolved 됩니다.

| # | 제목 | 질문 내용 | 예상 카테고리 |
|---|------|-----------|---------------|
| 1 | VPN 접속 오류 | 재택근무 중인데 VPN 접속이 안 됩니다. 연결 시도하면 타임아웃이 발생합니다. | 네트워크 |
| 2 | 비밀번호 초기화 요청 | 사내 시스템 비밀번호를 잊어버렸습니다. 비밀번호 초기화 방법을 알려주세요. | 계정/권한 관리 |
| 3 | 아웃룩 메일 발송 오류 | 아웃룩에서 메일 발송 시 "전송 실패" 오류가 발생합니다. 첨부파일 용량 제한이 있나요? | 그룹웨어 (메일/캘린더/결재) |

### 테스트 방법
```bash
curl -s -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {EMPLOYEE_TOKEN}" \
  -d '{"subject":"VPN 접속 오류","content":"재택근무 중인데 VPN 접속이 안 됩니다. 연결 시도하면 타임아웃이 발생합니다."}'
```

### 기대 결과
- `confidenceScore` ≥ 0.5
- `aiResponse` 필드에 답변 내용 포함
- `status`: "resolved"
- `assignedTo`: null

---

## 2. AI가 2차 처리자에게 자동 분배하는 질문 (신뢰도 < 0.5 + 팀 매칭 성공)

KB에 유사 답변이 부족하지만, 의도 분석으로 담당 팀을 특정할 수 있는 주제입니다.

| # | 제목 | 질문 내용 | 예상 분배 팀 |
|---|------|-----------|--------------|
| 1 | SAP 커스텀 리포트 개발 요청 | SAP에서 월별 매출 분석 커스텀 리포트를 새로 개발해주세요. T-code ZFI001 기반으로 부서별 집계 기능이 필요합니다. | ERP팀 (IT개발부서) |
| 2 | 매장 POS 시스템 신규 기능 | 신규 오픈 매장에 POS 시스템 설치가 필요합니다. 매장코드 S2026-045이고 다음 주 월요일까지 세팅 부탁드립니다. | FCM팀 (시스템운영부서) |
| 3 | 데이터 파이프라인 장애 | Airflow DAG 'daily_sales_etl'이 3일째 실패하고 있습니다. S3 → Redshift 적재 단계에서 타임아웃이 발생합니다. 로그 확인 부탁드립니다. | 데이터플랫폼팀 (데이터플랫폼부서) |

### 테스트 방법
```bash
curl -s -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {EMPLOYEE_TOKEN}" \
  -d '{"subject":"SAP 커스텀 리포트 개발 요청","content":"SAP에서 월별 매출 분석 커스텀 리포트를 새로 개발해주세요. T-code ZFI001 기반으로 부서별 집계 기능이 필요합니다."}'
```

### 기대 결과
- `confidenceScore` < 0.5
- `aiResponse`: null (AI 답변 없음)
- `status`: "in_progress" 또는 "open"
- `assignedTo`: 해당 팀의 agent_l2 ID

---

## 3. AI가 1차 처리자에게 넘기는 질문 (신뢰도 < 0.5 + 팀 매칭 실패)

KB에 유사 답변이 없고, 의도 분석으로도 담당 팀을 특정할 수 없는 모호한 주제입니다.

| # | 제목 | 질문 내용 | 예상 결과 |
|---|------|-----------|-----------|
| 1 | 시스템 전반 문의 | 어제부터 여러 시스템이 동시에 느려졌습니다. SAP도 느리고 그룹웨어도 느리고 인터넷도 느립니다. 뭐가 문제인지 모르겠습니다. | 1차 처리자 큐 |
| 2 | 복합 업무 요청 | 신입사원 입사 처리 부탁드립니다. 계정 생성, 노트북 지급, 사무실 좌석 배정, 사내 교육 등록 모두 필요합니다. | 1차 처리자 큐 |
| 3 | 비IT 문의 | 사무실 에어컨이 고장났습니다. 수리 요청은 어디로 해야 하나요? 시설관리팀 연락처를 알려주세요. | 1차 처리자 큐 |

### 테스트 방법
```bash
curl -s -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {EMPLOYEE_TOKEN}" \
  -d '{"subject":"시스템 전반 문의","content":"어제부터 여러 시스템이 동시에 느려졌습니다. SAP도 느리고 그룹웨어도 느리고 인터넷도 느립니다. 뭐가 문제인지 모르겠습니다."}'
```

### 기대 결과
- `confidenceScore` < 0.5
- `aiResponse`: null (AI 답변 없음)
- `status`: "open"
- `assignedTo`: null (1차 처리자 큐에 대기)

---

## 참고: 라우팅 판정 로직 요약

```
티켓 생성
  → AI 의도 분석 (카테고리/부서/팀 추정)
  → KB 검색 (1차 처리 문서)
  → 신뢰도 산출 (RAG 결과 평균 score)
  
  IF 신뢰도 ≥ 0.5:
    → AI 직접 답변 생성 → 티켓 resolved (ai_auto)
    
  ELSE IF 신뢰도 < 0.5:
    → KB 검색 (2차 처리 문서)
    → 의도 분석 결과의 team으로 agent_l2 조회
    
    IF agent_l2 존재:
      → 해당 agent에게 자동 분배 → 티켓 in_progress
      
    ELSE:
      → 1차 처리자 큐 에스컬레이션 → 티켓 open (assignedTo: null)
```

---

## 테스트 실행 토큰 획득

```bash
# employee 토큰 획득
EMPLOYEE_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kim@company.com","password":"1234"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['token'])")
```
