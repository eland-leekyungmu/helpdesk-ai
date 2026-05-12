output "bucket_arns" {
  description = "Map of bucket key to ARN"
  value       = { for k, v in aws_s3_bucket.main : k => v.arn }
}

output "bucket_ids" {
  description = "Map of bucket key to bucket name"
  value       = { for k, v in aws_s3_bucket.main : k => v.id }
}

output "alb_logs_bucket_id" {
  description = "ALB logs bucket name"
  value       = aws_s3_bucket.main["alb-logs"].id
}

output "codepipeline_bucket_id" {
  description = "CodePipeline artifacts bucket name"
  value       = aws_s3_bucket.main["codepipeline"].id
}

output "codebuild_cache_bucket_id" {
  description = "CodeBuild cache bucket name"
  value       = aws_s3_bucket.main["codebuild-cache"].id
}
