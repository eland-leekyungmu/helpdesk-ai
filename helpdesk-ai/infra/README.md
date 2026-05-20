# Helpdesk AI - Infrastructure (Terraform)

## 사전 요구사항

1. **AWS CLI** 설치 + 프로필 설정
   ```bash
   aws configure
   # Access Key ID, Secret Access Key, Region (ap-northeast-2) 입력
   ```

2. **Terraform >= 1.9** 설치
   - https://developer.hashicorp.com/terraform/install

3. **도메인 NS 레코드 설정**
   - `terraform apply` 후 출력되는 `route53_name_servers`를 도메인 등록기관에 설정

4. **Bedrock 모델 접근 요청** (us-east-1 콘솔)
   - Claude 3.5 Sonnet
   - Claude 3 Haiku
   - Titan Embeddings v2

## 실행 순서

### 1. Bootstrap (최초 1회)

```bash
cd infra/bootstrap
terraform init
terraform apply
```

S3 버킷(`helpdesk-ai-tfstate-dev`)과 DynamoDB 테이블(`helpdesk-ai-tfstate-lock`)이 생성됩니다.

### 2. Dev 환경 프로비저닝

```bash
cd infra/environments/dev
terraform init
terraform plan
terraform apply
```

### 3. 프로비저닝 후 확인

```bash
# 출력값 확인
terraform output

# 주요 출력:
# - app_url: https://ai-dlc.innoplecloud.net
# - rds_endpoint: helpdesk-ai-rds-dev.xxx.ap-northeast-2.rds.amazonaws.com:5432
# - ecr_repository_url: xxx.dkr.ecr.ap-northeast-2.amazonaws.com/helpdesk-ai
# - route53_name_servers: [ns-xxx.awsdns-xx.com, ...]
# - inbound_email_address: support@help.ai-dlc.innoplecloud.net
```

## 디렉토리 구조

```
infra/
├── bootstrap/          # tfstate S3 + DynamoDB (최초 1회)
├── modules/            # 재사용 Terraform 모듈
│   ├── vpc/
│   ├── rds/
│   ├── sqs/
│   ├── s3/
│   ├── ses/
│   ├── ses-inbound/    # us-east-1 (Lambda 포함)
│   ├── opensearch-serverless/  # us-east-1
│   ├── bedrock-kb/     # us-east-1
│   ├── ecs/
│   ├── alb/
│   ├── ecr/
│   ├── iam/
│   ├── secrets/
│   ├── route53-acm/
│   ├── cloudwatch/     # (TODO)
│   ├── monitoring/     # (TODO)
│   └── codecommit-cicd/  # (TODO)
└── environments/
    ├── dev/            # 실제 apply 대상
    └── prod/           # placeholder
```

## 비용 (dev 환경 월 예상)

| 항목 | 월 예상 |
|---|---|
| OpenSearch Serverless (2+2 OCU) | ~$350 |
| NAT Gateway × 2 | ~$70 |
| RDS db.t4g.small | ~$35 |
| ECS Fargate (1 vCPU / 2 GB) | ~$36 |
| ALB | ~$20 |
| 기타 | ~$30 |
| **합계** | **~$540/월** |

## 삭제 (비용 절감)

```bash
cd infra/environments/dev
terraform destroy
```

⚠️ RDS 데이터가 삭제됩니다 (dev 환경은 final snapshot 미생성).
