output "queue_arns" {
  description = "Map of queue name to ARN"
  value       = { for k, v in aws_sqs_queue.main : k => v.arn }
}

output "queue_urls" {
  description = "Map of queue name to URL"
  value       = { for k, v in aws_sqs_queue.main : k => v.url }
}

output "dlq_arns" {
  description = "Map of DLQ name to ARN"
  value       = { for k, v in aws_sqs_queue.dlq : k => v.arn }
}

output "all_queue_arns" {
  description = "All queue ARNs (main + DLQ) as a flat list"
  value       = concat(values(aws_sqs_queue.main)[*].arn, values(aws_sqs_queue.dlq)[*].arn)
}
