output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

output "app_url" {
  description = "Application URL"
  value       = "https://${var.domain_name}"
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = module.ecr.repository_url
}

output "route53_name_servers" {
  description = "Set these NS records at your domain registrar"
  value       = module.route53_acm.name_servers
}

output "knowledge_base_id" {
  description = "Bedrock Knowledge Base ID"
  value       = module.bedrock_kb.knowledge_base_id
}

output "opensearch_endpoint" {
  description = "OpenSearch Serverless endpoint"
  value       = module.opensearch_serverless.collection_endpoint
}

output "inbound_email_address" {
  description = "Send emails to this address for inbound processing"
  value       = "support@${var.inbound_email_domain}"
}
