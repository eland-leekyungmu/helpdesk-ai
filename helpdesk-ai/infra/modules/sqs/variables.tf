variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "queue_names" {
  description = "List of queue name suffixes"
  type        = list(string)
  default = [
    "email-inbound",
    "email-outbound",
    "llm-logging",
    "feedback-accumulate",
    "kb-reindex",
    "assignment-events"
  ]
}

variable "visibility_timeout_seconds" {
  description = "Default visibility timeout"
  type        = number
  default     = 30
}

variable "max_receive_count" {
  description = "Max receives before sending to DLQ"
  type        = number
  default     = 3
}
