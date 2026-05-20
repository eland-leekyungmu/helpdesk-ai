# =============================================================
# Dead Letter Queues
# =============================================================
resource "aws_sqs_queue" "dlq" {
  for_each = toset(var.queue_names)

  name                      = "${var.project_name}-${each.value}-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Name = "${var.project_name}-${each.value}-dlq-${var.environment}"
  }
}

# =============================================================
# Main Queues
# =============================================================
resource "aws_sqs_queue" "main" {
  for_each = toset(var.queue_names)

  name                       = "${var.project_name}-${each.value}-${var.environment}"
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = 345600 # 4 days
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.value].arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = {
    Name = "${var.project_name}-${each.value}-${var.environment}"
  }
}
