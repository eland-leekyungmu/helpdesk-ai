# =============================================================
# Random Password for RDS Master
# =============================================================
resource "random_password" "master" {
  length  = 32
  special = false
}

# =============================================================
# DB Subnet Group
# =============================================================
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-${var.environment}"
  subnet_ids = concat(var.public_subnet_ids, var.private_subnet_ids)

  tags = {
    Name = "${var.project_name}-db-subnet-${var.environment}"
  }
}

# =============================================================
# Security Group
# =============================================================
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-${var.environment}-"
  vpc_id      = var.vpc_id
  description = "RDS PostgreSQL security group"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
    description     = "PostgreSQL from ECS"
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["58.226.27.226/32"]
    description = "PostgreSQL from office"
  }

  tags = {
    Name = "${var.project_name}-rds-sg-${var.environment}"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================
# Parameter Group (force SSL)
# =============================================================
resource "aws_db_parameter_group" "main" {
  name_prefix = "${var.project_name}-pg16-${var.environment}-"
  family      = "postgres16"
  description = "PostgreSQL 16 with forced SSL"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================
# RDS Instance
# =============================================================
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-rds-${var.environment}"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = "helpdesk_admin"
  password = random_password.master.result

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  skip_final_snapshot       = var.environment == "dev"
  final_snapshot_identifier = var.environment == "dev" ? null : "${var.project_name}-final-${var.environment}"
  deletion_protection       = var.environment != "dev"

  publicly_accessible = true

  tags = {
    Name = "${var.project_name}-rds-${var.environment}"
  }
}
