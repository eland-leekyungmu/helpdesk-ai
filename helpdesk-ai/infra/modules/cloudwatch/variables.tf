variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name for alarms"
  type        = string
}

variable "ecs_service_name" {
  description = "ECS service name for alarms"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS instance identifier"
  type        = string
  default     = ""
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for metrics"
  type        = string
  default     = ""
}

variable "dlq_names" {
  description = "DLQ queue names for alarms"
  type        = list(string)
  default     = []
}

variable "alert_email" {
  description = "Email for alarm notifications"
  type        = string
  default     = ""
}
