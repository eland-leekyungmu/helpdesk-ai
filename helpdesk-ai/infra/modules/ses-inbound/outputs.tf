output "email_bucket_arn" {
  description = "S3 bucket ARN for email storage"
  value       = aws_s3_bucket.email_storage.arn
}

output "lambda_function_arn" {
  description = "Email forwarder Lambda ARN"
  value       = aws_lambda_function.email_forwarder.arn
}

output "inbound_domain" {
  description = "Inbound email domain"
  value       = var.inbound_domain
}
