variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "collection_name" {
  description = "OpenSearch Serverless collection name"
  type        = string
  default     = "helpdesk-ai-vectors"
}
