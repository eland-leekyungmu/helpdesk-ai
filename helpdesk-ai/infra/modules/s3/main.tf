locals {
  buckets = {
    alb-logs = {
      purpose   = "ALB access logs"
      lifecycle = true
    }
    codepipeline = {
      purpose   = "CodePipeline artifacts"
      lifecycle = false
    }
    codebuild-cache = {
      purpose   = "CodeBuild S3 cache"
      lifecycle = false
    }
  }
}

# =============================================================
# S3 Buckets (ap-northeast-2)
# =============================================================
resource "aws_s3_bucket" "main" {
  for_each = local.buckets

  bucket = "${var.project_name}-${each.key}-${var.environment}-use1"

  tags = {
    Name    = "${var.project_name}-${each.key}-${var.environment}-use1"
    Purpose = each.value.purpose
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  for_each = local.buckets

  bucket = aws_s3_bucket.main[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "main" {
  for_each = local.buckets

  bucket = aws_s3_bucket.main[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  for_each = { for k, v in local.buckets : k => v if v.lifecycle }

  bucket = aws_s3_bucket.main[each.key].id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }
  }
}

# =============================================================
# ALB Logs Bucket Policy (ELB service principal)
# us-east-1 ELB account ID: 127311923021
# =============================================================
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.main["alb-logs"].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::127311923021:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.main["alb-logs"].arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.main["alb-logs"].arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.main["alb-logs"].arn
      }
    ]
  })
}
