output "log_group_name" {
  description = "ECS log group name"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "log_group_arn" {
  description = "ECS log group ARN"
  value       = aws_cloudwatch_log_group.ecs.arn
}

output "sns_topic_arn" {
  description = "Alerts SNS topic ARN"
  value       = aws_sns_topic.alerts.arn
}
