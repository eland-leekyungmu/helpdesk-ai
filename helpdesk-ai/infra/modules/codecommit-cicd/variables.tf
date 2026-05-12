variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "codecommit_repo_name" {
  description = "CodeCommit repository name"
  type        = string
  default     = "aidlc-ithelp"
}

variable "branch_name" {
  description = "Source branch for pipeline"
  type        = string
  default     = "main"
}

variable "artifact_bucket_id" {
  description = "S3 bucket for pipeline artifacts"
  type        = string
}

variable "cache_bucket_id" {
  description = "S3 bucket for CodeBuild cache"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL"
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "ecs_service_name" {
  description = "ECS service name"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for approval notifications"
  type        = string
}
