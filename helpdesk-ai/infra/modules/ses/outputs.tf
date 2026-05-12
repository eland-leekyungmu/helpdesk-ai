output "domain_identity_arn" {
  description = "SES domain identity ARN"
  value       = aws_ses_domain_identity.main.arn
}

output "domain_name" {
  description = "Verified domain name"
  value       = aws_ses_domain_identity.main.domain
}
