variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "sqs_queue_arns" {
  description = "All SQS queue ARNs (main + DLQ)"
  type        = list(string)
}

variable "secrets_arns" {
  description = "Secrets Manager secret ARNs"
  type        = list(string)
}

variable "ecr_repository_arn" {
  description = "ECR repository ARN"
  type        = string
}

variable "s3_bucket_arns" {
  description = "S3 bucket ARNs"
  type        = list(string)
}

variable "kb_data_bucket_arn" {
  description = "KB data S3 bucket ARN (us-east-1)"
  type        = string
}

variable "opensearch_collection_arn" {
  description = "OpenSearch Serverless collection ARN"
  type        = string
}

variable "ses_domain_identity_arn" {
  description = "SES domain identity ARN"
  type        = string
}
