# =============================================================
# SES Inbound (ap-northeast-2) - Email Receiving
# =============================================================

# S3 Bucket for raw email storage (us-east-1)
resource "aws_s3_bucket" "email_storage" {
  bucket = "${var.project_name}-emails-${var.environment}-use1"

  tags = {
    Name    = "${var.project_name}-emails-${var.environment}-use1"
    Purpose = "SES inbound email storage"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "email_storage" {
  bucket = aws_s3_bucket.email_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "email_storage" {
  bucket = aws_s3_bucket.email_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket policy to allow SES to write
resource "aws_s3_bucket_policy" "ses_write" {
  bucket = aws_s3_bucket.email_storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSESPuts"
        Effect    = "Allow"
        Principal = { Service = "ses.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.email_storage.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

# =============================================================
# Lambda - Email Forwarder (SES → SQS cross-region)
# =============================================================
data "archive_file" "email_forwarder" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "email_forwarder" {
  function_name = "${var.project_name}-email-forwarder-${var.environment}"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.email_forwarder.output_path
  source_code_hash = data.archive_file.email_forwarder.output_base64sha256

  environment {
    variables = {
      TARGET_SQS_URL    = var.target_sqs_url
      TARGET_SQS_REGION = "us-east-1"
      EMAIL_BUCKET      = aws_s3_bucket.email_storage.id
    }
  }

  tags = {
    Name = "${var.project_name}-email-forwarder-${var.environment}"
  }
}

# Lambda IAM Role
resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-email-forwarder-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "email-forwarder-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.email_storage.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = var.target_sqs_arn
      }
    ]
  })
}

# Allow SES to invoke Lambda
resource "aws_lambda_permission" "ses" {
  statement_id   = "AllowSESInvoke"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.email_forwarder.function_name
  principal      = "ses.amazonaws.com"
  source_account = data.aws_caller_identity.current.account_id
}

# =============================================================
# SES Receipt Rule Set
# =============================================================
resource "aws_ses_receipt_rule_set" "main" {
  rule_set_name = "${var.project_name}-inbound-${var.environment}"
}

resource "aws_ses_active_receipt_rule_set" "main" {
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
}

resource "aws_ses_receipt_rule" "store_and_forward" {
  name          = "store-and-forward"
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
  recipients    = [var.inbound_domain]
  enabled       = true
  scan_enabled  = true

  s3_action {
    bucket_name = aws_s3_bucket.email_storage.id
    position    = 1
  }

  lambda_action {
    function_arn    = aws_lambda_function.email_forwarder.arn
    invocation_type = "Event"
    position        = 2
  }
}

# =============================================================
# DNS - MX Record for inbound domain
# =============================================================
resource "aws_route53_record" "mx" {
  zone_id = var.route53_zone_id
  name    = var.inbound_domain
  type    = "MX"
  ttl     = 600
  records = ["10 inbound-smtp.us-east-1.amazonaws.com"]
}
