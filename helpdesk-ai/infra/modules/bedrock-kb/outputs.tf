output "knowledge_base_id" {
  description = "Bedrock Knowledge Base ID"
  value       = aws_bedrockagent_knowledge_base.main.id
}

output "knowledge_base_arn" {
  description = "Bedrock Knowledge Base ARN"
  value       = aws_bedrockagent_knowledge_base.main.arn
}

output "data_source_id" {
  description = "KB data source ID"
  value       = aws_bedrockagent_data_source.s3.data_source_id
}

output "kb_data_bucket_arn" {
  description = "KB data S3 bucket ARN"
  value       = aws_s3_bucket.kb_data.arn
}

output "kb_data_bucket_id" {
  description = "KB data S3 bucket name"
  value       = aws_s3_bucket.kb_data.id
}

output "kb_role_arn" {
  description = "Bedrock KB IAM role ARN"
  value       = aws_iam_role.bedrock_kb.arn
}
