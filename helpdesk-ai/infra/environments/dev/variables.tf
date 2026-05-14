variable "project_name" {
  description = "Project name"
  type        = string
  default     = "helpdesk-ai"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "domain_name" {
  description = "Domain name"
  type        = string
  default     = "ai-dlc.innoplecloud.net"
}

variable "inbound_email_domain" {
  description = "Inbound email domain"
  type        = string
  default     = "help.ai-dlc.innoplecloud.net"
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
  default     = "10.0.0.0/16"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.small"
}

variable "ecs_cpu" {
  description = "ECS task CPU"
  type        = number
  default     = 1024
}

variable "ecs_memory" {
  description = "ECS task memory"
  type        = number
  default     = 2048
}

variable "ecs_desired_count" {
  description = "ECS desired task count"
  type        = number
  default     = 1
}
