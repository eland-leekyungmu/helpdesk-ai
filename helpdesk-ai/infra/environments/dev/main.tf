# =============================================================
# Helpdesk AI - Dev Environment (Single State)
# All modules called from here. Terraform resolves dependencies.
# =============================================================

# --- DNS & TLS ---
module "route53_acm" {
  source      = "../../modules/route53-acm"
  domain_name = var.domain_name
}

# --- Network ---
module "vpc" {
  source       = "../../modules/vpc"
  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
}

# --- Storage ---
module "s3" {
  source       = "../../modules/s3"
  project_name = var.project_name
  environment  = var.environment
}

# --- Database ---
module "rds" {
  source                = "../../modules/rds"
  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.security_group_id
  instance_class        = var.rds_instance_class
}

# --- Messaging ---
module "sqs" {
  source       = "../../modules/sqs"
  project_name = var.project_name
  environment  = var.environment
}

# --- Secrets ---
module "secrets" {
  source       = "../../modules/secrets"
  project_name = var.project_name
  environment  = var.environment
  db_endpoint  = module.rds.endpoint
  db_name      = module.rds.db_name
  db_username  = module.rds.username
  db_password  = module.rds.password
}

# --- Container Registry ---
module "ecr" {
  source = "../../modules/ecr"
}

# --- Load Balancer ---
module "alb" {
  source             = "../../modules/alb"
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  certificate_arn    = module.route53_acm.certificate_validated_arn
  access_logs_bucket = module.s3.alb_logs_bucket_id
}

# --- Compute ---
module "ecs" {
  source                = "../../modules/ecs"
  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_security_group_id = module.alb.security_group_id
  target_group_arn      = module.alb.target_group_arn
  ecr_repository_url    = module.ecr.repository_url
  task_role_arn         = module.iam.ecs_task_role_arn
  execution_role_arn    = module.iam.ecs_execution_role_arn
  cpu                   = var.ecs_cpu
  memory                = var.ecs_memory
  desired_count         = var.ecs_desired_count
  db_url_secret_arn     = module.secrets.db_url_secret_arn
  jwt_secret_arn        = module.secrets.jwt_secret_arn
  log_group_name        = "/ecs/${var.project_name}-${var.environment}"
}

# --- ALB DNS Record (직접 생성 - 모듈 이중 호출 제거) ---
resource "aws_route53_record" "alb_alias" {
  zone_id = module.route53_acm.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}

# --- Email (Outbound - ap-northeast-2) ---
module "ses" {
  source          = "../../modules/ses"
  project_name    = var.project_name
  environment     = var.environment
  domain_name     = var.domain_name
  route53_zone_id = module.route53_acm.zone_id
}

# --- Email (Inbound - us-east-1) ---
module "ses_inbound" {
  source = "../../modules/ses-inbound"
  providers = {
    aws = aws.us_east_1
  }
  project_name    = var.project_name
  environment     = var.environment
  inbound_domain  = var.inbound_email_domain
  route53_zone_id = module.route53_acm.zone_id
  target_sqs_arn  = module.sqs.queue_arns["email-inbound"]
  target_sqs_url  = module.sqs.queue_urls["email-inbound"]
}

# --- AI/RAG (us-east-1) ---
module "opensearch_serverless" {
  source = "../../modules/opensearch-serverless"
  providers = {
    aws = aws.us_east_1
  }
  project_name = var.project_name
  environment  = var.environment
}

module "bedrock_kb" {
  source = "../../modules/bedrock-kb"
  providers = {
    aws = aws.us_east_1
  }
  project_name              = var.project_name
  environment               = var.environment
  opensearch_collection_arn = module.opensearch_serverless.collection_arn
}

# --- IAM ---
module "iam" {
  source       = "../../modules/iam"
  project_name = var.project_name
  environment  = var.environment
  region       = var.region

  sqs_queue_arns         = module.sqs.all_queue_arns
  secrets_arns           = [module.secrets.db_url_secret_arn, module.secrets.jwt_secret_arn]
  ecr_repository_arn     = module.ecr.repository_arn
  s3_bucket_arns         = values(module.s3.bucket_arns)
  kb_data_bucket_arn     = module.bedrock_kb.kb_data_bucket_arn
  opensearch_collection_arn = module.opensearch_serverless.collection_arn
  ses_domain_identity_arn   = module.ses.domain_identity_arn
}
