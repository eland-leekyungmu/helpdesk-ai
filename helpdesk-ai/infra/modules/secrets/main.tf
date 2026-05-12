# =============================================================
# Secrets Manager
# =============================================================

# Database URL Secret
resource "aws_secretsmanager_secret" "db_url" {
  name        = "${var.project_name}/${var.environment}/db-url"
  description = "PostgreSQL connection string for helpdesk-ai"

  tags = {
    Name = "${var.project_name}-db-url-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = jsonencode({
    url = "postgresql://${var.db_username}:${var.db_password}@${var.db_endpoint}/${var.db_name}?sslmode=require"
  })
}

# JWT Secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}/${var.environment}/jwt-secret"
  description = "JWT signing secret for helpdesk-ai"

  tags = {
    Name = "${var.project_name}-jwt-secret-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}
