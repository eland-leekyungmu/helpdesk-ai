terraform {
  backend "s3" {
    bucket         = "helpdesk-ai-tfstate-dev"
    key            = "dev/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "helpdesk-ai-tfstate-lock"
    encrypt        = true
  }
}
