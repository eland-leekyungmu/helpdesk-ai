variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "opensearch_collection_arn" {
  description = "OpenSearch Serverless collection ARN"
  type        = string
}

variable "embedding_model_arn" {
  description = "Bedrock embedding model ARN"
  type        = string
  default     = "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
}
