output "cloudtrail_arn" {
  description = "CloudTrail ARN"
  value       = aws_cloudtrail.main.arn
}

output "flow_logs_log_group" {
  description = "VPC Flow Logs log group name"
  value       = aws_cloudwatch_log_group.flow_logs.name
}
