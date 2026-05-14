output "db_url_secret_arn" {
  description = "DB URL secret ARN"
  value       = aws_secretsmanager_secret.db_url.arn
}

output "jwt_secret_arn" {
  description = "JWT secret ARN"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}
