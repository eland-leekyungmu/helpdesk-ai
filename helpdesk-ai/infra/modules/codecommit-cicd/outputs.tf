output "infra_pipeline_name" {
  description = "Infrastructure pipeline name"
  value       = aws_codepipeline.infra.name
}

output "app_pipeline_name" {
  description = "Application pipeline name"
  value       = aws_codepipeline.app.name
}
