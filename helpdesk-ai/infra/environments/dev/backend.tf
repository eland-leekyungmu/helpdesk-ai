terraform {
  backend "s3" {
    bucket         = "helpdesk-ai-tfstate-dev-use1"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "helpdesk-ai-tfstate-lock"
    encrypt        = true
  }
}
