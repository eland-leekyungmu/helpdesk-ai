terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      Unit        = "unit-5-infra"
      ManagedBy   = "terraform"
      Service     = "aidlc-ithelp"
    }
  }
}

# us-east-1 provider 제거 — 모든 리소스 서울 리전으로 통합 (2026-05-13)
