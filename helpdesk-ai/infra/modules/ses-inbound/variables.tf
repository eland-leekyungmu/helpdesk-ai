variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "inbound_domain" {
  description = "Domain for receiving emails (e.g., help.ai-dlc.innoplecloud.net)"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
}

variable "target_sqs_arn" {
  description = "SQS queue ARN in ap-northeast-2 to forward emails to"
  type        = string
}

variable "target_sqs_url" {
  description = "SQS queue URL in ap-northeast-2"
  type        = string
}
